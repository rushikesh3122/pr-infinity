import * as Crypto from 'expo-crypto';
import { z } from 'zod';
import { store } from './db';
import { DEFAULT_LOGO, DEFAULT_SIGNATURE } from './defaultImages';
import { calculateInvoice } from '../features/invoices/calculator';
import type {
  AppSettings,
  CompanyDetails,
  DashboardData,
  Invoice,
  Lead,
  LeadStatus,
  Paginated,
  PaymentStatus,
  Party,
  SortOrder,
  TaxType,
} from '../types/models';

/**
 * Offline data layer. Same functions and return shapes as the REST API it replaces
 * (see backend/), so the screens don't know or care where data lives. All business rules
 * from the spec are enforced here:
 *  - new leads are always Pending
 *  - only Deal Done leads can be invoiced; a lead can have many invoices
 *  - invoice numbers are unique, sequential per financial year, never reused
 *  - invoices store a snapshot of customer + company details (editing a lead never changes them)
 *  - a repeated "generate" with the same request id returns the same invoice (no duplicates)
 */

const C = { leads: 'leads', invoices: 'invoices', settings: 'settings', counters: 'counters', assets: 'assets', meta: 'meta' } as const;

export class AppError extends Error {}

const now = () => new Date().toISOString();
const newId = () => Crypto.randomUUID();
const normalizeMobile = (v: string) => v.replace(/[\s()-]/g, '').slice(-10);
const MOBILE_RX = /^(?:\+?91|0)?[6-9]\d{9}$/;

/** Serialises writes that must not interleave (invoice numbering). */
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new AppError(r.error.issues[0]?.message ?? 'Invalid input');
  return r.data;
}

function paginate<T>(items: T[], page = 1, limit = 20): Paginated<T> {
  const start = (page - 1) * limit;
  return { items: items.slice(start, start + limit), total: items.length, page, limit, hasMore: start + limit < items.length };
}

const byDate = <T,>(get: (x: T) => string, sort: SortOrder = 'newest') => (a: T, b: T) =>
  sort === 'oldest' ? get(a).localeCompare(get(b)) : get(b).localeCompare(get(a));

// ───────────────────────────── settings ─────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
  _id: 'default',
  company: {
    name: 'PR INFINITY SOLUTIONS',
    subtitle: 'Laptop & IT Solutions',
    tagline: 'Powerful Laptops, Honest Prices.',
    address: '14/06, Hanuman Mandir Rd, NL - 4 Type, Sector 11, Nerul, "Inventory Storage Location", Navi Mumbai, Maharashtra 400706',
    mobile: '8104879377',
    email: 'sales@prinfinitytech.com',
    website: 'prinfinitytech.com',
    gstin: '27EPXPK0265K1Z7',
    udyamNumber: 'UDYAM-MH-33-0644834',
    logo: DEFAULT_LOGO,
    signature: DEFAULT_SIGNATURE,
    bank: { accountName: 'PR Infinity Solutions', ifscCode: 'SBIN0011785', accountNumber: '45421910961', bankName: 'State Bank of India, NERUL EAST' },
    terms: [
      'Manufacturer warranty as per brand policy and invoice.',
      'Physical/liquid damage, misuse and unauthorized repairs are not covered.',
      'Original invoice is mandatory for warranty claims.',
      'Warranty claims must be raised with the manufacturer or authorized service centre, as applicable.',
      'Products are non-refundable and non-returnable, except where required under applicable law',
    ],
  },
  invoice: { prefix: 'PRI', startNumber: 1, defaultGstRate: 0, defaultTaxType: 'CGST_SGST', defaultWarranty: '3 months' },
  updatedAt: new Date(0).toISOString(),
};

async function getSettings(): Promise<AppSettings> {
  const s = await store.get<AppSettings>(C.settings, 'default');
  if (s) return { ...DEFAULT_SETTINGS, ...s, company: { ...DEFAULT_SETTINGS.company, ...s.company }, invoice: { ...DEFAULT_SETTINGS.invoice, ...s.invoice } };
  return store.put(C.settings, 'default', { ...DEFAULT_SETTINGS, updatedAt: now() });
}

export type SettingsInput = {
  company?: Partial<Omit<CompanyDetails, 'bank'>> & { bank?: Partial<CompanyDetails['bank']> };
  invoice?: Partial<AppSettings['invoice']>;
};

