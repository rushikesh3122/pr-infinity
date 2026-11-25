import { z } from 'zod';
import { Types } from 'mongoose';

export const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), 'Invalid id');

/** Accepts "98765 43210", "+91 9876543210", "09876543210"; stores the 10-digit number. */
export const mobileNumber = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ''))
  .pipe(z.string().regex(/^(?:\+?91|0)?[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'))
  .transform((v) => v.slice(-10));

export const optionalEmail = z
  .union([z.literal(''), z.string().trim().toLowerCase().email('Enter a valid email address')])
  .optional()
  .default('');

export const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
