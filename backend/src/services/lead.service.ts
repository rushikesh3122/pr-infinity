import type { QueryFilter } from 'mongoose';
import { LeadModel, type Lead, type LeadStatus } from '../models/Lead.js';
import { InvoiceModel } from '../models/Invoice.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import type { CreateLeadInput, ListLeadsQuery, UpdateLeadInput } from '../validators/lead.validator.js';

export async function createLead(input: CreateLeadInput) {
  // Business rule 1: every new lead starts as Pending, whatever the client sends.
  return LeadModel.create({ ...input, leadDate: input.leadDate ?? new Date(), status: 'Pending', dealCompletedAt: null });
}

export async function listLeads(query: ListLeadsQuery) {
  const filter: QueryFilter<Lead> = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ customerName: rx }, { mobileNumber: rx }];
  }
  const sortDir = query.sort === 'oldest' ? 1 : -1;
  const [items, total] = await Promise.all([
    LeadModel.find(filter)
      .sort({ leadDate: sortDir, _id: sortDir })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    LeadModel.countDocuments(filter),
  ]);
  return { items, total, page: query.page, limit: query.limit, hasMore: query.page * query.limit < total };
}

export async function getLead(id: string) {
  const lead = await LeadModel.findById(id);
  if (!lead) throw ApiError.notFound('Lead not found');
  return lead;
}

export async function updateLead(id: string, input: UpdateLeadInput) {
  // Invoices hold their own snapshot of customer details, so editing a lead never alters issued invoices.
  const lead = await LeadModel.findByIdAndUpdate(id, { $set: input }, { returnDocument: 'after', runValidators: true });
  if (!lead) throw ApiError.notFound('Lead not found');
  return lead;
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const lead = await getLead(id);
  if (lead.status === status) return lead;

  if (status === 'Pending') {
    const invoices = await InvoiceModel.countDocuments({ leadId: lead._id });
    if (invoices > 0) {
      throw ApiError.conflict('This lead already has invoices, so it cannot be moved back to Pending.');
    }
    lead.dealCompletedAt = null;
  } else {
    lead.dealCompletedAt = new Date();
  }
  lead.status = status;
  await lead.save();
  return lead;
}

export async function deleteLead(id: string) {
  const lead = await LeadModel.findByIdAndDelete(id);
  if (!lead) throw ApiError.notFound('Lead not found');
  // Invoices are legal records and are kept (they carry their own customer snapshot).
  return { id, invoicesKept: await InvoiceModel.countDocuments({ leadId: lead._id }) };
}
