import { EscrowTransaction, Vendor, VendorStats } from '../types';

// ─── Formatting ───────────────────────────────────────────────────────────────

export const formatNaira = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
};

export const formatNairaFromUnits = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const generateReference = (): string => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `VP-${year}-${random}`;
};

export const generateQRToken = (): string => {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

export const generateBackupPin = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const calculatePlatformFee = (itemAmount: number): number => {
  // 1.5% platform fee, minimum ₦150 (15000 kobo)
  return Math.max(Math.round(itemAmount * 0.015), 15000);
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatDateShort = (date: Date): string => {
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const getStatusColor = (status: EscrowTransaction['status']): string => {
  const map: Record<string, string> = {
    pending_payment: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    funded: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    in_transit: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    delivered: 'text-vault-400 bg-vault-400/10 border-vault-400/20',
    disputed: 'text-red-400 bg-red-400/10 border-red-400/20',
    released: 'text-vault-500 bg-vault-500/10 border-vault-500/20',
    refunded: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    cancelled: 'text-ink-500 bg-ink-500/10 border-ink-500/20',
  };
  return map[status] || 'text-ink-400 bg-ink-400/10 border-ink-400/20';
};

export const getStatusLabel = (status: EscrowTransaction['status']): string => {
  const map: Record<string, string> = {
    pending_payment: 'Awaiting Payment',
    funded: 'Vault Funded',
    in_transit: 'In Transit',
    delivered: 'Delivered',
    disputed: 'Disputed',
    released: 'Released',
    refunded: 'Refunded',
    cancelled: 'Cancelled',
  };
  return map[status] || status;
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const MOCK_VENDOR: Vendor = {
  id: 'v_001',
  name: 'Adaeze Okonkwo',
  businessName: 'Ada\'s Luxury Thrift',
  phone: '+2348012345678',
  email: 'ada@luxurythrift.ng',
  instagramHandle: '@adasluxurythrift',
  whatsappNumber: '+2348012345678',
  bankName: 'GTBank',
  accountNumber: '0123456789',
  accountName: 'ADAEZE OKONKWO',
  rating: 4.8,
  totalTransactions: 127,
  totalVolume: 8450000 * 100, // kobo
  joinedAt: new Date('2023-08-14'),
  verified: true,
};

export const MOCK_VENDOR_STATS: VendorStats = {
  totalEarned: 8450000 * 100,
  pendingRelease: 285000 * 100,
  inTransit: 2,
  disputeRate: 0.8,
  completedOrders: 124,
  activeOrders: 3,
};

export const MOCK_TRANSACTIONS: EscrowTransaction[] = [
  {
    id: 'txn_001',
    reference: 'VP-2024-A3KP9X',
    vendor: MOCK_VENDOR,
    buyer: { id: 'b_001', name: 'Chioma Eze', phone: '+2348098765432', email: 'chioma@gmail.com' },
    itemDescription: 'Zara Leather Tote Bag (Brown, Large)',
    itemAmount: 4500000,
    deliveryFee: 300000,
    platformFee: 67500,
    totalAmount: 4800000,
    status: 'funded',
    qrToken: 'abc123def456',
    backupPin: '7291',
    paidAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    escrowLink: 'https://vouchpay.ng/pay/VP-2024-A3KP9X',
  },
  {
    id: 'txn_002',
    reference: 'VP-2024-B7MN2Z',
    vendor: MOCK_VENDOR,
    buyer: { id: 'b_002', name: 'Emeka Obi', phone: '+2347011223344' },
    itemDescription: 'Nike Air Force 1 (Size 43)',
    itemAmount: 5800000,
    deliveryFee: 500000,
    platformFee: 87000,
    totalAmount: 6300000,
    status: 'in_transit',
    qrToken: 'xyz789ghi012',
    backupPin: '4853',
    paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    shippedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 5.5 * 24 * 60 * 60 * 1000),
    escrowLink: 'https://vouchpay.ng/pay/VP-2024-B7MN2Z',
  },
  {
    id: 'txn_003',
    reference: 'VP-2024-C9QR7W',
    vendor: MOCK_VENDOR,
    buyer: { id: 'b_003', name: 'Fatima Bello', phone: '+2348155667788' },
    itemDescription: 'Gucci Belt (Authentic, Size 85)',
    itemAmount: 12000000,
    deliveryFee: 0,
    platformFee: 180000,
    totalAmount: 12000000,
    status: 'released',
    qrToken: 'mno345pqr678',
    backupPin: '1947',
    paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    shippedAt: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000),
    deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    qrScannedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    releasedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    escrowLink: 'https://vouchpay.ng/pay/VP-2024-C9QR7W',
  },
  {
    id: 'txn_004',
    reference: 'VP-2024-D2ST5V',
    vendor: MOCK_VENDOR,
    buyer: { id: 'b_004', name: 'Tunde Adeyemi', phone: '+2348033445566' },
    itemDescription: 'iPhone 15 Pro Max (256GB, Black Titanium)',
    itemAmount: 18500000,
    deliveryFee: 1000000,
    platformFee: 277500,
    totalAmount: 19500000,
    status: 'disputed',
    qrToken: 'stu901vwx234',
    backupPin: '3621',
    paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    shippedAt: new Date(Date.now() - 4.5 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    escrowLink: 'https://vouchpay.ng/pay/VP-2024-D2ST5V',
    dispute: {
      id: 'dsp_001',
      transactionId: 'txn_004',
      raisedBy: 'buyer',
      reason: 'Item not as described',
      description: 'The phone was advertised as brand new but came with scratches on the screen. The box was also tampered with.',
      status: 'under_review',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  },
];
