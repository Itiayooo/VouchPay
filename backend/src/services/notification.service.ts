import { logger } from '../utils/logger';

// In production, integrate Twilio / Africa's Talking / Termii
// This service is designed to be swappable

interface NotificationPayload {
  to: string; // phone number e.g. +2348012345678
  message: string;
}

class NotificationService {
  private enabled: boolean;

  constructor() {
    this.enabled = !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM
    );

    if (!this.enabled) {
      logger.warn('Notification service disabled — Twilio credentials not configured');
    }
  }

  private async sendWhatsApp(payload: NotificationPayload): Promise<void> {
    if (!this.enabled) {
      logger.debug(`[WhatsApp MOCK] → ${payload.to}: ${payload.message.slice(0, 80)}...`);
      return;
    }

    try {
      // Dynamic import to avoid crash if twilio not installed
      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: `whatsapp:${payload.to}`,
        body: payload.message,
      });

      logger.info(`WhatsApp sent to ${payload.to}`);
    } catch (err) {
      logger.error(`WhatsApp send failed to ${payload.to}:`, err);
      // Don't throw — notifications are non-critical
    }
  }

  // ─── Notification Templates ───────────────────────────────────────────────────

  async notifyVendorPaymentReceived(params: {
    vendorPhone: string;
    vendorName: string;
    buyerName: string;
    reference: string;
    amount: string;
    itemDescription: string;
  }): Promise<void> {
    const message =
      `🔐 *VouchPay Alert*\n\n` +
      `Hey ${params.vendorName}! Payment secured.\n\n` +
      `*₦${params.amount}* is now locked in vault for:\n` +
      `📦 ${params.itemDescription}\n` +
      `👤 Buyer: ${params.buyerName}\n` +
      `🔖 Ref: ${params.reference}\n\n` +
      `✅ It is safe to ship this order. Funds will be released when the buyer scans the delivery QR code.\n\n` +
      `_VouchPay — trust-bridge for social commerce_`;

    await this.sendWhatsApp({ to: params.vendorPhone, message });
  }

  async notifyBuyerPaymentConfirmed(params: {
    buyerPhone: string;
    buyerName: string;
    vendorName: string;
    reference: string;
    amount: string;
    qrLink: string;
    backupPin: string;
    itemDescription: string;
  }): Promise<void> {
    const message =
      `✅ *VouchPay — Payment Confirmed*\n\n` +
      `Hi ${params.buyerName}! Your payment is secured.\n\n` +
      `📦 ${params.itemDescription}\n` +
      `🏪 Vendor: ${params.vendorName}\n` +
      `💰 Amount locked: ₦${params.amount}\n` +
      `🔖 Ref: ${params.reference}\n\n` +
      `*Your delivery QR code:*\n${params.qrLink}\n\n` +
      `*Backup PIN (if phone is dead): ${params.backupPin}*\n\n` +
      `⚠️ Only show the QR code AFTER inspecting the item at your door. If unhappy, refuse and raise a dispute in the app.\n\n` +
      `_VouchPay — your money, your protection_`;

    await this.sendWhatsApp({ to: params.buyerPhone, message });
  }

  async notifyVendorFundsReleased(params: {
    vendorPhone: string;
    vendorName: string;
    amount: string;
    bankName: string;
    reference: string;
  }): Promise<void> {
    const message =
      `💸 *VouchPay — Funds Released!*\n\n` +
      `Congratulations ${params.vendorName}!\n\n` +
      `*₦${params.amount}* has been sent to your ${params.bankName} account.\n` +
      `🔖 Ref: ${params.reference}\n\n` +
      `Expect your credit alert within 30 seconds.\n\n` +
      `_Keep building trust with VouchPay_ 🚀`;

    await this.sendWhatsApp({ to: params.vendorPhone, message });
  }

  async notifyDisputeRaised(params: {
    vendorPhone: string;
    vendorName: string;
    buyerName: string;
    reference: string;
    reason: string;
  }): Promise<void> {
    const message =
      `⚠️ *VouchPay — Dispute Raised*\n\n` +
      `Hi ${params.vendorName}, ${params.buyerName} has raised a dispute on order ${params.reference}.\n\n` +
      `*Reason:* ${params.reason}\n\n` +
      `Funds remain locked. A VouchPay mediator will review within 2 hours and may reach out for evidence.\n\n` +
      `_VouchPay Dispute Team_`;

    await this.sendWhatsApp({ to: params.vendorPhone, message });
  }

  async notifyDisputeResolved(params: {
    phone: string;
    name: string;
    resolution: 'vendor' | 'buyer';
    amount: string;
    reference: string;
  }): Promise<void> {
    const won = params.resolution === 'vendor' ? 'vendor' : 'buyer';
    const message =
      `⚖️ *VouchPay — Dispute Resolved*\n\n` +
      `Hi ${params.name}, your dispute for order ${params.reference} has been resolved.\n\n` +
      `*Result:* Decided in favour of ${won}\n` +
      `*Amount:* ₦${params.amount}\n\n` +
      `_VouchPay Mediation Team_`;

    await this.sendWhatsApp({ to: params.phone, message });
  }
}

export const notificationService = new NotificationService();
