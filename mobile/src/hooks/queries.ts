import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  dashboardApi,
  invoicesApi,
  leadsApi,
  settingsApi,
  type InvoiceInput,
  type InvoiceQuery,
  type LeadInput,
  type LeadQuery,
  type SettingsInput,
} from '../api/endpoints';
import { queryKeys } from '../api/queryKeys';
import type { LeadStatus, PaymentStatus } from '../types/models';

const PAGE_SIZE = 20;

export const useDashboard = () => useQuery({ queryKey: queryKeys.dashboard, queryFn: dashboardApi.get });

export const useLeadList = (q: Omit<LeadQuery, 'page' | 'limit'>) =>
  useInfiniteQuery({
    queryKey: queryKeys.leadList(q),
    queryFn: ({ pageParam }) => leadsApi.list({ ...q, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });

export const useLead = (id: string) => useQuery({ queryKey: queryKeys.lead(id), queryFn: () => leadsApi.get(id), enabled: !!id });

export const useInvoiceList = (q: Omit<InvoiceQuery, 'page' | 'limit'>, enabled = true) =>
  useInfiniteQuery({
    queryKey: queryKeys.invoiceList(q),
    queryFn: ({ pageParam }) => invoicesApi.list({ ...q, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled,
  });

export const useInvoice = (id: string) =>
  useQuery({ queryKey: queryKeys.invoice(id), queryFn: () => invoicesApi.get(id), enabled: !!id });

export const useNextInvoiceNumber = () =>
  useQuery({ queryKey: queryKeys.nextInvoiceNumber, queryFn: invoicesApi.nextNumber, staleTime: 0 });

export const useSettings = () => useQuery({ queryKey: queryKeys.settings, queryFn: settingsApi.get, staleTime: 5 * 60_000 });

/** Refresh every list/summary that a lead or invoice change can affect. */
function useInvalidateAll() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.leads }),
      qc.invalidateQueries({ queryKey: queryKeys.invoices }),
      qc.invalidateQueries({ queryKey: queryKeys.dashboard }),
    ]);
}

export function useCreateLead() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (input: LeadInput) => leadsApi.create(input), onSuccess: invalidate });
}

export function useUpdateLead(id: string) {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (input: Partial<LeadInput>) => leadsApi.update(id, input), onSuccess: invalidate });
}

export function useSetLeadStatus() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) => leadsApi.setStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteLead() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => leadsApi.remove(id), onSuccess: invalidate });
}

export function useCreateInvoice() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (input: InvoiceInput) => invoicesApi.create(input), onSuccess: invalidate });
}

export function useSetPaymentStatus() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, paymentStatus }: { id: string; paymentStatus: PaymentStatus }) => invoicesApi.setPaymentStatus(id, paymentStatus),
    onSuccess: invalidate,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SettingsInput) => settingsApi.update(input),
    onSuccess: (data) => qc.setQueryData(queryKeys.settings, data),
  });
}
