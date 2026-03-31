// ─── Core Entities ───────────────────────────────────────────────────────────

export type TransactionStatus =
  | 'pending_payment'
  | 'funded'
  | 'in_transit'
  | 'delivered'
  | 'disputed'
  | 'released'
  | 'refunded'
  | 'cancelled';

export type DisputeStatus = 'open' | 'under_review' | 'resolved_vendor' | 'resolved_buyer' | 'escalated';

export interface Vendor {
  id: string;
  name: string;
  businessName: string;
  phone: string;
  email: string;
  instagramHandle?: string;
  whatsappNumber?: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  paystackRecipientCode?: string;
  rating: number;
  totalTransactions: number;
  totalVolume: number;
  joinedAt: Date;
  verified: boolean;
  avatarUrl?: string;
}

export interface Buyer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface EscrowTransaction {
  id: string;
  reference: string; // e.g. VP-2024-XXXX
  vendor: Vendor;
  buyer: Buyer;
  itemDescription: string;
  itemAmount: number;       // in kobo (NGN)
  deliveryFee: number;      // in kobo
  platformFee: number;      // calculated (1.5%)
  totalAmount: number;      // itemAmount + deliveryFee
  status: TransactionStatus;
  qrToken: string;          // unique one-time QR value
  backupPin: string;        // 4-digit pin
  qrScannedAt?: Date;
  qrScanLocation?: { lat: number; lng: number };
  paymentReference?: string;
  paymentChannel?: string;
  paidAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  releasedAt?: Date;
  createdAt: Date;
  expiresAt: Date;          // 7 days from creation
  dispute?: Dispute;
  escrowLink: string;
  notes?: string;
}

export interface Dispute {
  id: string;
  transactionId: string;
  raisedBy: 'buyer' | 'vendor';
  reason: string;
  description: string;
  status: DisputeStatus;
  evidence?: DisputeEvidence[];
  mediatorNotes?: string;
  resolution?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface DisputeEvidence {
  id: string;
  type: 'image' | 'video' | 'text';
  url?: string;
  content?: string;
  uploadedBy: 'buyer' | 'vendor' | 'mediator';
  uploadedAt: Date;
}

export interface VendorStats {
  totalEarned: number;
  pendingRelease: number;
  inTransit: number;
  disputeRate: number;
  completedOrders: number;
  activeOrders: number;
}

// ─── Form Types ──────────────────────────────────────────────────────────────

export interface CreateEscrowForm {
  itemDescription: string;
  itemAmount: string;
  deliveryFee: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  notes: string;
}

export interface PaymentForm {
  cardNumber: string;
  expiry: string;
  cvv: string;
  name: string;
  email: string;
  phone: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ─── UI State Types ───────────────────────────────────────────────────────────

export type AppView =
  | 'landing'
  | 'vendor-auth'
  | 'vendor-dashboard'
  | 'vendor-create-escrow'
  | 'vendor-transaction'
  | 'vendor-scan'
  | 'vendor-profile'
  | 'buyer-payment'
  | 'buyer-qr'
  | 'buyer-status'
  | 'buyer-dispute'
  | 'admin-dashboard'
  | 'admin-disputes';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

export type UserRole = 'vendor' | 'buyer' | 'admin';
