import type { Transaction } from '../../api/types';
import { formatDateTime } from '../../lib/date';

export function nextStep(t: Transaction): string {
    const buyer = t.buyer.name.split(/\s+/)[0];
    const releaseAt = t.deliveredAt
        ? formatDateTime(new Date(new Date(t.deliveredAt).getTime() + t.autoReleaseHours * 3_600_000))
        : '';

    switch (t.status) {
        case 'pending_payment':
            return `Waiting for ${buyer} to pay. Don't ship yet. The link expires ${formatDateTime(t.paymentExpiresAt)}.`;
        case 'funded':
            return `${buyer} has paid and the money is held. It's safe to ship. You promised to ship within ${t.dispatchWindowDays} ${t.dispatchWindowDays === 1 ? 'day' : 'days'
                }.`;
        case 'in_transit':
            return t.deliveryType === 'local'
                ? `On its way. When the rider reaches ${buyer}, they open the rider link and scan ${buyer}'s QR code or type the PIN. You're paid straight away.`
                : `On its way. ${buyer} confirms once they've collected it. If the courier reports delivery and ${buyer} stays quiet, you're paid automatically after ${Math.round(
                    t.autoReleaseHours / 24
                )} days.`;
        case 'delivered':
            return `Delivery was reported. ${buyer} has until ${releaseAt} to confirm or dispute, and after that you're paid automatically.`;
        case 'disputed':
            return `${buyer} opened a dispute. Add your side below. A mediator decides, and your payout is on hold until then.`;
        case 'release_pending':
            return 'Paying out to your bank account now. This usually takes a few seconds.';
        case 'release_failed':
            return "The payout didn't go through. Your money is safe. Try again below.";
        case 'released':
            return t.releasedAt ? `Paid out to your bank account on ${formatDateTime(t.releasedAt)}.` : 'Paid out to your bank account.';
        case 'refund_pending':
            return `Sending ${buyer}'s money back. Nothing else to do.`;
        case 'refund_failed':
            return "The refund didn't go through. VouchPay is looking into it.";
        case 'refunded':
            return `${buyer}'s money was sent back. This order is closed.`;
        case 'cancelled':
            return 'This link was cancelled before it was paid.';
        case 'expired':
            return 'This link expired before it was paid. Create a new one if the buyer still wants it.';
        default:
            return '';
    }
}