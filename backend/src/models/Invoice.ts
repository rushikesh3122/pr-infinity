import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { TAX_TYPES, companySchema } from './Settings.js';

export const PAYMENT_STATUSES = ['Unpaid', 'Partially Paid', 'Paid'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const partySchema = new Schema(
  {
    name: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    address: { type: String, required: true },
    email: { type: String, default: '' },
  },
  { _id: false },
);

const itemSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    warranty: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const taxSchema = new Schema(
  {
    taxType: { type: String, enum: TAX_TYPES, default: 'CGST_SGST' },
    gstRate: { type: Number, default: 0 },
    taxableValue: { type: Number, default: 0 },
    cgstRate: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstRate: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstRate: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
  },
  { _id: false },
);

/**
 * An invoice is a frozen snapshot: customer, company and billing details are copied in at
 * creation time so that later edits to the lead or settings never change an issued invoice.
 */
const invoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    leadId: { type: Types.ObjectId, ref: 'Lead', required: true, index: true },
    customerDetails: { type: partySchema, required: true },
    shipTo: { type: partySchema, required: true },
    invoiceDate: { type: Date, required: true },
    items: { type: [itemSchema], required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    taxDetails: { type: taxSchema, required: true },
    grandTotal: { type: Number, required: true },
    amountInWords: { type: String, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'Unpaid', index: true },
    notes: { type: String, default: '' },
    company: { type: companySchema, required: true },
    pdfUrl: { type: String, default: null },
    /** Client-generated key that makes "create invoice" safe to retry or double-tap. */
    clientRequestId: { type: String, unique: true, sparse: true },
    createdBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ 'customerDetails.name': 1 });

invoiceSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.__v;
    delete ret.pdfPath;
    return ret;
  },
});

export type Invoice = InferSchemaType<typeof invoiceSchema>;
export type InvoiceDocument = HydratedDocument<Invoice>;
export const InvoiceModel = model('Invoice', invoiceSchema);
