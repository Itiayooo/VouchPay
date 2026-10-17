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