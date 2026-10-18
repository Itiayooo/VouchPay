import type { ITransactionDocument } from '../transactions/transaction.model';
import type { TransactionStatus } from '../transactions/transaction.states';
import { Vendor } from '../vendors/vendor.model';
import { sendEmail } from './email.service';
import { formatNaira, render, when, type Mail } from './email.templates';

const firstName = (n: string) => n.trim().split(/\s+/)[0];
const dayCount = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

export async function notifyTransition(
    txn: ITransactionDocument,
    from: TransactionStatus,
    to: TransactionStatus,
    note?: string
) {
    const vendor = await Vendor.findById(txn.vendor).select('email businessName');
    const base = process.env.CLIENT_URL ?? '';
    const shop = vendor?.businessName ?? 'the seller';
    const buyer = firstName(txn.buyer.name);
    const item = txn.itemDescription;
    const total = formatNaira(txn.totalAmount);
    const payout = formatNaira(txn.vendorPayout);
    const buyerUrl = `${base}/pay/${txn.reference}`;
    const vendorUrl = `${base}/orders/${txn.id}`;
    const adminUrl = `${base}/admin/orders/${txn.id}`;
    const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim()).filter(Boolean);

    const jobs: Promise<void>[] = [];
    const mail = (to: string | string[] | undefined, subject: string, content: Mail) => {
        const { html, text } = render(content);
        for (const addr of (Array.isArray(to) ? to : [to]).filter((a): a is string => Boolean(a))) {
            jobs.push(sendEmail({ to: addr, subject, html, text }));
        }
    };

    const openOrder = (url: string) => ({ label: 'Open the order', url });

    // A mediator's decision
    if (from === 'disputed' && (to === 'release_pending' || to === 'refund_pending')) {
        const refund = formatNaira(txn.refundAmount ?? 0);
        const notes = txn.dispute?.mediatorNotes;
        const split = Boolean(txn.refundThenRelease);

        const forBuyer =
            to === 'release_pending'
                ? `The mediator decided in the seller's favour, so ${shop} will be paid.`
                : split
                    ? `The mediator split the payment. ${refund} is being refunded to you.`
                    : `The mediator decided in your favour. ${refund} is being refunded to you.`;
        const forVendor =
            to === 'release_pending'
                ? `The mediator decided in your favour. You'll receive ${payout}.`
                : split
                    ? `The mediator split the payment. You'll receive ${payout} once the buyer's refund goes through.`
                    : "The mediator decided in the buyer's favour. The buyer is being refunded in full, so there's no payout for this order.";

        mail(txn.buyer.email, `Dispute decided: ${item}`, {
            heading: 'Your dispute has been decided',
            lines: [forBuyer, ...(notes ? [`The mediator's note: ${notes}`] : [])],
            cta: openOrder(buyerUrl),
            note: 'Refunds can take a few days to show up, depending on your bank.',
        });
        mail(vendor?.email, `Dispute decided: ${item}`, {
            heading: 'The dispute has been decided',
            lines: [forVendor, ...(notes ? [`The mediator's note: ${notes}`] : [])],
            cta: openOrder(vendorUrl),
        });
        await Promise.all(jobs);
        return;
    }

    // Cancelled and refunding
    if (to === 'refund_pending' && (from === 'funded' || from === 'in_transit')) {
        const why = note?.startsWith('Cancelled by buyer')
            ? 'The buyer cancelled before it shipped.'
            : note?.startsWith('Cancelled by vendor')
                ? 'You cancelled this order.'
                : note?.startsWith('Auto-refund')
                    ? 'It was refunded automatically because it was never shipped.'
                    : 'It was cancelled.';
        mail(txn.buyer.email, `Order cancelled: ${item}`, {
            heading: 'Your order was cancelled',
            lines: [
                `Your order for ${item} was cancelled, and ${formatNaira(txn.refundAmount ?? txn.totalAmount)} is on its way back to you.`,
                'It can take a few days to show up, depending on your bank.',
            ],
            cta: openOrder(buyerUrl),
        });
        mail(vendor?.email, `Order cancelled: ${item}`, {
            heading: 'An order was cancelled',
            lines: [`Order ${txn.reference} for ${item} was cancelled. ${why}`, 'There is no payout for this order.'],
            cta: openOrder(vendorUrl),
        });
        await Promise.all(jobs);
        return;
    }

    switch (to) {
        case 'funded':
            mail(vendor?.email, `Safe to ship: ${item}`, {
                heading: "It's safe to ship",
                lines: [
                    `${buyer} has paid ${total} for ${item}. VouchPay is holding the money.`,
                    `You'll receive ${payout} when ${buyer} confirms delivery.`,
                    `You promised to ship within ${dayCount(txn.dispatchWindowDays)}. Mark the order as shipped once it's on its way.`,
                ],
                cta: openOrder(vendorUrl),
            });
            mail(txn.buyer.email, `Payment received: ${item}`, {
                heading: 'We have your payment',
                lines: [
                    `We received your payment of ${total} for ${item}.`,
                    `Your money stays with VouchPay. It only goes to ${shop} when you confirm you got your item.`,
                    'Your delivery code is on your order page. Open it on the device you paid with, and only show it once the item is in your hands.',
                ],
                cta: { label: 'Open your order', url: buyerUrl },
                note: 'You can cancel for a full refund until the seller ships.',
            });
            break;

        case 'in_transit':
            mail(txn.buyer.email, `On its way: ${item}`, {
                heading: 'Your order is on its way',
                lines: [
                    `${shop} has shipped ${item}.`,
                    txn.deliveryType === 'local'
                        ? "When it arrives, check the item. If you're happy, show your QR code or read your PIN to the person delivering."
                        : 'Once you have collected it and checked it, open your order and tap "I\'ve received it".',
                ],
                cta: { label: 'Open your order', url: buyerUrl },
                note: "Don't share your code with anyone until the item is in your hands.",
            });
            break;

        case 'delivered': {
            const deadline = txn.deliveredAt ? new Date(txn.deliveredAt.getTime() + txn.autoReleaseHours * 3_600_000) : null;
            const by = deadline ? when(deadline) : `${Math.round(txn.autoReleaseHours / 24)} days from now`;
            mail(txn.buyer.email, `Action needed: confirm delivery of ${item}`, {
                heading: 'Did you get your item?',
                lines: [
                    `${shop} says ${item} was delivered to you.`,
                    `If you have it and you're happy, confirm on your order page. If something is wrong, open a dispute before ${by}.`,
                    "If we don't hear from you by then, the seller is paid automatically.",
                ],
                cta: { label: 'Confirm or report a problem', url: buyerUrl },
            });
            mail(vendor?.email, `Delivery reported: ${item}`, {
                heading: 'Delivery was reported',
                lines: [
                    `Delivery of ${item} was reported without a code from ${buyer}.`,
                    `${buyer} has until ${by} to confirm or dispute. After that you're paid automatically.`,
                ],
                cta: openOrder(vendorUrl),
            });
            break;
        }

        case 'disputed': {
            const said = txn.dispute?.description?.slice(0, 300);
            mail(vendor?.email, `Dispute opened: ${item}`, {
                heading: `${buyer} opened a dispute`,
                lines: [
                    `${buyer} says there's a problem with ${item}.`,
                    ...(said ? [`What they said: ${said}`] : []),
                    'Add your side on the order page. A mediator reads both sides before deciding, and your payout is on hold until then.',
                ],
                cta: { label: 'Add your side', url: vendorUrl },
            });
            mail(txn.buyer.email, `Dispute received: ${item}`, {
                heading: 'We got your dispute',
                lines: [
                    `Your dispute on ${item} is open. Your money stays locked while a mediator reviews both sides.`,
                    "Keep your photos and chats in case you're asked for them.",
                ],
                cta: { label: 'Open your order', url: buyerUrl },
            });
            mail(admins, `New dispute: ${txn.reference}`, {
                heading: 'A new dispute needs a mediator',
                lines: [`${buyer} against ${shop}, ${total}, for ${item}.`],
                cta: { label: 'Review it', url: adminUrl },
            });
            break;
        }

        case 'released':
            mail(vendor?.email, `You've been paid ${payout}`, {
                heading: 'Your payout was sent',
                lines: [`Your payout of ${payout} for ${item} (${txn.reference}) has been sent to your bank account.`],
                cta: openOrder(vendorUrl),
                note: 'It can take a few minutes to show in your bank app.',
            });
            break;

        case 'refunded':
            mail(txn.buyer.email, `Refund sent: ${item}`, {
                heading: 'Your refund was sent',
                lines: [`Your refund for ${item} has been sent back the way you paid.`],
                cta: { label: 'Open your order', url: buyerUrl },
                note: 'It can take a few days to show up, depending on your bank.',
            });
            break;

        case 'release_failed':
            mail(vendor?.email, `Payout problem: ${item}`, {
                heading: "Your payout didn't go through",
                lines: [`The payout for ${item} (${txn.reference}) failed. Your money is safe.`, 'Open the order and tap "Retry payout".'],
                cta: openOrder(vendorUrl),
            });
            mail(admins, `Needs attention: payout failed for ${txn.reference}`, {
                heading: 'A payout failed',
                lines: [`${shop}, ${payout}, ${txn.reference}.`, ...(txn.payoutFailureReason ? [`Reason: ${txn.payoutFailureReason}`] : [])],
                cta: { label: 'Open it', url: adminUrl },
            });
            break;

        case 'refund_failed':
            mail(admins, `Needs attention: refund failed for ${txn.reference}`, {
                heading: 'A refund failed',
                lines: [`${txn.buyer.name}, ${total}, ${txn.reference}.`, ...(txn.refundFailureReason ? [`Reason: ${txn.refundFailureReason}`] : [])],
                cta: { label: 'Open it', url: adminUrl },
            });
            break;

        default:
            break;
    }

    await Promise.all(jobs);
}