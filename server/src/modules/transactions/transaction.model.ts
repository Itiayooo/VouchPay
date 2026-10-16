import { Document, Schema, Types, model } from 'mongoose';
import crypto from 'crypto';
import { DISPUTE_REASONS, TRANSACTION_STATUSES, TransactionStatus } from './transaction.states';

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
    handoverMethod?: 'qr' | 'pin' | 'buyer';
    refundAmount?: number;
    refundId?: string;
    refundInitiatedAt?: Date;
    refundFailureReason?: string;
    refundThenRelease?: boolean;
    refundedAt?: Date;
    dispute?: {
        raisedAt?: Date;
        reason?: string;
        description?: string;
        evidence?: string[];
        vendorResponse?: string;
        vendorEvidence?: string[];
        status?: 'open' | 'resolved';
        resolution?: string;
        mediatorNotes?: string;
        resolvedAt?: Date;
        resolvedBy?: Types.ObjectId;
    };
    payoutRecipientCode?: string;
    payoutReference?: string;
    payoutAttempts?: number;
    payoutFailureReason?: string;
    transferCode?: string;
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
        payoutRecipientCode: String,
        payoutReference: { type: String, index: true },
        payoutAttempts: { type: Number, default: 0 },
        payoutFailureReason: String,
        transferCode: String,
        handoverSalt: { type: String, select: false },
        scanTokenHash: { type: String, select: false, index: true },
        handoverAttempts: { type: Number, default: 0 },
        handoverLockedUntil: Date,
        handoverMethod: { type: String, enum: ['qr', 'pin', 'buyer'] },
        paystackAccessCode: String,
        paymentChannel: String,
        shippedAt: Date,
        deliveredAt: Date,
        releasedAt: Date,
        cancelledAt: Date,
        refundAmount: Number,
        refundId: String,
        refundInitiatedAt: Date,
        refundFailureReason: String,
        refundThenRelease: Boolean,
        refundedAt: Date,
        dispute: {
            raisedAt: Date,
            reason: { type: String, enum: DISPUTE_REASONS },
            description: String,
            evidence: [String],
            vendorResponse: String,
            vendorEvidence: [String],
            status: { type: String, enum: ['open', 'resolved'] },
            resolution: String,
            mediatorNotes: String,
            resolvedAt: Date,
            resolvedBy: { type: Schema.Types.ObjectId, ref: 'Vendor' },
        },
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
transactionSchema.index({ 'dispute.status': 1, 'dispute.raisedAt': 1 });

export const Transaction = model<ITransactionDocument>('Transaction', transactionSchema);