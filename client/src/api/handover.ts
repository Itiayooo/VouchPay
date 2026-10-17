import { api } from './client';

export interface ScanInfo {
    reference: string;
    status: string;
    itemDescription: string;
    buyerName: string;
    deliveryType: 'local' | 'courier';
    autoReleaseHours: number;
}

const enc = (token: string) => encodeURIComponent(token);

export const getScanInfo = (token: string) => api<ScanInfo>(`/handover/${enc(token)}`);

export const confirmHandover = (token: string, input: { qrToken: string } | { pin: string }) =>
    api<{ status: string }>(`/handover/${enc(token)}/confirm`, { method: 'POST', body: input });

export const reportDelivered = (token: string) =>
    api<{ status: string; autoReleaseAt: string }>(`/handover/${enc(token)}/delivered`, { method: 'POST' });