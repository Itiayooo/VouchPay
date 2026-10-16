import { Document, Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';

export type VendorRole = 'vendor' | 'admin';

export interface IVendor {
    name: string;
    businessName: string;
    email: string;
    password: string;
    phone: string;
    instagramHandle?: string;
    whatsappNumber?: string;
    rating: number;
    totalTransactions: number;
    totalVolume: number; // kobo
    verified: boolean;
    emailVerified: boolean;
    role: VendorRole;
    isActive: boolean;
    refreshTokenHash?: string;
    joinedAt: Date;
    bankName?: string;
    bankCode?: string;
    accountNumber?: string;
    accountName?: string;
    paystackRecipientCode?: string;
}

export interface IVendorDocument extends IVendor, Document {
    id: string;
    comparePassword(candidate: string): Promise<boolean>;
}

const vendorSchema = new Schema<IVendorDocument>(
    {
        name: { type: String, required: true, trim: true },
        businessName: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, select: false },
        phone: { type: String, required: true, trim: true },
        instagramHandle: { type: String, trim: true },
        whatsappNumber: { type: String, trim: true },
        bankName: String,
        bankCode: String,
        accountNumber: String,
        accountName: String,
        paystackRecipientCode: String,
        rating: { type: Number, default: 0 },
        totalTransactions: { type: Number, default: 0 },
        totalVolume: { type: Number, default: 0 },
        verified: { type: Boolean, default: false },
        emailVerified: { type: Boolean, default: false },
        role: { type: String, enum: ['vendor', 'admin'], default: 'vendor' },
        isActive: { type: Boolean, default: true },
        refreshTokenHash: { type: String, select: false },
        joinedAt: { type: Date, default: Date.now },
    },
    {
        toJSON: {
            transform: (_doc, ret: Record<string, any>) => {
                ret.id = String(ret._id);
                delete ret._id;
                delete ret.__v;
                delete ret.password;
                delete ret.refreshTokenHash;
                return ret;
            },
        },
    }
);

vendorSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

vendorSchema.methods.comparePassword = function (candidate: string) {
    return bcrypt.compare(candidate, this.password);
};

export const Vendor = model<IVendorDocument>('Vendor', vendorSchema);