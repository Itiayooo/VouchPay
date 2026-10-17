export interface Vendor {
    id: string;
    name: string;
    businessName: string;
    email: string;
    phone: string;
    instagramHandle?: string;
    whatsappNumber?: string;
    bankName?: string;
    bankCode?: string;
    accountNumber?: string;
    accountName?: string;
    rating: number;
    totalTransactions: number;
    totalVolume: number; // kobo
    verified: boolean;
    emailVerified: boolean;
    role: 'vendor' | 'admin';
    isActive: boolean;
    joinedAt: string;
}

export interface Transaction {
    id: string;
    reference: string;
    vendor?: string | VendorRef;
    buyer: { name: string; phone: string; email?: string };
    itemDescription: string;
    itemAmount: number; // all money in kobo
    deliveryFee: number;
    platformFee: number;
    totalAmount: number;
    vendorPayout: number;
    status: string;
    deliveryType: 'local' | 'courier';
    dispatchWindowDays: number;
    autoReleaseHours: number;
    escrowLink: string;
    notes?: string;
    paymentExpiresAt: string;
    paidAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    releasedAt?: string;
    cancelledAt?: string;
    createdAt: string;
    updatedAt: string;
    statusHistory?: { status: string; at: string; note?: string }[];
    handoverMethod?: 'qr' | 'pin' | 'buyer';
    payoutFailureReason?: string;
    refundAmount?: number;
    refundFailureReason?: string;
    dispute?: {
        raisedAt?: string;
        reason?: string;
        description?: string;
        evidence?: string[];
        vendorResponse?: string;
        vendorEvidence?: string[];
        status?: 'open' | 'resolved';
        resolution?: string;
        mediatorNotes?: string;
        resolvedAt?: string;
    };
}

export interface Paginated<T> {
    items: T[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface VendorStats {
    earned: { amount: number; orders: number; itemVolume: number; feesPaid: number };
    inEscrow: { amount: number; orders: number };
    awaitingPayment: number;
    openDisputes: number;
    needsAttention: number;
    refundedOrders: number;
    completionRate: number | null;
    byStatus: Record<string, number>;
    daily: { date: string; amount: number; count: number }[];
}

export interface VendorRef {
    id: string;
    name: string;
    businessName: string;
    phone?: string;
    email?: string;
}

export interface AdminStats {
    volume: { paidOrders: number; totalPaid: number };
    heldInEscrow: { amount: number; orders: number };
    platformFeesEarned: number;
    disputes: { open: number; oldestOpenReference: string | null; oldestOpenSince: string | null };
    needsAttention: { failedPayouts: number; failedRefunds: number; stuckPayouts: number };
    vendors: { total: number; newThisWeek: number };
    byStatus: Record<string, number>;
    daily: { date: string; amount: number; count: number }[];
}