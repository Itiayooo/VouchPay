import { Request } from 'express';
import { Types } from 'mongoose';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  id: string;
  role: 'vendor' | 'admin';
  email: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ─── Transaction ──────────────────────────────────────────────────────────────

export type TransactionStatus =
  | 'pending_payment'
  | 'funded'
  | 'in_transit'
  | 'delivered'
  | 'disputed'
  | 'released'
  | 'refunded'
  | 'cancelled';

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved_vendor'
  | 'resolved_buyer'
  | 'escalated';

// ─── Paystack ─────────────────────────────────────────────────────────────────

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number; // kobo
    paid_at: string;
    channel: string;
    customer: {
      email: string;
      phone: string;
      first_name: string;
      last_name: string;
    };
    metadata?: Record<string, unknown>;
  };
}

export interface PaystackWebhookEvent {
  event: string;
  data: {
    reference: string;
    amount: number;
    status: string;
    paid_at: string;
    channel: string;
    customer: {
      email: string;
      phone?: string;
    };
    metadata?: {
      transactionId?: string;
      escrowReference?: string;
    };
  };
}

export interface PaystackTransferResponse {
  status: boolean;
  message: string;
  data: {
    integration: number;
    domain: string;
    amount: number;
    currency: string;
    source: string;
    reason: string;
    recipient: number;
    transfer_code: string;
    id: number;
    status: string;
  };
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
  };
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: string;
  limit?: string;
  status?: TransactionStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
