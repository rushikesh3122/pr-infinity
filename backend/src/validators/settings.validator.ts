import { z } from 'zod';
import { TAX_TYPES } from '../models/Settings.js';

const text = (max = 300) => z.string().trim().max(max).optional();
// Logo and signature are stored as data URIs so the PDF can be rendered offline on the phone.
const image = z
  .union([z.literal(''), z.string().regex(/^data:image\/(png|jpe?g|webp);base64,/, 'Image must be PNG, JPG or WEBP')])
  .optional()
  .refine((v) => !v || v.length <= 1_500_000, 'Image is too large; please use one under 1 MB');

export const updateSettingsSchema = z.object({
  company: z
    .object({
      name: text(120),
      subtitle: text(120),
      tagline: text(160),
      address: text(500),
      mobile: text(40),
      email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]).optional(),
      website: text(120),
      gstin: z
        .union([z.literal(''), z.string().trim().toUpperCase().regex(/^[0-9A-Z]{15}$/, 'GSTIN must be 15 characters')])
        .optional(),
      udyamNumber: text(60),
      logo: image,
      signature: image,
      bank: z
        .object({ accountName: text(120), ifscCode: text(20), accountNumber: text(40), bankName: text(160) })
        .optional(),
      terms: z.array(z.string().trim().min(1).max(300)).max(15).optional(),
    })
    .optional(),
  invoice: z
    .object({
      prefix: z.string().trim().min(1).max(12).regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers or -').optional(),
      startNumber: z.coerce.number().int().min(1).max(999_999).optional(),
      defaultGstRate: z.coerce.number().min(0).max(28).optional(),
      defaultTaxType: z.enum(TAX_TYPES).optional(),
      defaultWarranty: text(60),
    })
    .optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
