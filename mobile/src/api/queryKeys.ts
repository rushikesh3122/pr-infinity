import type { InvoiceQuery, LeadQuery } from './endpoints';

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  leads: ['leads'] as const,
  leadList: (q: LeadQuery) => ['leads', 'list', q] as const,
  lead: (id: string) => ['leads', 'detail', id] as const,
  invoices: ['invoices'] as const,
  invoiceList: (q: InvoiceQuery) => ['invoices', 'list', q] as const,
  invoice: (id: string) => ['invoices', 'detail', id] as const,
  nextInvoiceNumber: ['invoices', 'next-number'] as const,
  settings: ['settings'] as const,
};
