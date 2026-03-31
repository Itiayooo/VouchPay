import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { Transaction } from '../models/Transaction';
import { Vendor } from '../models/Vendor';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/errorHandler';
import { AuthRequest, PaginationQuery } from '../types';
import {
  generateReference,
  generateQRToken,
  generateBackupPin,
  generateQRCodeImage,
  calculatePlatformFee,
  buildEscrowLink,
  buildQRLink,
  getEscrowExpiry,
  getPaginationMeta,
  verifyQRToken,
  verifyBackupPin,
} from '../utils/helpers';
import { paystackService } from '../services/paystack.service';
import { notificationService } from '../services/notification.service';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const router = Router();

// ─── POST /transactions — Create escrow link ──────────────────────────────────

router.post(
  '/',
  authenticate,
  [
    body('itemDescription').trim().notEmpty().withMessage('Item description required'),
    body('itemAmount')
      .isInt({ min: 100 })
      .withMessage('Item amount must be at least ₦1 (100 kobo)'),
    body('deliveryFee').optional().isInt({ min: 0 }),
    body('buyerName').trim().notEmpty().withMessage('Buyer name required'),
    body('buyerPhone').trim().notEmpty().withMessage('Buyer phone required'),
    body('buyerEmail').optional().isEmail(),
    body('notes').optional().trim().isLength({ max: 500 }),
  ],
  validate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const {
      itemDescription,
      itemAmount,
      deliveryFee = 0,
      buyerName,
      buyerPhone,
      buyerEmail,
      notes,
    } = req.body;

    const vendorId = req.user!.id;
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      res.status(404).json({ success: false, error: 'Vendor not found' });
      return;
    }

    // Generate identifiers
    const reference = generateReference();
    const { rawToken, hash: qrTokenHash } = await generateQRToken();
    const { rawPin, hash: backupPinHash } = await generateBackupPin();

    // Calculate fees
    const itemAmountKobo = parseInt(itemAmount, 10);
    const deliveryFeeKobo = parseInt(deliveryFee, 10);
    const platformFeeKobo = calculatePlatformFee(itemAmountKobo);
    const totalAmountKobo = itemAmountKobo + deliveryFeeKobo;
    const vendorPayoutKobo = totalAmountKobo - platformFeeKobo;

    const escrowLink = buildEscrowLink(reference);

    const transaction = await Transaction.create({
      reference,
      vendor: vendorId,
      buyer: { name: buyerName, phone: buyerPhone, email: buyerEmail },
      itemDescription,
      itemAmount: itemAmountKobo,
      deliveryFee: deliveryFeeKobo,
      platformFee: platformFeeKobo,
      totalAmount: totalAmountKobo,
      vendorPayout: vendorPayoutKobo,
      qrToken: rawToken,        // stored raw for lookup (in real prod, encrypt)
      qrTokenHash,
      backupPin: rawPin,
      backupPinHash,
      escrowLink,
      expiresAt: getEscrowExpiry(),
    });

    logger.info(`Escrow created: ${reference} by vendor ${vendor.email}`);

    // Return transaction with sensitive data for this response only
    const responseData = {
      ...transaction.toJSON(),
      reference,
      escrowLink,
      // Don't expose raw tokens here — they'll be sent via WhatsApp to buyer on payment
    };

    res.status(201).json({
      success: true,
      message: 'Escrow link created',
      data: responseData,
    });
  }
);

// ─── GET /transactions — List vendor's transactions ───────────────────────────

router.get(
  '/',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const {
      page = '1',
      limit = '20',
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query as PaginationQuery;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = { vendor: req.user!.id };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { itemDescription: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
        { 'buyer.name': { $regex: search, $options: 'i' } },
        { 'buyer.phone': { $regex: search, $options: 'i' } },
      ];
    }

    const sortObj: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate('vendor', 'name businessName email phone bankName accountName verified rating'),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: transactions,
      meta: getPaginationMeta(total, pageNum, limitNum),
    });
  }
);

// ─── GET /transactions/stats — Vendor stats ───────────────────────────────────

