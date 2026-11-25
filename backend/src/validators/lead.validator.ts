import { z } from 'zod';
import { LEAD_STATUSES } from '../models/Lead.js';
import { mobileNumber, optionalEmail, pagination } from './common.js';

export const createLeadSchema = z.object({
  customerName: z.string().trim().min(2, 'Customer name is required').max(120),
  mobileNumber,
  address: z.string().trim().min(3, 'Address is required').max(500),
  email: optionalEmail,
  description: z.string().trim().max(2000).optional().default(''),
  leadDate: z.coerce.date().optional(),
});

// Status is changed only through the dedicated status endpoint.
export const updateLeadSchema = createLeadSchema.partial();

export const updateLeadStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES),
});

export const listLeadsQuery = z.object({
  search: z.string().trim().optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
  ...pagination,
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuery>;
