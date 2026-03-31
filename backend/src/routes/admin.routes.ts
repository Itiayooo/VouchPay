import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { Transaction } from '../models/Transaction';
import { Vendor } from '../models/Vendor';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/errorHandler';
import { AuthRequest, PaginationQuery } from '../types';
import { paystackService } from '../services/paystack.service';
import { notificationService } from '../services/notification.service';
import { getPaginationMeta } from '../utils/helpers';
import { logger } from '../utils/logger';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ─── GET /admin/stats — Platform overview ─────────────────────────────────────

router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  const [
    totalTransactions,
    totalVendors,
    openDisputes,
    volumeResult,
    revenueResult,
    statusBreakdown,
  ] = await Promise.all([
    Transaction.countDocuments(),
    Vendor.countDocuments({ role: 'vendor' }),
    Transaction.countDocuments({ status: 'disputed' }),

    Transaction.aggregate([
      { $match: { status: { $in: ['released', 'funded', 'in_transit'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),

    Transaction.aggregate([
      { $match: { status: 'released' } },
      { $group: { _id: null, total: { $sum: '$platformFee' } } },
    ]),

    Transaction.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const breakdown: Record<string, number> = {};
  statusBreakdown.forEach((s: any) => { breakdown[s._id] = s.count; });

  res.json({
    success: true,
    data: {
      totalTransactions,
      totalVendors,
      openDisputes,
      totalVolume: volumeResult[0]?.total || 0,
      totalRevenue: revenueResult[0]?.total || 0,
      statusBreakdown: breakdown,
    },
  });
});

// ─── GET /admin/transactions — All transactions ───────────────────────────────

router.get('/transactions', async (req: Request, res: Response): Promise<void> => {
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

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { reference: { $regex: search, $options: 'i' } },
      { itemDescription: { $regex: search, $options: 'i' } },
      { 'buyer.name': { $regex: search, $options: 'i' } },
      { 'buyer.phone': { $regex: search, $options: 'i' } },
    ];
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('vendor', 'name businessName email phone'),
    Transaction.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: transactions,
    meta: getPaginationMeta(total, pageNum, limitNum),
  });
});

// ─── GET /admin/disputes — All disputed transactions ──────────────────────────

router.get('/disputes', async (req: Request, res: Response): Promise<void> => {
  const { page = '1', limit = '20', status } = req.query as PaginationQuery;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const filter: Record<string, unknown> = { status: 'disputed' };
  if (status && status !== 'disputed') {
    filter['dispute.status'] = status;
  }

  const [disputes, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ 'dispute.createdAt': -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('vendor', 'name businessName email phone bankName'),
    Transaction.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: disputes,
    meta: getPaginationMeta(total, pageNum, limitNum),
  });
});

// ─── PUT /admin/disputes/:id/review — Mark under review ──────────────────────

router.put(
  '/disputes/:id/review',
  async (req: AuthRequest, res: Response): Promise<void> => {
    const txn = await Transaction.findById(req.params.id);

    if (!txn || !txn.dispute) {
      res.status(404).json({ success: false, error: 'Dispute not found' });
      return;
    }

    txn.dispute.status = 'under_review';
    txn.dispute.mediatorNotes = req.body.mediatorNotes || txn.dispute.mediatorNotes;
    await txn.save();

    res.json({ success: true, message: 'Dispute marked under review', data: txn.dispute });
  }
);

// ─── PUT /admin/disputes/:id/resolve — Resolve dispute ───────────────────────

router.put(
  '/disputes/:id/resolve',
  [
    body('resolution')
      .isIn(['resolved_vendor', 'resolved_buyer'])
      .withMessage('resolution must be resolved_vendor or resolved_buyer'),
    body('mediatorNotes').optional().trim(),
  ],
  validate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const txn = await Transaction.findById(req.params.id)
      .populate('vendor', 'name businessName phone email bankName paystackRecipientCode');

    if (!txn || !txn.dispute) {
      res.status(404).json({ success: false, error: 'Dispute not found' });
      return;
    }

    const { resolution, mediatorNotes } = req.body;
    const vendor = txn.vendor as any;
    const amount = (txn.totalAmount / 100).toLocaleString('en-NG');

    txn.dispute.status = resolution;
    txn.dispute.resolvedAt = new Date();
    txn.dispute.resolvedBy = req.user!.id as any;
    if (mediatorNotes) txn.dispute.mediatorNotes = mediatorNotes;

    if (resolution === 'resolved_vendor') {
      // Release funds to vendor
      txn.status = 'released';
      txn.releasedAt = new Date();

      if (vendor.paystackRecipientCode) {
        try {
          const transfer = await paystackService.initiateTransfer({
            recipientCode: vendor.paystackRecipientCode,
            amount: txn.vendorPayout,
            reference: `DISPUTE-PAYOUT-${txn.reference}`,
            reason: `VouchPay dispute resolution — vendor wins — ${txn.reference}`,
          });
          txn.paystackTransferCode = transfer.transfer_code;
        } catch (err) {
          logger.error(`Transfer failed on dispute resolution ${txn.reference}:`, err);
        }
      }

      await notificationService.notifyDisputeResolved({
        phone: vendor.phone,
        name: vendor.name,
        resolution: 'vendor',
        amount,
        reference: txn.reference,
      });

      if (txn.buyer.phone) {
        await notificationService.notifyDisputeResolved({
          phone: txn.buyer.phone,
          name: txn.buyer.name,
          resolution: 'vendor',
          amount,
          reference: txn.reference,
        });
      }
    } else {
      // Refund buyer
      txn.status = 'refunded';

      // In production: initiate Paystack refund via API
      logger.info(`Buyer refund initiated for ${txn.reference} — ₦${amount}`);

      if (txn.buyer.phone) {
        await notificationService.notifyDisputeResolved({
          phone: txn.buyer.phone,
          name: txn.buyer.name,
          resolution: 'buyer',
          amount,
          reference: txn.reference,
        });
      }

      await notificationService.notifyDisputeResolved({
        phone: vendor.phone,
        name: vendor.name,
        resolution: 'buyer',
        amount,
        reference: txn.reference,
      });
    }

    await txn.save();

    logger.info(
      `Dispute resolved: ${txn.reference} → ${resolution} by admin ${req.user!.id}`
    );

    res.json({
      success: true,
      message: `Dispute resolved in favour of ${resolution === 'resolved_vendor' ? 'vendor' : 'buyer'}`,
      data: txn.toJSON(),
    });
  }
);

