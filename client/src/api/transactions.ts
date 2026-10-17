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