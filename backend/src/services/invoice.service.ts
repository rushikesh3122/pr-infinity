import fs from 'node:fs/promises';
import path from 'node:path';
import type { QueryFilter } from 'mongoose';
import { InvoiceModel, type Invoice, type PaymentStatus } from '../models/Invoice.js';
import { LeadModel } from '../models/Lead.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import type { CreateInvoiceInput, ListInvoicesQuery } from '../validators/invoice.validator.js';
import { calculateInvoice } from './invoiceCalculator.js';
import { nextInvoiceNumber, peekInvoiceNumber } from './invoiceNumber.service.js';
import { getSettings } from './settings.service.js';
import { env } from '../config/env.js';

const isDuplicateKey = (err: unknown, field: string) =>
  typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000 &&
  JSON.stringify((err as { keyPattern?: unknown }).keyPattern ?? {}).includes(field);

export async function createInvoice(input: CreateInvoiceInput, userId?: string) {
  // Idempotency: a repeated tap or network retry with the same key returns the original invoice.
  if (input.clientRequestId) {
    const existing = await InvoiceModel.findOne({ clientRequestId: input.clientRequestId });
    if (existing) return { invoice: existing, created: false };
  }

  const lead = await LeadModel.findById(input.leadId);
  if (!lead) throw ApiError.notFound('Lead not found');
  if (lead.status !== 'Deal Done') {
    throw ApiError.badRequest('Invoices can only be generated for leads marked as Deal Done.');
  }

  const settings = await getSettings();
  const gstRate = input.gstRate ?? settings.invoice?.defaultGstRate ?? 0;
  const taxType = input.taxType ?? settings.invoice?.defaultTaxType ?? 'CGST_SGST';
  const totals = calculateInvoice(input.items, input.discount, gstRate, taxType);

  const customerDetails = input.customerDetails ?? {
    name: lead.customerName,
    mobileNumber: lead.mobileNumber,
    address: lead.address,
    email: lead.email ?? '',
  };
  const invoiceDate = input.invoiceDate ?? new Date();
  const prefix = settings.invoice?.prefix ?? 'INV';
  const startNumber = settings.invoice?.startNumber ?? 1;

  // A number collision can only happen if someone manually lowered the counter; retry a few times.
  for (let attempt = 0; attempt < 5; attempt++) {
    const invoiceNumber = await nextInvoiceNumber(prefix, startNumber, invoiceDate);
    try {
      const invoice = await InvoiceModel.create({
        invoiceNumber,
        leadId: lead._id,
        customerDetails,
        shipTo: input.shipTo ?? customerDetails,
        invoiceDate,
        ...totals,
        paymentStatus: input.paymentStatus,
        notes: input.notes,
        company: settings.toObject().company,
        clientRequestId: input.clientRequestId,
        createdBy: userId,
      });
      await LeadModel.updateOne({ _id: lead._id }, { $inc: { invoiceCount: 1 } });
      return { invoice, created: true };
    } catch (err) {
      if (input.clientRequestId && isDuplicateKey(err, 'clientRequestId')) {
        const existing = await InvoiceModel.findOne({ clientRequestId: input.clientRequestId }).orFail();
        return { invoice: existing, created: false };
      }
      if (isDuplicateKey(err, 'invoiceNumber')) continue;
      throw err;
    }
  }
  throw ApiError.conflict('Could not allocate a unique invoice number. Please try again.');
}

export async function listInvoices(query: ListInvoicesQuery) {
  const filter: QueryFilter<Invoice> = {};
  if (query.leadId) filter.leadId = query.leadId;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ invoiceNumber: rx }, { 'customerDetails.name': rx }, { 'customerDetails.mobileNumber': rx }];
  }
  const sortDir = query.sort === 'oldest' ? 1 : -1;
  const [items, total] = await Promise.all([
    InvoiceModel.find(filter)
      // The list does not need the embedded logo/signature images.
      .select('-company.logo -company.signature')
      .sort({ createdAt: sortDir, _id: sortDir })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    InvoiceModel.countDocuments(filter),
  ]);
  return { items, total, page: query.page, limit: query.limit, hasMore: query.page * query.limit < total };
}

export async function getInvoice(id: string) {
  const invoice = await InvoiceModel.findById(id);
  if (!invoice) throw ApiError.notFound('Invoice not found');
  return invoice;
}

export async function updatePaymentStatus(id: string, paymentStatus: PaymentStatus) {
  // Only the payment status may change after issue; billing details stay frozen.
  const invoice = await InvoiceModel.findByIdAndUpdate(id, { $set: { paymentStatus } }, { returnDocument: 'after' });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  return invoice;
}

export const pdfFilePath = (id: string) => path.resolve(env.UPLOAD_DIR, 'invoices', `${id}.pdf`);

export async function attachPdf(id: string) {
  const invoice = await InvoiceModel.findByIdAndUpdate(
    id,
    { $set: { pdfUrl: `/api/invoices/${id}/pdf` } },
    { returnDocument: 'after' },
  );
  if (!invoice) {
    await fs.rm(pdfFilePath(id), { force: true });
    throw ApiError.notFound('Invoice not found');
  }
  return invoice;
}

export async function nextNumberPreview() {
  const settings = await getSettings();
  return peekInvoiceNumber(settings.invoice?.prefix ?? 'INV', settings.invoice?.startNumber ?? 1, new Date());
}
