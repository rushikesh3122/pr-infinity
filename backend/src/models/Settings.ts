import { Schema, model, type InferSchemaType } from 'mongoose';

export const TAX_TYPES = ['CGST_SGST', 'IGST'] as const;
export type TaxType = (typeof TAX_TYPES)[number];

const bankSchema = new Schema(
  {
    accountName: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    bankName: { type: String, default: '' },
  },
  { _id: false },
);

export const companySchema = new Schema(
  {
    name: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    tagline: { type: String, default: '' },
    address: { type: String, default: '' },
    mobile: { type: String, default: '' },
    email: { type: String, default: '' },
    website: { type: String, default: '' },
    gstin: { type: String, default: '' },
    udyamNumber: { type: String, default: '' },
    logo: { type: String, default: '' },
    signature: { type: String, default: '' },
    bank: { type: bankSchema, default: () => ({}) },
    terms: { type: [String], default: [] },
  },
  { _id: false },
);

const settingsSchema = new Schema(
  {
    key: { type: String, default: 'default', unique: true },
    company: { type: companySchema, default: () => ({}) },
    invoice: {
      prefix: { type: String, default: 'INV' },
      startNumber: { type: Number, default: 1 },
      defaultGstRate: { type: Number, default: 0 },
      defaultTaxType: { type: String, enum: TAX_TYPES, default: 'CGST_SGST' },
      defaultWarranty: { type: String, default: '' },
    },
  },
  { timestamps: true },
);

settingsSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.__v;
    delete ret.key;
    return ret;
  },
});

export type Settings = InferSchemaType<typeof settingsSchema>;
export const SettingsModel = model('Settings', settingsSchema);
