import { api } from './client';
import type { AdminStats, Paginated, Transaction } from './types';

export const getAdminStats = () => api<AdminStats>('/stats/admin', { auth: true });

export const getAttention = () =>
    api<{ items: Transaction[] }>('/stats/admin/attention', { auth: true }).then((d) => d.items);

export const listDisputes = (status: 'open' | 'resolved', page: number) =>
    api<Paginated<Transaction>>(`/disputes?status=${status}&page=${page}&limit=10`, { auth: true });

export interface ResolveInput {
    resolution: 'refund_full' | 'refund_keep_delivery' | 'release_full' | 'split';
    vendorAmount?: number; // naira, split only
    mediatorNotes: string;
}

export const resolveDispute = (id: string, input: ResolveInput) =>
    api(`/disputes/${id}/resolve`, { method: 'POST', auth: true, body: input });

export const retryRefund = (id: string) => api(`/refunds/${id}/retry`, { method: 'POST', auth: true });