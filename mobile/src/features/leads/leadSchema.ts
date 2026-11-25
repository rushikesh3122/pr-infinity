import { z } from 'zod';

/** Same rules as the backend validator, so users see errors before submitting. */
export const leadFormSchema = z.object({
  customerName: z.string().trim().min(2, 'Customer name is required'),
  mobileNumber: z
    .string()
    .trim()
    .min(1, 'Mobile number is required')
    .refine((v) => /^(?:\+?91|0)?[6-9]\d{9}$/.test(v.replace(/[\s()-]/g, '')), 'Enter a valid 10-digit mobile number'),
  address: z.string().trim().min(3, 'Address is required'),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address')]),
  description: z.string().trim().max(2000, 'Keep notes under 2000 characters'),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

export const emptyLead: LeadFormValues = { customerName: '', mobileNumber: '', address: '', email: '', description: '' };
