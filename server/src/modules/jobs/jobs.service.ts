import { AppError } from '../../utils/AppError';
import { notifyReleaseReminder } from '../notifications/notification.service';
import { processRelease, reconcile } from '../payouts/payout.service';
import { issueRefund, reconcileRefund } from '../refunds/refund.service';
import { Transaction } from '../transactions/transaction.model';
import { transitionStatus } from '../transactions/transaction.service';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(Date.now() - ms);

// One failing order should never stop the rest. Lost races are normal and stay quiet.
async function eachSafe<T extends { id: string }>(items: T[], label: string, fn: (item: T) => Promise<unknown>) {
    for (const item of items) {
        try {
            await fn(item);
        } catch (err) {
            const race = err instanceof AppError && ['STATE_CONFLICT', 'INVALID_TRANSITION'].includes(err.code || '');
            if (!race) console.error(`[jobs] ${label} failed for ${item.id}`, err);
        }
    }
}

// Unpaid links past their expiry
export async function expireUnpaid() {
    const items = await Transaction.find({ status: 'pending_payment', paymentExpiresAt: { $lt: new Date() } }).limit(200);
    await eachSafe(items, 'expire', (t) => transitionStatus(t.id, 'pending_payment', 'expired', 'Payment window passed'));
}

// Delivery was reported and the buyer stayed silent
export async function autoRelease() {
    const items = await Transaction.find({ status: 'delivered' }).limit(200);
    const due = items.filter((t) => t.deliveredAt && t.deliveredAt.getTime() + t.autoReleaseHours * HOUR <= Date.now());
    await eachSafe(due, 'auto-release', async (t) => {
        await transitionStatus(t.id, 'delivered', 'release_pending', 'Auto-released: buyer did not respond in time');
        await processRelease(t.id);
    });
}

// One reminder to the buyer, about 24 hours before an unconfirmed delivery is auto-released
export async function remindBuyers() {
    const items = await Transaction.find({ status: 'delivered', releaseReminderSentAt: { $exists: false } }).limit(200);
    const now = Date.now();
    const due = items.filter((t) => {
        if (!t.deliveredAt) return false;
        const deadline = t.deliveredAt.getTime() + t.autoReleaseHours * HOUR;
        return deadline - 24 * HOUR <= now && deadline > now;
    });
    await eachSafe(due, 'release-reminder', async (t) => {
        // Only one run can win this claim, so a buyer never gets two reminders
        const claimed = await Transaction.findOneAndUpdate(
            { _id: t.id, status: 'delivered', releaseReminderSentAt: { $exists: false } },
            { $set: { releaseReminderSentAt: new Date() } },
            { new: true }
        );
        if (claimed) await notifyReleaseReminder(claimed);
    });
}

// Paid but never shipped: refund after the vendor's window plus 7 days
export async function refundUnshipped() {
    const items = await Transaction.find({ status: 'funded', paidAt: { $lt: ago(8 * DAY) } }).limit(200);
    const due = items.filter((t) => t.paidAt && t.paidAt.getTime() + (t.dispatchWindowDays + 7) * DAY <= Date.now());
    await eachSafe(due, 'refund-unshipped', async (t) => {
        await transitionStatus(t.id, 'funded', 'refund_pending', 'Auto-refund: order was never shipped', {
            refundAmount: t.totalAmount,
            cancelledAt: new Date(),
        });
        await issueRefund(t.id);
    });
}

// Payouts and refunds that got stuck mid-way (lost webhook, timeout, crash)
export async function reconcileMoney() {
    const payouts = await Transaction.find({ status: 'release_pending', updatedAt: { $lt: ago(5 * MIN) } }).limit(50);
    await eachSafe(payouts, 'reconcile-payout', (t) => (t.payoutReference ? reconcile(t.id) : processRelease(t.id)));

    const refunds = await Transaction.find({ status: 'refund_pending', updatedAt: { $lt: ago(5 * MIN) } }).limit(50);
    await eachSafe(refunds, 'reconcile-refund', (t) => (t.refundInitiatedAt ? reconcileRefund(t.id) : issueRefund(t.id)));
}

// Things a human has to look at, until there is an admin screen for them
export async function logAttention() {
    const [payoutFailed, refundFailed, longTransit] = await Promise.all([
        Transaction.countDocuments({ status: 'release_failed' }),
        Transaction.countDocuments({ status: 'refund_failed' }),
        Transaction.countDocuments({ status: 'in_transit', shippedAt: { $lt: ago(30 * DAY) } }),
    ]);
    if (payoutFailed || refundFailed || longTransit) {
        console.warn(
            `[jobs] Needs attention: ${payoutFailed} failed payouts, ${refundFailed} failed refunds, ${longTransit} orders in transit for 30+ days`
        );
    }
}