const settingsSchema = z.object({
  company: z
    .object({
      email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]).optional(),
      gstin: z.union([z.literal(''), z.string().trim().toUpperCase().regex(/^[0-9A-Z]{15}$/, 'GSTIN must be 15 characters')]).optional(),
      terms: z.array(z.string().trim().min(1).max(300)).max(15).optional(),
    })
    .passthrough()
    .optional(),
  invoice: z
    .object({
      prefix: z.string().trim().min(1).max(12).regex(/^[A-Za-z0-9-]+$/, 'Prefix: use letters, numbers or -').optional(),
      startNumber: z.number().int().min(1).max(999_999).optional(),
      defaultGstRate: z.number().min(0).max(28).optional(),
    })
    .passthrough()
    .optional(),
});

async function updateSettings(input: SettingsInput): Promise<AppSettings> {
  parse(settingsSchema, input);
  const current = await getSettings();
  const next: AppSettings = {
    ...current,
    company: { ...current.company, ...input.company, bank: { ...current.company.bank, ...input.company?.bank } } as CompanyDetails,
    invoice: { ...current.invoice, ...input.invoice },
    updatedAt: now(),
  };
  return store.put(C.settings, 'default', next);
}

// ───────────────────────────── images ─────────────────────────────
// Logo/signature are stored once and referenced from invoices, so 1,000 invoices don't hold 1,000 copies.

async function hashOf(data: string) {
  return (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data)).slice(0, 24);
}
async function saveAsset(dataUri: string): Promise<string> {
  if (!dataUri.startsWith('data:')) return dataUri;
  const id = await hashOf(dataUri);
  if (!(await store.get(C.assets, id))) await store.put(C.assets, id, { id, dataUri });
  return `asset:${id}`;
}
async function loadAsset(ref: string): Promise<string> {
  if (!ref.startsWith('asset:')) return ref;
  return (await store.get<{ dataUri: string }>(C.assets, ref.slice(6)))?.dataUri ?? '';
}

// ───────────────────────────── leads ─────────────────────────────

export interface LeadInput {
  customerName: string;
  mobileNumber: string;
  address: string;
  email?: string;
  description?: string;
  leadDate?: string;
}

const leadSchema = z.object({
  customerName: z.string().trim().min(2, 'Customer name is required').max(120),
  mobileNumber: z.string().trim().refine((v) => MOBILE_RX.test(v.replace(/[\s()-]/g, '')), 'Enter a valid 10-digit mobile number'),
  address: z.string().trim().min(3, 'Address is required').max(500),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email('Enter a valid email address')]).optional(),
  description: z.string().trim().max(2000).optional(),
  leadDate: z.string().optional(),
});

export interface LeadQuery {
  search?: string;
  status?: LeadStatus;
  sort?: SortOrder;
  page?: number;
  limit?: number;
}

async function invoicesFor(leadId: string) {
  return (await store.all<Invoice>(C.invoices)).filter((i) => i.leadId === leadId);
}

export const leadsApi = {
  async list(q: LeadQuery): Promise<Paginated<Lead>> {
    let leads = await store.all<Lead>(C.leads);
    if (q.status) leads = leads.filter((l) => l.status === q.status);
    if (q.search) {
      const s = q.search.toLowerCase();
      leads = leads.filter((l) => l.customerName.toLowerCase().includes(s) || l.mobileNumber.includes(s.replace(/\s/g, '')));
    }
    leads.sort(byDate((l) => l.leadDate + l.createdAt, q.sort));
    return paginate(leads, q.page, q.limit);
  },
  async get(id: string): Promise<Lead> {
    const lead = await store.get<Lead>(C.leads, id);
    if (!lead) throw new AppError('Lead not found');
    return lead;
  },
  async create(input: LeadInput): Promise<Lead> {
    const v = parse(leadSchema, input);
    const ts = now();
    const lead: Lead = {
      _id: newId(),
      customerName: v.customerName,
      mobileNumber: normalizeMobile(v.mobileNumber),
      address: v.address,
      email: v.email ?? '',
      description: v.description ?? '',
      status: 'Pending', // rule 1: always Pending
      leadDate: v.leadDate ?? ts,
      dealCompletedAt: null,
      invoiceCount: 0,
      createdAt: ts,
      updatedAt: ts,
    };
    return store.put(C.leads, lead._id, lead);
  },
  async update(id: string, input: Partial<LeadInput>): Promise<Lead> {
    const v = parse(leadSchema.partial(), input);
    const lead = await leadsApi.get(id);
    const next: Lead = {
      ...lead,
      ...Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined)),
      ...(v.mobileNumber ? { mobileNumber: normalizeMobile(v.mobileNumber) } : {}),
      updatedAt: now(),
    };
    return store.put(C.leads, id, next);
  },
  async setStatus(id: string, status: LeadStatus): Promise<Lead> {
    const lead = await leadsApi.get(id);
    if (lead.status === status) return lead;
    if (status === 'Pending' && (await invoicesFor(id)).length > 0) {
      throw new AppError('This lead already has invoices, so it cannot be moved back to Pending.');
    }
    return store.put(C.leads, id, { ...lead, status, dealCompletedAt: status === 'Deal Done' ? now() : null, updatedAt: now() });
  },
  async remove(id: string): Promise<{ id: string; invoicesKept: number }> {
    await leadsApi.get(id);
    await store.remove(C.leads, id);
    // Invoices are business records and are kept; they carry their own customer snapshot.
    return { id, invoicesKept: (await invoicesFor(id)).length };
  },
};

