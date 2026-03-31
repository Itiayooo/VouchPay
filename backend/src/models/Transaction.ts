import mongoose, { Document, Schema, Model } from 'mongoose';
import { TransactionStatus, DisputeStatus } from '../types';

// ─── Sub-document interfaces ──────────────────────────────────────────────────

export interface IBuyer {
  name: string;
  phone: string;
  email?: string;
}

export interface IDisputeEvidence {
  type: 'image' | 'video' | 'text';
  url?: string;
  content?: string;
  uploadedBy: 'buyer' | 'vendor' | 'mediator';
  uploadedAt: Date;
}

export interface IDispute {
  raisedBy: 'buyer' | 'vendor';
  reason: string;
  description: string;
  status: DisputeStatus;
  evidence: IDisputeEvidence[];
  mediatorNotes?: string;
  resolution?: string;
  resolvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface IScanLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

// ─── Main Transaction interface ───────────────────────────────────────────────

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  reference: string;           // VP-YYYY-XXXXXX
  vendor: mongoose.Types.ObjectId;
  buyer: IBuyer;
  itemDescription: string;
  itemAmount: number;          // kobo
  deliveryFee: number;         // kobo
  platformFee: number;         // kobo (1.5%, min 15000)
  totalAmount: number;         // itemAmount + deliveryFee (what buyer pays)
  vendorPayout: number;        // totalAmount - platformFee
  status: TransactionStatus;

  // QR / Security
  qrToken: string;             // hashed in DB
  qrTokenHash: string;         // bcrypt hash of the raw token
  backupPin: string;           // 4 digits, hashed
  backupPinHash: string;
  qrUsed: boolean;

  // Payment
  paystackReference?: string;
  paystackAccessCode?: string;
  paymentChannel?: string;
  paidAt?: Date;

  // Delivery
  shippedAt?: Date;
  qrScannedAt?: Date;
  qrScanLocation?: IScanLocation;
  deliveredAt?: Date;
  releasedAt?: Date;
  paystackTransferCode?: string;

  // Dispute
  dispute?: IDispute;

  // Links & Metadata
  escrowLink: string;
  notes?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const DisputeEvidenceSchema = new Schema<IDisputeEvidence>(
  {
    type: { type: String, enum: ['image', 'video', 'text'], required: true },
    url: String,
    content: String,
    uploadedBy: { type: String, enum: ['buyer', 'vendor', 'mediator'], required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DisputeSchema = new Schema<IDispute>(
  {
    raisedBy: { type: String, enum: ['buyer', 'vendor'], required: true },
    reason: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved_vendor', 'resolved_buyer', 'escalated'],
      default: 'open',
    },
    evidence: [DisputeEvidenceSchema],
    mediatorNotes: String,
    resolution: String,
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    createdAt: { type: Date, default: Date.now },
    resolvedAt: Date,
  },
  { _id: false }
);

const TransactionSchema = new Schema<ITransaction>(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    buyer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: String,
    },
    itemDescription: {
      type: String,
      required: [true, 'Item description is required'],
      maxlength: [500, 'Description too long'],
    },
    itemAmount: { type: Number, required: true, min: [100, 'Minimum item amount is ₦1'] },
    deliveryFee: { type: Number, default: 0, min: 0 },
    platformFee: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    vendorPayout: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending_payment', 'funded', 'in_transit', 'delivered', 'disputed', 'released', 'refunded', 'cancelled'],
      default: 'pending_payment',
      index: true,
    },

    // QR / Security - raw tokens stored hashed
    qrToken: { type: String, select: false },       // raw — returned to buyer only
    qrTokenHash: { type: String, select: false },   // bcrypt hash for verification
    backupPin: { type: String, select: false },
    backupPinHash: { type: String, select: false },
    qrUsed: { type: Boolean, default: false },

    // Payment
    paystackReference: { type: String, index: true },
    paystackAccessCode: String,
    paymentChannel: String,
    paidAt: Date,

    // Delivery tracking
    shippedAt: Date,
    qrScannedAt: Date,
    qrScanLocation: {
      lat: Number,
      lng: Number,
      accuracy: Number,
    },
    deliveredAt: Date,
    releasedAt: Date,
    paystackTransferCode: String,

    dispute: DisputeSchema,
    escrowLink: { type: String, required: true },
    notes: String,
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();

        delete (ret as any)._id;
        delete (ret as any).__v;

        // Never expose hashes to client
        delete (ret as any).qrToken;
        delete (ret as any).qrTokenHash;
        delete (ret as any).backupPin;
        delete (ret as any).backupPinHash;

        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
TransactionSchema.index({ vendor: 1, createdAt: -1 });
TransactionSchema.index({ status: 1, createdAt: -1 });
TransactionSchema.index({ 'buyer.phone': 1 });
TransactionSchema.index({ paystackReference: 1 });

export const Transaction: Model<ITransaction> = mongoose.model<ITransaction>(
  'Transaction',
  TransactionSchema
);
