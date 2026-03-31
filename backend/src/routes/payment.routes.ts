import { Router, Request, Response } from 'express';
import { Transaction } from '../models/Transaction';
import { Vendor } from '../models/Vendor';
import { paystackService } from '../services/paystack.service';
import { notificationService } from '../services/notification.service';
import { PaystackWebhookEvent } from '../types';
import { buildQRLink } from '../utils/helpers';
import { logger } from '../utils/logger';

const router = Router();

// ─── POST /payments/webhook — Paystack webhook ────────────────────────────────
// Raw body needed for signature verification — configured in app.ts

router.post(
  '/webhook',
  async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['x-paystack-signature'] as string;
    const rawBody = (req as any).rawBody as string;

    // Always respond 200 immediately so Paystack doesn't retry
    res.status(200).json({ received: true });

    // Validate signature
    if (!paystackService.validateWebhookSignature(rawBody, signature)) {
      logger.warn('Invalid Paystack webhook signature');
      return;
    }

    const event = req.body as PaystackWebhookEvent;
    logger.info(`Paystack webhook: ${event.event}`);

    if (event.event === 'charge.success') {
      await handlePaymentSuccess(event);
    } else if (event.event === 'transfer.success') {
      await handleTransferSuccess(event);
    } else if (event.event === 'transfer.failed') {
      await handleTransferFailed(event);
    }
  }
);

// ─── GET /payments/callback — Redirect from Paystack hosted page ──────────────

router.get('/callback', async (req: Request, res: Response): Promise<void> => {
  const { reference } = req.query as { reference: string };

  if (!reference) {
    res.redirect(`${process.env.FRONTEND_BASE_URL}/error?msg=No+reference`);
    return;
  }

  try {
    const payment = await paystackService.verifyPayment(reference);

    if (payment.status !== 'success') {
      res.redirect(`${process.env.FRONTEND_BASE_URL}/pay/failed?ref=${reference}`);
      return;
    }

    // Find the escrow transaction from the reference PAY-VP-YYYY-XXXXXX
    const escrowRef = reference.replace(/^PAY-/, '');
    const txn = await Transaction.findOne({ reference: escrowRef })
      .select('+qrToken')
      .populate('vendor', 'name businessName phone bankName');

    if (!txn || txn.status !== 'pending_payment') {
      res.redirect(`${process.env.FRONTEND_BASE_URL}/qr/${escrowRef}`);
      return;
    }

    // Process the payment
    await processPaymentSuccess(txn, payment);

    res.redirect(`${process.env.FRONTEND_BASE_URL}/qr/${escrowRef}?paid=1`);
  } catch (err) {
    logger.error('Callback processing error:', err);
    res.redirect(`${process.env.FRONTEND_BASE_URL}/error`);
  }
});

// ─── POST /payments/verify — Manual payment verification ─────────────────────

router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  const { reference, escrowReference } = req.body;

  if (!reference) {
    res.status(400).json({ success: false, error: 'Reference required' });
    return;
  }

  try {
    const payment = await paystackService.verifyPayment(reference);

    if (payment.status !== 'success') {
      res.status(400).json({ success: false, error: 'Payment not successful', data: { status: payment.status } });
      return;
    }

    const txn = await Transaction.findOne({
      reference: escrowReference || reference.replace(/^PAY-/, ''),
    })
      .select('+qrToken')
      .populate('vendor', 'name businessName phone bankName');

    if (!txn) {
      res.status(404).json({ success: false, error: 'Transaction not found' });
      return;
    }

    if (txn.status !== 'pending_payment') {
      // Already processed — just return QR data
      res.json({
        success: true,
        message: 'Payment already processed',
        data: { status: txn.status, reference: txn.reference },
      });
      return;
    }

    const qrData = await processPaymentSuccess(txn, payment);

    res.json({
      success: true,
      message: 'Payment confirmed! Escrow funded.',
      data: {
        transaction: txn.toJSON(),
        qrCodeImage: qrData.qrImage,
        backupPin: qrData.backupPin,
        qrLink: qrData.qrLink,
      },
    });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function processPaymentSuccess(txn: any, payment: any): Promise<{ qrImage: string; backupPin: string; qrLink: string }> {
  // Import helpers
  const { generateQRCodeImage, buildQRLink } = await import('../utils/helpers');

  txn.status = 'funded';
  txn.paidAt = new Date(payment.paid_at || Date.now());
  txn.paymentChannel = payment.channel;
  txn.paystackReference = payment.reference;
  await txn.save();

  const vendor = txn.vendor as any;
  const qrLink = buildQRLink(txn.reference, txn.qrToken);
  const qrImage = await generateQRCodeImage(qrLink);
  const amount = (txn.totalAmount / 100).toLocaleString('en-NG');
  const vendorAmount = (txn.itemAmount / 100).toLocaleString('en-NG');

  // Notify vendor: safe to ship
  await notificationService.notifyVendorPaymentReceived({
    vendorPhone: vendor.phone,
    vendorName: vendor.name,
    buyerName: txn.buyer.name,
    reference: txn.reference,
    amount: vendorAmount,
    itemDescription: txn.itemDescription,
  });

  // Notify buyer: here's your QR
  if (txn.buyer.phone) {
    await notificationService.notifyBuyerPaymentConfirmed({
      buyerPhone: txn.buyer.phone,
      buyerName: txn.buyer.name,
      vendorName: vendor.businessName,
      reference: txn.reference,
      amount,
      qrLink,
      backupPin: txn.backupPin,
      itemDescription: txn.itemDescription,
    });
  }

  logger.info(`Payment processed for ${txn.reference} — ₦${amount}`);

  return { qrImage, backupPin: txn.backupPin, qrLink };
}

async function handlePaymentSuccess(event: PaystackWebhookEvent): Promise<void> {
  const { reference, metadata } = event.data;

  const escrowRef = (metadata?.escrowReference as string) || reference.replace(/^PAY-/, '');
  const txn = await Transaction.findOne({ reference: escrowRef })
    .select('+qrToken +backupPin')
    .populate('vendor', 'name businessName phone bankName');

  if (!txn || txn.status !== 'pending_payment') {
    logger.info(`Webhook: transaction ${escrowRef} already processed or not found`);
    return;
  }

  await processPaymentSuccess(txn, event.data);
}

async function handleTransferSuccess(event: PaystackWebhookEvent): Promise<void> {
  logger.info(`Transfer success: ${event.data.reference}`);
  // Transfer is already marked released — this is a confirmation
}

async function handleTransferFailed(event: PaystackWebhookEvent): Promise<void> {
  logger.error(`Transfer FAILED: ${event.data.reference}`);
  // In production: alert ops team, attempt retry, or flag for manual payout
}

export default router;
