import { Document, Schema, Types, model } from 'mongoose';
import crypto from 'crypto';
import { TRANSACTION_STATUSES, TransactionStatus } from './transaction.states';

export type DeliveryType = 'local' | 'courier';

export interface ITransaction {
    reference: string;
    vendor: Types.ObjectId;
    buyer: { name: string; phone: string; email?: string };
    itemDescription: string;
    itemAmount: number; // all money fields in kobo
    deliveryFee: number;
    platformFee: number;
    totalAmount: number;
    vendorPayout: number;
    status: TransactionStatus;
    statusHistory: { status: TransactionStatus; at: Date; note?: string }[];
    deliveryType: DeliveryType;
    dispatchWindowDays: number;
    autoReleaseHours: number;
    escrowLink: string;
    notes?: string;
    paymentExpiresAt: Date;
    paidAt?: Date;
    paystackReference?: string;
    paystackAccessCode?: string;
    paymentChannel?: string;
    shippedAt?: Date;
    deliveredAt?: Date;
    releasedAt?: Date;
    cancelledAt?: Date;
    handoverSalt?: string;
    scanTokenHash?: string;
    handoverAttempts?: number;
    handoverLockedUntil?: Date;
    handoverMethod?: 'qr' | 'pin';
}

export interface ITransactionDocument extends ITransaction, Document { }

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
export function generateReference(): string {
    const bytes = crypto.randomBytes(6);
    let suffix = '';
    for (const b of bytes) suffix += ALPHABET[b % ALPHABET.length];
    return `VP-${new Date().getFullYear()}-${suffix}`;
}

const transactionSchema = new Schema<ITransactionDocument>(
    {
        reference: { type: String, required: true, unique: true },
        vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
        buyer: {
            name: { type: String, required: true, trim: true },
            phone: { type: String, required: true, trim: true },
            email: { type: String, trim: true, lowercase: true },
        },
        itemDescription: { type: String, required: true, trim: true },
        itemAmount: { type: Number, required: true },
        deliveryFee: { type: Number, required: true, default: 0 },
        platformFee: { type: Number, required: true },
        totalAmount: { type: Number, required: true },
        vendorPayout: { type: Number, required: true },
        status: { type: String, enum: TRANSACTION_STATUSES, default: 'pending_payment' },
        statusHistory: [
            {
                _id: false,
                status: { type: String, enum: TRANSACTION_STATUSES, required: true },
                at: { type: Date, default: Date.now },
                note: String,
            },
        ],
        deliveryType: { type: String, enum: ['local', 'courier'], default: 'local' },
        dispatchWindowDays: { type: Number, default: 2 },
        autoReleaseHours: { type: Number, required: true },
        escrowLink: { type: String, required: true },
        notes: { type: String, trim: true },
        paymentExpiresAt: { type: Date, required: true },
        paidAt: Date,
        paystackReference: String,
        handoverSalt: { type: String, select: false },
        scanTokenHash: { type: String, select: false, index: true },
        handoverAttempts: { type: Number, default: 0 },
        handoverLockedUntil: Date,
        handoverMethod: { type: String, enum: ['qr', 'pin'] },
        paystackAccessCode: String,
        paymentChannel: String,
        shippedAt: Date,
        deliveredAt: Date,
        releasedAt: Date,
        cancelledAt: Date,
    },
    {
        timestamps: true,
        toJSON: {
            transform: (_doc, ret: Record<string, any>) => {
                ret.id = String(ret._id);
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
    }
);

transactionSchema.index({ vendor: 1, createdAt: -1 });
transactionSchema.index({ 'buyer.phone': 1 }); // for the repeat-cancellation flag later
transactionSchema.index({ status: 1, paymentExpiresAt: 1 }); // for the expiry job later

export const Transaction = model<ITransactionDocument>('Transaction', transactionSchema);