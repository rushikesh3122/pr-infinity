import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const LEAD_STATUSES = ['Pending', 'Deal Done'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

const leadSchema = new Schema(
  {
    customerName: { type: String, required: true, trim: true, maxlength: 120 },
    mobileNumber: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    email: { type: String, trim: true, lowercase: true, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    status: { type: String, enum: LEAD_STATUSES, default: 'Pending', index: true },
    leadDate: { type: Date, default: () => new Date() },
    dealCompletedAt: { type: Date, default: null },
    invoiceCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

leadSchema.index({ createdAt: -1 });
leadSchema.index({ customerName: 'text', mobileNumber: 'text' });
leadSchema.index({ dealCompletedAt: -1 });

leadSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.__v;
    return ret;
  },
});

export type Lead = InferSchemaType<typeof leadSchema>;
export type LeadDocument = HydratedDocument<Lead>;
export const LeadModel = model('Lead', leadSchema);
