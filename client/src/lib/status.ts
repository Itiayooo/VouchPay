export type Tone = 'leaf' | 'ink' | 'mint' | 'amber' | 'alert' | 'muted';

export const STATUS: Record<string, { label: string; tone: Tone }> = {
  pending_payment: { label: 'Awaiting payment', tone: 'amber' },
  funded: { label: 'Paid, ready to ship', tone: 'leaf' },
  in_transit: { label: 'Shipped', tone: 'mint' },
  delivered: { label: 'Delivered, awaiting buyer', tone: 'amber' },
  disputed: { label: 'In dispute', tone: 'alert' },
  release_pending: { label: 'Paying out', tone: 'amber' },
  release_failed: { label: 'Payout failed', tone: 'alert' },
  released: { label: 'Paid out', tone: 'ink' },
  refund_pending: { label: 'Refunding', tone: 'amber' },
  refund_failed: { label: 'Refund failed', tone: 'alert' },
  refunded: { label: 'Refunded', tone: 'muted' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
  expired: { label: 'Expired', tone: 'muted' },
};