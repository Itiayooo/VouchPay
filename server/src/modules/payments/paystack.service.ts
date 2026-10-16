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
        throw new AppError(502, json.message || 'Payment provider error', 'PAYSTACK_ERROR');
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