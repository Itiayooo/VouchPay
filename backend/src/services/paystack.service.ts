import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import {
  PaystackInitializeResponse,
  PaystackVerifyResponse,
  PaystackTransferResponse,
} from '../types';

class PaystackService {
  private client: AxiosInstance;
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    this.client = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Log requests in dev
    if (process.env.NODE_ENV === 'development') {
      this.client.interceptors.request.use((req) => {
        logger.debug(`Paystack → ${req.method?.toUpperCase()} ${req.url}`);
        return req;
      });
    }
  }

  // ─── Initialize payment ─────────────────────────────────────────────────────

  async initializePayment(params: {
    email: string;
    amount: number; // kobo
    reference: string;
    callbackUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaystackInitializeResponse['data']> {
    const response = await this.client.post<PaystackInitializeResponse>(
      '/transaction/initialize',
      {
        email: params.email,
        amount: params.amount,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata || {},
      }
    );

    if (!response.data.status) {
      throw new Error(`Paystack init failed: ${response.data.message}`);
    }

    logger.info(`Paystack payment initialized: ${params.reference}`);
    return response.data.data;
  }

  // ─── Verify payment ─────────────────────────────────────────────────────────

  async verifyPayment(reference: string): Promise<PaystackVerifyResponse['data']> {
    const response = await this.client.get<PaystackVerifyResponse>(
      `/transaction/verify/${reference}`
    );

    if (!response.data.status) {
      throw new Error(`Paystack verify failed: ${response.data.message}`);
    }

    return response.data.data;
  }

  // ─── Create transfer recipient ───────────────────────────────────────────────
  // Must be called before transferring to a vendor for the first time

  async createTransferRecipient(params: {
    accountName: string;
    accountNumber: string;
    bankCode: string;
    currency?: string;
  }): Promise<string> {
    const response = await this.client.post('/transferrecipient', {
      type: 'nuban',
      name: params.accountName,
      account_number: params.accountNumber,
      bank_code: params.bankCode,
      currency: params.currency || 'NGN',
    });

    if (!response.data.status) {
      throw new Error(`Failed to create recipient: ${response.data.message}`);
    }

    const recipientCode: string = response.data.data.recipient_code;
    logger.info(`Paystack recipient created: ${recipientCode} for ${params.accountName}`);
    return recipientCode;
  }

  // ─── Initiate transfer (payout to vendor) ────────────────────────────────────

  async initiateTransfer(params: {
    recipientCode: string;
    amount: number; // kobo
    reference: string;
    reason: string;
  }): Promise<PaystackTransferResponse['data']> {
    const response = await this.client.post<PaystackTransferResponse>('/transfer', {
      source: 'balance',
      amount: params.amount,
      recipient: params.recipientCode,
      reference: params.reference,
      reason: params.reason,
    });

    if (!response.data.status) {
      throw new Error(`Paystack transfer failed: ${response.data.message}`);
    }

    logger.info(
      `Paystack transfer initiated: ${params.reference}, amount: ${params.amount / 100} NGN`
    );
    return response.data.data;
  }

  // ─── Verify transfer ─────────────────────────────────────────────────────────

  async verifyTransfer(transferCode: string): Promise<{ status: string }> {
    const response = await this.client.get(`/transfer/${transferCode}`);
    return { status: response.data.data.status };
  }

  // ─── Get bank list ────────────────────────────────────────────────────────────

  async getBankList(): Promise<Array<{ name: string; code: string; slug: string }>> {
    const response = await this.client.get('/bank?currency=NGN');
    return response.data.data;
  }

  // ─── Resolve account number ──────────────────────────────────────────────────

  async resolveAccount(
    accountNumber: string,
    bankCode: string
  ): Promise<{ account_name: string; account_number: string }> {
    const response = await this.client.get(
      `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
    );

    if (!response.data.status) {
      throw new Error('Account resolution failed');
    }

    return response.data.data;
  }

  // ─── Validate webhook signature ──────────────────────────────────────────────

  validateWebhookSignature(body: string, signature: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET || '')
      .update(body)
      .digest('hex');
    return hash === signature;
  }
}

export const paystackService = new PaystackService();