// ───────────────────────────── invoices ─────────────────────────────

export interface InvoiceInput {
  leadId: string;
  clientRequestId: string;
  invoiceDate: string;
  customerDetails: Party;
  shipTo: Party;
  items: { name: string; description: string; warranty: string; quantity: number; rate: number }[];
  discount: number;
  gstRate: number;
  taxType: TaxType;
  paymentStatus: PaymentStatus;
  notes?: string;
}

export interface InvoiceQuery {
  search?: string;
  leadId?: string;
  paymentStatus?: PaymentStatus;
  sort?: SortOrder;
  page?: number;
  limit?: number;
}

const partySchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  mobileNumber: z.string().trim().refine((v) => MOBILE_RX.test(v.replace(/[\s()-]/g, '')), 'Enter a valid 10-digit mobile number'),
  address: z.string().trim().min(3, 'Address is required'),
  email: z.string().optional(),
});
const invoiceSchema = z.object({
  leadId: z.string().min(1),
  clientRequestId: z.string().min(8),
  invoiceDate: z.string(),
  customerDetails: partySchema,
  shipTo: partySchema,
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Item name is required'),
        description: z.string(),
        warranty: z.string(),
        quantity: z.number().positive('Quantity must be more than 0'),
        rate: z.number().min(0, 'Rate must be 0 or more'),
      }),
    )
    .min(1, 'Add at least one item'),
  discount: z.number().min(0),
  gstRate: z.number().min(0).max(28),
  taxType: z.enum(['CGST_SGST', 'IGST']),
  paymentStatus: z.enum(['Unpaid', 'Partially Paid', 'Paid']),
  notes: z.string().optional(),
});

/** Indian financial year, e.g. "2026-27". */
function financialYear(d: Date) {
  const start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}
const counterKey = (prefix: string, date: Date) => `invoice:${prefix}:${financialYear(date)}`;
const formatNumber = (prefix: string, date: Date, seq: number) => `${prefix}/${financialYear(date)}/${String(seq).padStart(4, '0')}`;

async function nextSeq(prefix: string, start: number, date: Date, reserve: boolean) {
  const key = counterKey(prefix, date);
  const counter = await store.get<{ seq: number }>(C.counters, key);
  const seq = Math.max(counter?.seq ?? 0, start - 1) + 1;
  if (reserve) await store.put(C.counters, key, { seq });
  return seq;
}

async function resolveImages(inv: Invoice): Promise<Invoice> {
  return { ...inv, company: { ...inv.company, logo: await loadAsset(inv.company.logo), signature: await loadAsset(inv.company.signature) } };
}

