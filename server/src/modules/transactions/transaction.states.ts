export const TRANSACTION_STATUSES = [
    'pending_payment',
    'funded',
    'in_transit',
    'delivered',
    'disputed',
    'release_pending',
    'release_failed',
    'released',
    'refund_pending',
    'refund_failed',
    'refunded',
    'cancelled',
    'expired',
] as const;

export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

// Every allowed move. Anything not listed here is rejected.
const transitions: Record<TransactionStatus, TransactionStatus[]> = {
    pending_payment: ['funded', 'cancelled', 'expired'],
    funded: ['in_transit', 'refund_pending'],
    in_transit: ['delivered', 'release_pending', 'disputed', 'refund_pending'],
    delivered: ['release_pending', 'disputed'],
    disputed: ['release_pending', 'refund_pending'],
    release_pending: ['released', 'release_failed'],
    release_failed: ['release_pending'],
    refund_pending: ['refunded', 'refund_failed'],
    refund_failed: ['refund_pending'],
    released: [],
    refunded: [],
    cancelled: [],
    expired: [],
};

export function canTransition(from: TransactionStatus, to: TransactionStatus): boolean {
    return transitions[from].includes(to);
}