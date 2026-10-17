import crypto from 'crypto';
import { AppError } from '../../utils/AppError';

const BASE_URL = 'https://api.paystack.co';

export interface PaystackChargeData {
    reference: string;
    amount: number;
    currency: string;
    channel?: string;
    status?: string;
    metadata?: { vouchpayReference?: string } | null;
}

async function paystackRequest<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json.status) {
        throw new AppError(502, json.message || 'Payment provider error', `PAYSTACK_${res.status}`);
    }
    return json.data as T;
}

export function initializeTransaction(params: {
    email: string;
    amount: number;
    reference: string;
    callbackUrl: string;
    metadata: Record<string, unknown>;
}) {
    return paystackRequest<{ authorization_url: string; access_code: string; reference: string }>(
        '/transaction/initialize',
        'POST',
        {
            email: params.email,
            amount: params.amount,
            reference: params.reference,
            callback_url: params.callbackUrl,
            metadata: params.metadata,
        }
    );
}

export function verifyTransaction(reference: string) {
    return paystackRequest<PaystackChargeData>(`/transaction/verify/${encodeURIComponent(reference)}`, 'GET');
}

export function isValidSignature(rawBody: Buffer, signature?: string): boolean {
    const hash = crypto
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY as string)
        .update(rawBody)
        .digest('hex');
    if (!signature || signature.length !== hash.length) return false;
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

export interface PaystackTransferData {
    reference: string;
    amount: number;
    status: string; // success | pending | otp | failed | reversed
    transfer_code?: string;
}

export function listBanks(page: number) {
    return paystackRequest<{ name: string; code: string }[]>(
        `/bank?country=nigeria&currency=NGN&perPage=100&page=${page}`,
        'GET'
    );
}

export function resolveAccount(accountNumber: string, bankCode: string) {
    return paystackRequest<{ account_number: string; account_name: string }>(
        `/bank/resolve?account_number=${accountNumber}&bank_code=${encodeURIComponent(bankCode)}`,
        'GET'
    );
}

export function createRecipient(p: { name: string; accountNumber: string; bankCode: string }) {
    return paystackRequest<{ recipient_code: string }>('/transferrecipient', 'POST', {
        type: 'nuban',
        name: p.name,
        account_number: p.accountNumber,
        bank_code: p.bankCode,
        currency: 'NGN',
    });
}

export function initiateTransfer(p: { amount: number; recipient: string; reference: string; reason: string }) {
    return paystackRequest<PaystackTransferData>('/transfer', 'POST', {
        source: 'balance',
        amount: p.amount,
        recipient: p.recipient,
        reference: p.reference,
        reason: p.reason,
    });
}

export function verifyTransfer(reference: string) {
    return paystackRequest<PaystackTransferData>(`/transfer/verify/${encodeURIComponent(reference)}`, 'GET');
}

export interface PaystackRefundData {
    id: number;
    status: string; // pending | processing | processed | failed | needs-attention
    amount: number;
}

export function createRefund(p: { transaction: string; amount: number; note: string }) {
    return paystackRequest<PaystackRefundData>('/refund', 'POST', {
        transaction: p.transaction,
        amount: p.amount,
        customer_note: p.note,
        merchant_note: p.note,
    });
}

export function listRefunds(transaction: string) {
    return paystackRequest<PaystackRefundData[]>(`/refund?transaction=${encodeURIComponent(transaction)}`, 'GET');
}

export async function listBanksPage(cursor?: string) {
    const qs = `country=nigeria&currency=NGN&perPage=100${cursor ? `&next=${encodeURIComponent(cursor)}` : ''}`;
    const res = await fetch(`${BASE_URL}/bank?${qs}`, {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json.status) {
        throw new AppError(502, json.message || 'Payment provider error', `PAYSTACK_${res.status}`);
    }
    return {
        banks: json.data as { name: string; code: string }[],
        next: (json.meta?.next as string | null) ?? null,
    };
}