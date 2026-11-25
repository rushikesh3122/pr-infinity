import { z } from 'zod';
import { PAYMENT_STATUSES } from '../models/Invoice.js';
import { TAX_TYPES } from '../models/Settings.js';
import { mobileNumber, objectId, optionalEmail, pagination } from './common.js';

const money = z.coerce.number().min(0, 'Must be 0 or more').max(1_000_000_000);

export const invoiceItemSchema = z.object({
  name: z.string().trim().min(1, 'Item name is required').max(200),
  description: z.string().trim().max(1000).optional().default(''),
  warranty: z.string().trim().max(60).optional().default(''),
  quantity: z.coerce.number().positive('Quantity must be more than 0').max(100_000),
  rate: money,
});

const partySchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(120),
  mobileNumber,
  address: z.string().trim().min(3, 'Address is required').max(500),
  email: optionalEmail,
});

export const createInvoiceSchema = z.object({
  leadId: objectId,
  clientRequestId: z.string().trim().min(8).max(100).optional(),
  invoiceDate: z.coerce.date().optional(),
  /** Overrides for bill-to; defaults to the lead's details. */
  customerDetails: partySchema.optional(),
  /** Defaults to the bill-to details. */
  shipTo: partySchema.optional(),
  items: z.array(invoiceItemSchema).min(1, 'Add at least one item').max(50),
  discount: money.optional().default(0),
  gstRate: z.coerce.number().min(0).max(28).optional(),
  taxType: z.enum(TAX_TYPES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional().default('Unpaid'),
  notes: z.string().trim().max(1000).optional().default(''),
});

export const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(PAYMENT_STATUSES),
});

export const listInvoicesQuery = z.object({
  search: z.string().trim().optional(),
  leadId: objectId.optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
  ...pagination,
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuery>;
