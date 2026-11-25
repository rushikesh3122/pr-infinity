import { z } from 'zod';

const numberString = (label: string, { allowZero = true } = {}) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), `${label} must be a number (max 2 decimals)`)
    .refine((v) => allowZero || Number(v) > 0, `${label} must be more than 0`);

const mobile = z
  .string()
  .trim()
  .refine((v) => /^(?:\+?91|0)?[6-9]\d{9}$/.test(v.replace(/[\s()-]/g, '')), 'Enter a valid 10-digit mobile number');

export const partyFormSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  mobileNumber: mobile,
  address: z.string().trim().min(3, 'Address is required'),
});

export const invoiceItemFormSchema = z.object({
  name: z.string().trim().min(1, 'Item name is required'),
  description: z.string(),
  warranty: z.string(),
  quantity: numberString('Qty', { allowZero: false }),
  rate: numberString('Rate'),
});

export const invoiceFormSchema = z.object({
  billTo: partyFormSchema,
  sameShipTo: z.boolean(),
  shipTo: partyFormSchema.optional(),
  items: z.array(invoiceItemFormSchema).min(1, 'Add at least one item'),
  discount: z.string().trim().refine((v) => v === '' || /^\d+(\.\d{1,2})?$/.test(v), 'Discount must be a number'),
  gstRate: z.string().trim().refine((v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 28, 'GST must be between 0 and 28%'),
  notes: z.string(),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
export type InvoiceItemFormValues = z.infer<typeof invoiceItemFormSchema>;