export const invoicesApi = {
  async list(q: InvoiceQuery): Promise<Paginated<Invoice>> {
    let list = await store.all<Invoice>(C.invoices);
    if (q.leadId) list = list.filter((i) => i.leadId === q.leadId);
    if (q.paymentStatus) list = list.filter((i) => i.paymentStatus === q.paymentStatus);
    if (q.search) {
      const s = q.search.toLowerCase();
      list = list.filter(
        (i) => i.invoiceNumber.toLowerCase().includes(s) || i.customerDetails.name.toLowerCase().includes(s) || i.customerDetails.mobileNumber.includes(s),
      );
    }
    list.sort(byDate((i) => i.createdAt, q.sort));
    return paginate(list, q.page, q.limit);
  },
  async get(id: string): Promise<Invoice> {
    const inv = await store.get<Invoice>(C.invoices, id);
    if (!inv) throw new AppError('Invoice not found');
    return resolveImages(inv);
  },
  async nextNumber(): Promise<{ invoiceNumber: string }> {
    const s = await getSettings();
    const d = new Date();
    return { invoiceNumber: formatNumber(s.invoice.prefix, d, await nextSeq(s.invoice.prefix, s.invoice.startNumber, d, false)) };
  },
  create(input: InvoiceInput): Promise<Invoice> {
    return exclusive(async () => {
      const v = parse(invoiceSchema, input);
      // Idempotency: a double tap / retry with the same request id returns the original invoice.
      const existing = (await store.all<Invoice & { clientRequestId?: string }>(C.invoices)).find((i) => i.clientRequestId === v.clientRequestId);
      if (existing) return resolveImages(existing);

      const lead = await leadsApi.get(v.leadId);
      if (lead.status !== 'Deal Done') throw new AppError('Invoices can only be generated for leads marked as Deal Done.');

      const totals = calculateInvoice(v.items, v.discount, v.gstRate, v.taxType);
      if (totals.discountExceedsSubtotal) throw new AppError('Discount cannot be more than the subtotal');

      const settings = await getSettings();
      const date = new Date(v.invoiceDate);
      const seq = await nextSeq(settings.invoice.prefix, settings.invoice.startNumber, date, true);
      const ts = now();
      const { discountExceedsSubtotal: _x, ...stored } = totals;
      const invoice: Invoice & { clientRequestId: string } = {
        _id: newId(),
        invoiceNumber: formatNumber(settings.invoice.prefix, date, seq),
        leadId: lead._id,
        customerDetails: { ...v.customerDetails, mobileNumber: normalizeMobile(v.customerDetails.mobileNumber), email: v.customerDetails.email ?? '' },
        shipTo: { ...v.shipTo, mobileNumber: normalizeMobile(v.shipTo.mobileNumber), email: v.shipTo.email ?? '' },
        invoiceDate: date.toISOString(),
        ...stored,
        paymentStatus: v.paymentStatus,
        notes: v.notes ?? '',
        company: {
          ...settings.company,
          logo: await saveAsset(settings.company.logo),
          signature: await saveAsset(settings.company.signature),
        },
        pdfUrl: null,
        clientRequestId: v.clientRequestId,
        createdAt: ts,
        updatedAt: ts,
      };
      await store.put(C.invoices, invoice._id, invoice);
      await store.put(C.leads, lead._id, { ...lead, invoiceCount: (lead.invoiceCount ?? 0) + 1, updatedAt: ts });
      return resolveImages(invoice);
    });
  },
  async setPaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<Invoice> {
    const inv = await store.get<Invoice>(C.invoices, id);
    if (!inv) throw new AppError('Invoice not found');
    // Only payment status changes after issue; billing details stay frozen.
    await store.put(C.invoices, id, { ...inv, paymentStatus, updatedAt: now() });
    return invoicesApi.get(id);
  },
};

// ───────────────────────────── dashboard ─────────────────────────────

export const dashboardApi = {
  async get(): Promise<DashboardData> {
    const [leads, invoices] = await Promise.all([store.all<Lead>(C.leads), store.all<Invoice>(C.invoices)]);
    const round = (n: number) => Math.round(n * 100) / 100;
    return {
      stats: {
        totalLeads: leads.length,
        pendingLeads: leads.filter((l) => l.status === 'Pending').length,
        dealsDone: leads.filter((l) => l.status === 'Deal Done').length,
        totalInvoices: invoices.length,
        totalInvoiced: round(invoices.reduce((s, i) => s + i.grandTotal, 0)),
        totalPaid: round(invoices.filter((i) => i.paymentStatus === 'Paid').reduce((s, i) => s + i.grandTotal, 0)),
      },
      recentLeads: [...leads].sort(byDate((l) => l.createdAt)).slice(0, 5),
      recentDeals: leads.filter((l) => l.status === 'Deal Done').sort(byDate((l) => l.dealCompletedAt ?? '')).slice(0, 5),
      recentInvoices: [...invoices].sort(byDate((i) => i.createdAt)).slice(0, 5),
    };
  },
};

export const settingsApi = { get: getSettings, update: updateSettings };

// ───────────────────────────── backup ─────────────────────────────

const BACKUP_APP = 'pr-infinity';

export async function exportBackup(): Promise<string> {
  const rows = await store.dump();
  return JSON.stringify({ app: BACKUP_APP, version: 1, exportedAt: now(), rows });
}

export async function importBackup(json: string): Promise<{ leads: number; invoices: number }> {
  let parsed: { app?: string; rows?: { collection: string; id: string; data: string }[] };
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new AppError('This file is not a PR Infinity backup.');
  }
  if (parsed.app !== BACKUP_APP || !Array.isArray(parsed.rows)) throw new AppError('This file is not a PR Infinity backup.');
  await store.replaceAll(parsed.rows);
  return {
    leads: parsed.rows.filter((r) => r.collection === C.leads).length,
    invoices: parsed.rows.filter((r) => r.collection === C.invoices).length,
  };
}
