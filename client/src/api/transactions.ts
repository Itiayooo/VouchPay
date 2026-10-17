import { api } from './client';
import type { Paginated, Transaction } from './types';

export interface ListParams {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
}

export function listTransactions(params: ListParams = {}) {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.status) q.set('status', params.status);
    if (params.search) q.set('search', params.search);
    const qs = q.toString();
    return api<Paginated<Transaction>>(`/transactions${qs ? `?${qs}` : ''}`, { auth: true });
}

export interface CreateTransactionInput {
    itemDescription: string;
    itemAmount: number; // naira
    deliveryFee: number; // naira
    deliveryType: 'local' | 'courier';
    dispatchWindowDays: number;
    buyer: { name: string; phone: string; email?: string };
    notes?: string;
}

export const createTransaction = (input: CreateTransactionInput) =>
    api<{ transaction: Transaction }>('/transactions', { method: 'POST', body: input, auth: true }).then(
        (d) => d.transaction
    );

export const getTransaction = (id: string) =>
    api<{ transaction: Transaction }>(`/transactions/${id}`, { auth: true }).then((d) => d.transaction);

export const shipOrder = (id: string) =>
    api<{ transaction: Transaction; scanUrl: string }>(`/transactions/${id}/ship`, { method: 'PUT', auth: true });

export const newRiderLink = (id: string) =>
    api<{ scanUrl: string }>(`/transactions/${id}/handover-link`, { method: 'POST', auth: true });

export const cancelUnpaid = (id: string) => api(`/transactions/${id}/cancel`, { method: 'PUT', auth: true });

export const vendorCancel = (id: string) => api(`/refunds/${id}/vendor-cancel`, { method: 'POST', auth: true });

export const respondToDispute = (id: string, response: string) =>
    api(`/disputes/${id}/respond`, { method: 'POST', auth: true, body: { response } });

export const retryPayout = (id: string) => api(`/payouts/${id}/retry`, { method: 'POST', auth: true });