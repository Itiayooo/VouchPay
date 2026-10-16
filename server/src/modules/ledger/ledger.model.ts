import { Schema, Types, model } from 'mongoose';

export const LEDGER_TYPES = ['payment_received', 'platform_fee', 'vendor_payout', 'refund_issued'] as const;
export type LedgerType = (typeof LEDGER_TYPES)[number];

export interface ILedgerEntry {
    transaction: Types.ObjectId;
    type: LedgerType;
    direction: 'in' | 'out';
    amount: number; // kobo
    idempotencyKey: string;
    meta?: Record<string, unknown>;
}

const ledgerSchema = new Schema<ILedgerEntry>(
    {
        transaction: { type: Schema.Types.ObjectId, ref: 'Transaction', required: true, index: true },
        type: { type: String, enum: LEDGER_TYPES, required: true },
        direction: { type: String, enum: ['in', 'out'], required: true },
        amount: { type: Number, required: true, min: 0 },
        idempotencyKey: { type: String, required: true, unique: true },
        meta: Schema.Types.Mixed,
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export const LedgerEntry = model<ILedgerEntry>('LedgerEntry', ledgerSchema);