import type { PublicOrder } from '../../api/buyer';
import { formatDateTime } from '../../lib/date';
import type { Tone } from '../../lib/status';
import Chip from '../ui/Chip';

function content(o: PublicOrder, status: string): { tone: Tone; label: string; text: string } | null {
    const days = o.dispatchWindowDays;
    switch (status) {
        case 'funded':
            return {
                tone: 'leaf',
                label: 'Payment received',
                text: `${o.vendor.businessName} has been told it's safe to ship, and has said they'll ship within ${days} ${days === 1 ? 'day' : 'days'
                    }. Your money stays held until you confirm you got your item.`,
            };
        case 'in_transit':
            return {
                tone: 'mint',
                label: 'On its way',
                text:
                    o.deliveryType === 'local'
                        ? 'The seller has shipped your order. When it arrives, check it, then show your code to the person delivering.'
                        : 'The seller has shipped your order. Once you have collected it and checked it, tap "I\'ve received it" below.',
            };
        case 'delivered': {
            const releaseAt = o.deliveredAt
                ? formatDateTime(new Date(new Date(o.deliveredAt).getTime() + o.autoReleaseHours * 3_600_000))
                : '';
            return {
                tone: 'amber',
                label: 'Delivery reported',
                text: `The seller says your item was delivered. If you have it, confirm below. If something is wrong, open a dispute before ${releaseAt}, or the seller is paid automatically.`,
            };
        }
        case 'disputed':
            return {
                tone: 'alert',
                label: 'Dispute open',
                text: 'A VouchPay mediator is reviewing both sides. Your money stays locked until they decide, and the outcome shows here.',
            };
        case 'release_pending':
        case 'release_failed':
            return { tone: 'amber', label: 'Paying the seller', text: 'Delivery is confirmed and the seller is being paid now.' };
        case 'released':
            return { tone: 'ink', label: 'All done', text: 'Delivery was confirmed and the seller has been paid. Thanks for using VouchPay.' };
        case 'refund_pending':
            return {
                tone: 'amber',
                label: 'Refund in progress',
                text: "We're sending your money back the way you paid. It can take a few days to show up.",
            };
        case 'refund_failed':
            return {
                tone: 'alert',
                label: 'Refund problem',
                text: `Something went wrong sending your refund. We're looking into it. Keep this page and your reference, ${o.reference}.`,
            };
        case 'refunded':
            return { tone: 'muted', label: 'Refunded', text: 'Your money has been sent back the way you paid.' };
        case 'cancelled':
            return { tone: 'muted', label: 'Cancelled', text: 'This order was cancelled.' };
        case 'expired':
            return { tone: 'muted', label: 'Link expired', text: 'This payment link has expired. Ask the seller for a new one.' };
        default:
            return null;
    }
}

export default function StatusNote({ order, status }: { order: PublicOrder; status: string }) {
    const c = content(order, status);
    if (!c) return null;
    return (
        <section className="rounded-card bg-white p-6 md:p-8" aria-live="polite">
            <Chip tone={c.tone}>{c.label}</Chip>
            <p className="mt-4 max-w-[34em]">{c.text}</p>
        </section>
    );
}