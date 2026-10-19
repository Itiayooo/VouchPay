import { api } from './client';
import type { AdminStats, Paginated, Transaction, DisputeNote } from './types';


export const getAdminStats = () => api<AdminStats>('/stats/admin', { auth: true });

export const getAttention = () =>
    api<{ items: Transaction[] }>('/stats/admin/attention', { auth: true }).then((d) => d.items);

export const listDisputes = (status: 'open' | 'resolved', page: number) =>
    api<Paginated<Transaction>>(`/disputes?status=${status}&page=${page}&limit=10`, { auth: true });

export interface ResolveInput {
    resolution: 'refund_full' | 'refund_keep_delivery' | 'release_full' | 'split';
    vendorAmount?: number; // naira, split only
    mediatorNotes: string;
    confirmedLegalOutcome?: boolean;
}

export const resolveDispute = (id: string, input: ResolveInput) =>
    api(`/disputes/${id}/resolve`, { method: 'POST', auth: true, body: input });

export const retryRefund = (id: string) => api(`/refunds/${id}/retry`, { method: 'POST', auth: true });

export const getNotes = (id: string) =>
    api<{ notes: DisputeNote[] }>(`/disputes/${id}/notes`, { auth: true }).then((d) => d.notes);

export const addNote = (id: string, text: string) =>
    api(`/disputes/${id}/notes`, { method: 'POST', auth: true, body: { text } });

export const escalateDispute = (id: string, reason: string) =>
    api(`/disputes/${id}/escalate`, { method: 'POST', auth: true, body: { reason } });

export const deescalateDispute = (id: string, text: string) =>
    api(`/disputes/${id}/deescalate`, { method: 'POST', auth: true, body: { text } });