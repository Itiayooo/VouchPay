import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IVendor extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  businessName: string;
  email: string;
  password: string;
  phone: string;
  instagramHandle?: string;
  whatsappNumber?: string;
  // Bank details
  bankName: string;
  accountNumber: string;
  accountName: string;
  paystackRecipientCode?: string;
  // Stats (denormalized for speed)
  rating: number;
  totalTransactions: number;
  totalVolume: number; // in kobo
  // Flags
  verified: boolean;
  emailVerified: boolean;
  role: 'vendor' | 'admin';
  avatarUrl?: string;
  isActive: boolean;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
  // Methods
  comparePassword(candidate: string): Promise<boolean>;
  toSafeObject(): Omit<IVendor, 'password' | 'refreshToken'>;
}

const VendorSchema = new Schema<IVendor>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: [150, 'Business name cannot exceed 150 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned by default
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    instagramHandle: { type: String, trim: true },
    whatsappNumber: { type: String, trim: true },

    // Bank
    bankName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true },
    paystackRecipientCode: { type: String },

    // Stats
    rating: { type: Number, default: 5.0, min: 0, max: 5 },
    totalTransactions: { type: Number, default: 0 },
    totalVolume: { type: Number, default: 0 },

    // Flags
    verified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    role: { type: String, enum: ['vendor', 'admin'], default: 'vendor' },
    avatarUrl: { type: String },
    isActive: { type: Boolean, default: true },
    refreshToken: { type: String, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.id = ret._id.toString();
        delete (ret as any)._id;
        delete (ret as any).__v;
        delete (ret as any).password;
        delete (ret as any).refreshToken;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
VendorSchema.index({ email: 1 });
VendorSchema.index({ phone: 1 });
VendorSchema.index({ createdAt: -1 });

// ─── Pre-save hook: hash password ─────────────────────────────────────────────
VendorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Methods ──────────────────────────────────────────────────────────────────
VendorSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

VendorSchema.methods.toSafeObject = function () {
  const obj = this.toJSON();
  return obj;
};

export const Vendor: Model<IVendor> = mongoose.model<IVendor>('Vendor', VendorSchema);
