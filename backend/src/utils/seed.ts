import 'dotenv/config';
import mongoose from 'mongoose';
import { Vendor } from '../models/Vendor';
import { Transaction } from '../models/Transaction';
import {
  generateReference,
  generateQRToken,
  generateBackupPin,
  calculatePlatformFee,
  buildEscrowLink,
  getEscrowExpiry,
} from './helpers';
import { logger } from './logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vouchpay';

const seed = async () => {
  await mongoose.connect(MONGODB_URI);
  logger.info('Connected to MongoDB for seeding...');

  // ─── Wipe existing dev data ─────────────────────────────────────────────────
  await Promise.all([
    Vendor.deleteMany({}),
    Transaction.deleteMany({}),
  ]);
  logger.info('Cleared existing data');

  // ─── Create admin ───────────────────────────────────────────────────────────
  const admin = await Vendor.create({
    name: 'VouchPay Admin',
    businessName: 'VouchPay Operations',
    email: 'admin@vouchpay.ng',
    password: 'Admin1234!',
    phone: '+2348000000000',
    bankName: 'GTBank',
    accountNumber: '0000000000',
    accountName: 'VOUCHPAY OPERATIONS',
    role: 'admin',
    verified: true,
    emailVerified: true,
  });
  logger.info(`Admin created: ${admin.email}`);

  // ─── Create demo vendor ─────────────────────────────────────────────────────
  const vendor = await Vendor.create({
    name: 'Adaeze Okonkwo',
    businessName: "Ada's Luxury Thrift",
    email: 'ada@vouchpay.ng',
    password: 'Vendor1234!',
    phone: '+2348012345678',
    instagramHandle: '@adasluxurythrift',
    whatsappNumber: '+2348012345678',
    bankName: 'GTBank',
    accountNumber: '0123456789',
    accountName: 'ADAEZE OKONKWO',
    role: 'vendor',
    verified: true,
    emailVerified: true,
    rating: 4.8,
    totalTransactions: 124,
    totalVolume: 845000000, // ₦8.45M in kobo
  });
  logger.info(`Vendor created: ${vendor.email}`);

  // ─── Create a second vendor ─────────────────────────────────────────────────
  const vendor2 = await Vendor.create({
    name: 'Emeka Nwosu',
    businessName: 'Lagos Sneaker Plug',
    email: 'emeka@vouchpay.ng',
    password: 'Vendor1234!',
    phone: '+2348055667788',
    instagramHandle: '@lagossneakerplug',
    bankName: 'Access Bank',
    accountNumber: '0987654321',
    accountName: 'EMEKA NWOSU',
    role: 'vendor',
    verified: true,
    emailVerified: true,
    rating: 4.6,
    totalTransactions: 89,
    totalVolume: 620000000,
  });
  logger.info(`Vendor2 created: ${vendor2.email}`);

  // ─── Create sample transactions ─────────────────────────────────────────────

  // Helper
  const makeTxn = async (
    vendorId: mongoose.Types.ObjectId,
    data: {
      itemDescription: string;
      itemAmount: number;
      deliveryFee: number;
      buyerName: string;
      buyerPhone: string;
      buyerEmail?: string;
      status: string;
      notes?: string;
      overrides?: Record<string, unknown>;
    }
  ) => {
    const ref = generateReference();
    const { rawToken, hash: qrTokenHash } = await generateQRToken();
    const { rawPin, hash: backupPinHash } = await generateBackupPin();
    const platform = calculatePlatformFee(data.itemAmount);
    const total = data.itemAmount + data.deliveryFee;
    const payout = total - platform;

    return Transaction.create({
      reference: ref,
      vendor: vendorId,
      buyer: {
        name: data.buyerName,
        phone: data.buyerPhone,
        email: data.buyerEmail,
      },
      itemDescription: data.itemDescription,
      itemAmount: data.itemAmount,
      deliveryFee: data.deliveryFee,
      platformFee: platform,
      totalAmount: total,
      vendorPayout: payout,
      status: data.status,
      qrToken: rawToken,
      qrTokenHash,
      backupPin: rawPin,
      backupPinHash,
      escrowLink: buildEscrowLink(ref),
      expiresAt: getEscrowExpiry(),
      notes: data.notes,
      paidAt: data.status !== 'pending_payment' ? new Date(Date.now() - 2 * 60 * 60 * 1000) : undefined,
      shippedAt: ['in_transit', 'released', 'disputed'].includes(data.status)
        ? new Date(Date.now() - 60 * 60 * 1000)
        : undefined,
      releasedAt: data.status === 'released' ? new Date(Date.now() - 30 * 60 * 1000) : undefined,
      qrScannedAt: data.status === 'released' ? new Date(Date.now() - 31 * 60 * 1000) : undefined,
      qrScanLocation: data.status === 'released'
        ? { lat: 6.5244 + Math.random() * 0.05, lng: 3.3792 + Math.random() * 0.05 }
        : undefined,
      paystackReference: data.status !== 'pending_payment' ? `PAY-${ref}` : undefined,
      paymentChannel: data.status !== 'pending_payment' ? 'card' : undefined,
      dispute: data.status === 'disputed' ? {
        raisedBy: 'buyer' as const,
        reason: 'Item not as described',
        description: 'The item received does not match the description. There are visible scratches and the packaging was tampered with.',
        status: 'under_review',
        evidence: [],
        createdAt: new Date(Date.now() - 45 * 60 * 1000),
      } : undefined,
      ...data.overrides,
    });
  };

  const txns = await Promise.all([
    makeTxn(vendor._id, {
      itemDescription: 'Zara Leather Tote Bag (Brown, Large)',
      itemAmount: 4500000,
      deliveryFee: 300000,
      buyerName: 'Chioma Eze',
      buyerPhone: '+2348098765432',
      buyerEmail: 'chioma@gmail.com',
      status: 'funded',
      notes: 'Ships Monday via GIG Logistics',
    }),
    makeTxn(vendor._id, {
      itemDescription: 'Nike Air Force 1 (Size 43, Triple White)',
      itemAmount: 5800000,
      deliveryFee: 500000,
      buyerName: 'Emeka Obi',
      buyerPhone: '+2347011223344',
      status: 'in_transit',
    }),
    makeTxn(vendor._id, {
      itemDescription: 'Gucci Belt Authentic (Size 85)',
      itemAmount: 12000000,
      deliveryFee: 0,
      buyerName: 'Fatima Bello',
      buyerPhone: '+2348155667788',
      status: 'released',
    }),
    makeTxn(vendor._id, {
      itemDescription: 'iPhone 15 Pro Max 256GB (Black Titanium)',
      itemAmount: 18500000,
      deliveryFee: 1000000,
      buyerName: 'Tunde Adeyemi',
      buyerPhone: '+2348033445566',
      buyerEmail: 'tunde@example.com',
      status: 'disputed',
    }),
    makeTxn(vendor._id, {
      itemDescription: 'Louis Vuitton Neverfull MM (Damier Ebene)',
      itemAmount: 22000000,
      deliveryFee: 0,
      buyerName: 'Ngozi Adekunle',
      buyerPhone: '+2348077889900',
      status: 'pending_payment',
      notes: 'Pickup available in VI',
    }),
    makeTxn(vendor2._id, {
      itemDescription: 'Jordan 1 Retro High OG Chicago (Size 44)',
      itemAmount: 9500000,
      deliveryFee: 800000,
      buyerName: 'Kemi Adeyinka',
      buyerPhone: '+2348066554433',
      status: 'funded',
    }),
    makeTxn(vendor2._id, {
      itemDescription: 'Yeezy 350 V2 Zebra (Size 42)',
      itemAmount: 7200000,
      deliveryFee: 500000,
      buyerName: 'Bayo Lawal',
      buyerPhone: '+2348022334455',
      status: 'released',
    }),
  ]);

  logger.info(`Created ${txns.length} sample transactions`);

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅  VouchPay seed complete');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Admin   : admin@vouchpay.ng  / Admin1234!');
  console.log("  Vendor 1: ada@vouchpay.ng    / Vendor1234! (Ada's Luxury Thrift)");
  console.log('  Vendor 2: emeka@vouchpay.ng  / Vendor1234! (Lagos Sneaker Plug)');
  console.log(`  Transactions: ${txns.length} sample orders seeded`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
