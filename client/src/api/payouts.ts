import { api } from './client';
import type { Vendor } from './types';

export interface Bank {
    name: string;
    code: string;
}

export const getBanks = () => api<{ banks: Bank[] }>('/payouts/banks', { auth: true }).then((d) => d.banks);

export const resolveAccount = (bankCode: string, accountNumber: string) =>
    api<{ accountName: string; simulated?: boolean }>('/payouts/resolve', {
        method: 'POST',
        auth: true,
        body: { bankCode, accountNumber },
    });

export const saveBankAccount = (input: { bankCode: string; accountNumber: string; password: string }) =>
    api<{ vendor: Vendor }>('/payouts/bank-account', { method: 'PUT', auth: true, body: input }).then((d) => d.vendor);