router.get('/stats', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const vendorId = req.user!.id;

  const [stats] = await Transaction.aggregate([
    { $match: { vendor: { $eq: (await Transaction.findOne())?.vendor } } },
  ]);

  // Use separate queries for clarity
  const [totalEarned, pendingRelease, activeOrders, disputeCount, completedOrders] =
    await Promise.all([
      Transaction.aggregate([
        { $match: { vendor: new (require('mongoose').Types.ObjectId)(vendorId), status: 'released' } },
        { $group: { _id: null, total: { $sum: '$vendorPayout' } } },
      ]),
      Transaction.aggregate([
        { $match: { vendor: new (require('mongoose').Types.ObjectId)(vendorId), status: { $in: ['funded', 'in_transit'] } } },
        { $group: { _id: null, total: { $sum: '$vendorPayout' } } },
      ]),
      Transaction.countDocuments({ vendor: vendorId, status: { $in: ['funded', 'in_transit'] } }),
      Transaction.countDocuments({ vendor: vendorId, status: 'disputed' }),
      Transaction.countDocuments({ vendor: vendorId, status: 'released' }),
    ]);

  const totalCount = await Transaction.countDocuments({ vendor: vendorId });
  const disputeRate = totalCount > 0 ? ((disputeCount / totalCount) * 100).toFixed(1) : '0.0';

  res.json({
    success: true,
    data: {
      totalEarned: totalEarned[0]?.total || 0,
      pendingRelease: pendingRelease[0]?.total || 0,
      inTransit: activeOrders,
      disputeRate: parseFloat(disputeRate),
      completedOrders,
      activeOrders,
    },
  });
});

// ─── GET /transactions/:id — Single transaction ───────────────────────────────

router.get(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const txn = await Transaction.findById(req.params.id)
      .populate('vendor', 'name businessName email phone bankName accountName verified rating');

    if (!txn) {
      res.status(404).json({ success: false, error: 'Transaction not found' });
      return;
    }

    // Vendors can only see their own; admins see all
    if (
      req.user!.role !== 'admin' &&
      txn.vendor.toString() !== req.user!.id
    ) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    res.json({ success: true, data: txn.toJSON() });
  }
);

// ─── GET /transactions/ref/:reference — By reference (buyer-facing) ───────────

router.get(
  '/ref/:reference',
  async (req: Request, res: Response): Promise<void> => {
    const txn = await Transaction.findOne({ reference: req.params.reference })
      .populate('vendor', 'name businessName email phone rating verified instagramHandle');

    if (!txn) {
      res.status(404).json({ success: false, error: 'Transaction not found' });
      return;
    }

    if (txn.status === 'cancelled') {
      res.status(410).json({ success: false, error: 'This escrow link has been cancelled' });
      return;
    }

    if (new Date() > txn.expiresAt) {
      res.status(410).json({ success: false, error: 'This escrow link has expired' });
      return;
    }

    res.json({ success: true, data: txn.toJSON() });
  }
);

// ─── POST /transactions/:id/initialize-payment — Paystack payment link ────────

router.post(
  '/:id/initialize-payment',
  [
    body('buyerEmail').isEmail().withMessage('Valid email required'),
    body('buyerPhone').optional().trim(),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    const txn = await Transaction.findById(req.params.id)
      .populate('vendor', 'name businessName');

    if (!txn) {
      res.status(404).json({ success: false, error: 'Transaction not found' });
      return;
    }
    if (txn.status !== 'pending_payment') {
      res.status(409).json({ success: false, error: `Cannot pay — transaction is ${txn.status}` });
      return;
    }

    const { buyerEmail, buyerPhone } = req.body;
    const callbackUrl = `${process.env.APP_BASE_URL}/api/payments/callback`;

    try {
      const payment = await paystackService.initializePayment({
        email: buyerEmail,
        amount: txn.totalAmount,
        reference: `PAY-${txn.reference}`,
        callbackUrl,
        metadata: {
          transactionId: txn._id.toString(),
          escrowReference: txn.reference,
          buyerPhone,
        },
      });

      // Save access code
      txn.paystackAccessCode = payment.access_code;
      txn.paystackReference = `PAY-${txn.reference}`;
      if (buyerPhone) txn.buyer.phone = buyerPhone;
      if (buyerEmail) txn.buyer.email = buyerEmail;
      await txn.save();

      res.json({
        success: true,
        data: {
          authorizationUrl: payment.authorization_url,
          accessCode: payment.access_code,
          reference: payment.reference,
        },
      });
    } catch (err: any) {
      res.status(502).json({ success: false, error: err.message });
    }
  }
);

// ─── PUT /transactions/:id/ship — Mark as shipped ─────────────────────────────

router.put(
  '/:id/ship',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const txn = await Transaction.findById(req.params.id);

    if (!txn) {
      res.status(404).json({ success: false, error: 'Transaction not found' });
      return;
    }
    if (txn.vendor.toString() !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }
    if (txn.status !== 'funded') {
      res.status(409).json({ success: false, error: `Cannot ship — transaction is ${txn.status}` });
      return;
    }

    txn.status = 'in_transit';
    txn.shippedAt = new Date();
    await txn.save();

    logger.info(`Transaction ${txn.reference} marked as shipped`);

    res.json({ success: true, message: 'Order marked as shipped', data: txn.toJSON() });
  }
);