// ─── GET /admin/vendors — All vendors ────────────────────────────────────────

router.get('/vendors', async (req: Request, res: Response): Promise<void> => {
  const { page = '1', limit = '20', search } = req.query as PaginationQuery;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const filter: Record<string, unknown> = { role: 'vendor' };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { businessName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [vendors, total] = await Promise.all([
    Vendor.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Vendor.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: vendors,
    meta: getPaginationMeta(total, pageNum, limitNum),
  });
});

// ─── PUT /admin/vendors/:id/verify — Verify a vendor ─────────────────────────

router.put('/vendors/:id/verify', async (req: Request, res: Response): Promise<void> => {
  const vendor = await Vendor.findByIdAndUpdate(
    req.params.id,
    { verified: true },
    { new: true }
  );

  if (!vendor) {
    res.status(404).json({ success: false, error: 'Vendor not found' });
    return;
  }

  logger.info(`Vendor verified: ${vendor.email}`);
  res.json({ success: true, message: 'Vendor verified', data: vendor.toJSON() });
});

// ─── PUT /admin/vendors/:id/suspend — Suspend a vendor ───────────────────────

router.put('/vendors/:id/suspend', async (req: Request, res: Response): Promise<void> => {
  const vendor = await Vendor.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!vendor) {
    res.status(404).json({ success: false, error: 'Vendor not found' });
    return;
  }

  logger.info(`Vendor suspended: ${vendor.email}`);
  res.json({ success: true, message: 'Vendor suspended', data: vendor.toJSON() });
});

export default router;
