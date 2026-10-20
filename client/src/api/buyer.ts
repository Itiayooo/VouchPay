import { api } from './client';

export interface PublicOrder {
    reference: string;
    status: string;
    itemDescription: string;
    itemAmount: number; // kobo
    deliveryFee: number;
    totalAmount: number;
    deliveryType: 'local' | 'courier';
    dispatchWindowDays: number;
    autoReleaseHours: number;
    paymentExpiresAt: string;
    paidAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    buyer: { name: string; phone: string; email?: string };
    vendor: { businessName: string; verified: boolean; rating: number; instagramHandle?: string };
}

export interface Handover {
    reference: string;
    status: string;
    qrImage: string; // data URL
    pin: string;
}

const asBuyer = (token: string) => ({ 'x-buyer-token': token });
const ref = (reference: string) => encodeURIComponent(reference);

export const getOrder = (reference: string) =>
    api<{ transaction: PublicOrder }>(`/transactions/ref/${ref(reference)}`).then((d) => d.transaction);

export const initializePayment = (reference: string, email?: string) =>
    api<{ authorizationUrl: string; reference: string; buyerToken: string }>('/payments/initialize', {
        method: 'POST',
        body: { reference, email },
    });

export const verifyPayment = (reference: string) =>
    api<{ reference: string; status: string }>(`/payments/verify/${ref(reference)}`);

export const getHandover = (reference: string, token: string) =>
    api<Handover>(`/handover/buyer/${ref(reference)}`, { headers: asBuyer(token) });

export const cancelOrder = (reference: string, token: string) =>
    api<{ status: string }>(`/refunds/buyer/${ref(reference)}/cancel`, { method: 'POST', headers: asBuyer(token) });

export const confirmReceipt = (reference: string, token: string) =>
    api<{ status: string }>(`/handover/buyer/${ref(reference)}/confirm`, { method: 'POST', headers: asBuyer(token) });

export const openDispute = (
    reference: string,
    token: string,
    input: { reason: string; description: string; evidence?: string[] }
) =>
    api<{ status: string }>(`/disputes/buyer/${ref(reference)}`, {
        method: 'POST',
        headers: asBuyer(token),
        body: input,
    });

export interface BuyerDispute {
    status: 'open' | 'resolved';
    reason: string;
    description: string;
    evidence: string[];
    raisedAt?: string;
    vendorResponse: string | null;
    vendorEvidence: string[];
    escalated: boolean;
    resolution: string | null;
    mediatorNotes: string | null;
    resolvedAt: string | null;
    refundAmount: number;
}

export const getDispute = (reference: string, token: string) =>
    api<BuyerDispute>(`/disputes/buyer/${ref(reference)}`, { headers: asBuyer(token) });