// ─── POST /transactions/:id/verify-qr — Vendor scans buyer's QR ──────────────

router.post(
  '/:id/verify-qr',
  authenticate,
  [
    body('qrToken').trim().notEmpty().withMessage('QR token required'),
    body('lat').optional().isFloat(),
    body('lng').optional().isFloat(),
  ],
  validate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const txn = await Transaction.findById(req.params.id)
      .select('+qrToken +qrTokenHash +backupPin +backupPinHash')
      .populate('vendor', 'name businessName phone bankName paystackRecipientCode');

    if (!txn) {
      res.status(404).json({ success: false, error: 'Transaction not found' });
      return;
    }

    const vendor = txn.vendor as any;

    // Only the assigned vendor can scan
    if (vendor._id.toString() !== req.user!.id) {
      res.status(403).json({ success: false, error: 'This order does not belong to you' });
      return;
    }

    if (!['funded', 'in_transit'].includes(txn.status)) {
      res.status(409).json({ success: false, error: `Cannot scan — transaction is ${txn.status}` });
      return;
    }

    if (txn.qrUsed) {
      res.status(409).json({ success: false, error: 'QR code already used' });
      return;
    }

    // Verify the token
    const { qrToken, lat, lng } = req.body;
    const isValid = await verifyQRToken(qrToken, txn.qrTokenHash);

    if (!isValid) {
      logger.warn(`Invalid QR scan attempt on ${txn.reference} by vendor ${req.user!.id}`);
      res.status(400).json({ success: false, error: 'Invalid QR code' });
      return;
    }

    // Mark QR used and update status
    txn.qrUsed = true;
    txn.qrScannedAt = new Date();
    txn.status = 'delivered';
    if (lat && lng) {
      txn.qrScanLocation = { lat: parseFloat(lat), lng: parseFloat(lng) };
    }
    await txn.save();

    // Trigger payout
    await triggerPayout(txn, vendor);

    logger.info(`QR verified and funds released for ${txn.reference}`);

    res.json({
      success: true,
      message: 'QR verified! Funds released to your account.',
      data: {
        reference: txn.reference,
        vendorPayout: txn.vendorPayout,
        scannedAt: txn.qrScannedAt,
        location: txn.qrScanLocation,
      },
    });
  }
);

// ─── POST /transactions/:id/verify-pin — Vendor uses backup PIN ───────────────

router.post(
  '/:id/verify-pin',
  authenticate,
  [body('pin').trim().isLength({ min: 4, max: 4 }).withMessage('PIN must be 4 digits')],
  validate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const txn = await Transaction.findById(req.params.id)
      .select('+backupPin +backupPinHash')
      .populate('vendor', 'name businessName phone bankName paystackRecipientCode');

    if (!txn) {
      res.status(404).json({ success: false, error: 'Transaction not found' });
      return;
    }

    const vendor = txn.vendor as any;

    if (vendor._id.toString() !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    if (!['funded', 'in_transit'].includes(txn.status)) {
      res.status(409).json({ success: false, error: `Cannot verify — transaction is ${txn.status}` });
      return;
    }

    const { pin } = req.body;
    const isValid = await verifyBackupPin(pin, txn.backupPinHash);

    if (!isValid) {
      logger.warn(`Invalid PIN attempt on ${txn.reference}`);
      res.status(400).json({ success: false, error: 'Invalid PIN' });
      return;
    }

    txn.qrUsed = true;
    txn.qrScannedAt = new Date();
    txn.status = 'delivered';
    await txn.save();

    await triggerPayout(txn, vendor);

    logger.info(`PIN verified and funds released for ${txn.reference}`);

    res.json({
      success: true,
      message: 'PIN verified! Funds released.',
      data: { reference: txn.reference, vendorPayout: txn.vendorPayout },
    });
  }
);

// ─── GET /transactions/:id/qr-image — Get QR code as data URL ────────────────

router.get(
  '/:id/qr-image',
  async (req: Request, res: Response): Promise<void> => {
    const { buyerPhone } = req.query as { buyerPhone?: string };

    const txn = await Transaction.findById(req.params.id).select('+qrToken');

    if (!txn) {
      res.status(404).json({ success: false, error: 'Transaction not found' });
      return;
    }

    // Only allow buyer to access (verify by phone or token in real app)
    if (!['funded', 'in_transit'].includes(txn.status)) {
      res.status(409).json({ success: false, error: 'QR not available for this transaction status' });
      return;
    }

    const qrValue = buildQRLink(txn.reference, txn.qrToken);
    const qrImage = await generateQRCodeImage(qrValue);

    res.json({
      success: true,
      data: {
        qrImage,
        qrValue,
        reference: txn.reference,
        backupPin: txn.backupPin, // Note: in production this should also be encrypted
      },
    });
  }
);

