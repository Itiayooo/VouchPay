import crypto from 'crypto';

const hmac = (data: string) =>
    crypto.createHmac('sha256', process.env.HANDOVER_SECRET as string).update(data).digest('hex');

export const deriveQrToken = (reference: string, salt: string) => hmac(`qr:${reference}:${salt}`);

export const derivePin = (reference: string, salt: string) =>
    (parseInt(hmac(`pin:${reference}:${salt}`).slice(0, 8), 16) % 10000).toString().padStart(4, '0');

// Tied to one specific Paystack payment attempt
export const deriveBuyerToken = (paystackReference: string) => hmac(`buyer:${paystackReference}`);

export function safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}