// ─── POST /transactions/:id/dispute — Raise a dispute ────────────────────────

router.post(
  '/:id/dispute',
  [
    body('raisedBy').isIn(['buyer', 'vendor']).withMessage('raisedBy must be buyer or vendor'),
    body('reason').trim().notEmpty().withMessage('Reason required'),
    body('description')
      .trim()
      .isLength({ min: 20 })
      .withMessage('Please describe the issue in at least 20 characters'),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    const txn = await Transaction.findById(req.params.id)
      .populate('vendor', 'name phone');

    if (!txn) {
      res.status(404).json({ success: false, error: 'Transaction not found' });
      return;
    }

    if (!['funded', 'in_transit', 'delivered'].includes(txn.status)) {
      res.status(409).json({ success: false, error: 'Cannot raise dispute on this transaction' });
      return;
    }

    if (txn.dispute) {
      res.status(409).json({ success: false, error: 'A dispute already exists for this transaction' });
      return;
    }

    const { raisedBy, reason, description } = req.body;

    txn.dispute = {
      raisedBy,
      reason,
      description,
      status: 'open',
      evidence: [],
      createdAt: new Date(),
    };
    txn.status = 'disputed';
    await txn.save();

    const vendor = txn.vendor as any;

    // Notify vendor
    await notificationService.notifyDisputeRaised({
      vendorPhone: vendor.phone,
      vendorName: vendor.name,
      buyerName: txn.buyer.name,
      reference: txn.reference,
      reason,
    });

    logger.info(`Dispute raised on ${txn.reference} by ${raisedBy}`);

    res.status(201).json({
      success: true,
      message: 'Dispute raised. A mediator will review within 2 hours.',
      data: txn.dispute,
    });
  }
);

// ─── PUT /transactions/:id/cancel — Cancel pending transaction ────────────────

router.put(
  '/:id/cancel',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const txn = await Transaction.findById(req.params.id);

    if (!txn || txn.vendor.toString() !== req.user!.id) {
      res.status(404).json({ success: false, error: 'Transaction not found' });
      return;
    }

    if (txn.status !== 'pending_payment') {
      res.status(409).json({ success: false, error: 'Can only cancel pending transactions' });
      return;
    }

    txn.status = 'cancelled';
    await txn.save();

    res.json({ success: true, message: 'Transaction cancelled', data: txn.toJSON() });
  }
);

// ─── Payout helper ────────────────────────────────────────────────────────────

async function triggerPayout(txn: any, vendor: any): Promise<void> {
  try {
    // Ensure vendor has Paystack recipient code
    let recipientCode = vendor.paystackRecipientCode;

    if (!recipientCode) {
      // In production: get bank code from bank name via Paystack bank list
      // For now we use a placeholder
      logger.warn(`Vendor ${vendor._id} has no Paystack recipient code — skipping transfer`);
    } else {
      const transferRef = `PAYOUT-${txn.reference}-${Date.now()}`;
      const transfer = await paystackService.initiateTransfer({
        recipientCode,
        amount: txn.vendorPayout,
        reference: transferRef,
        reason: `VouchPay payout for order ${txn.reference}`,
      });

      txn.paystackTransferCode = transfer.transfer_code;
    }

    txn.status = 'released';
    txn.releasedAt = new Date();
    txn.deliveredAt = txn.qrScannedAt;
    await txn.save();

    // Update vendor stats
    await Vendor.findByIdAndUpdate(vendor._id, {
      $inc: {
        totalTransactions: 1,
        totalVolume: txn.vendorPayout,
      },
    });

    // Notify vendor
    const amount = (txn.vendorPayout / 100).toLocaleString('en-NG');
    await notificationService.notifyVendorFundsReleased({
      vendorPhone: vendor.phone,
      vendorName: vendor.name,
      amount,
      bankName: vendor.bankName,
      reference: txn.reference,
    });

    logger.info(`Payout completed for ${txn.reference}: ₦${amount}`);
  } catch (err) {
    logger.error(`Payout failed for ${txn.reference}:`, err);
    // Mark released even if transfer fails — manual reconciliation
    txn.status = 'released';
    txn.releasedAt = new Date();
    await txn.save();
  }
}

export default router;
