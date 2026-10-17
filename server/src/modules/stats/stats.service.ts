import { Types } from 'mongoose';
import { LedgerEntry } from '../ledger/ledger.model';
import { Transaction } from '../transactions/transaction.model';
import { Vendor } from '../vendors/vendor.model';

const DAY = 24 * 60 * 60 * 1000;

// Statuses where the buyer's money is still held by us
const IN_ESCROW = ['funded', 'in_transit', 'delivered', 'disputed', 'release_pending', 'release_failed'];
const HELD = [...IN_ESCROW, 'refund_pending', 'refund_failed'];

type Group = { count: number; payout: number; volume: number; fees: number; total: number };

// Last N days as YYYY-MM-DD in Lagos time (UTC+1), so the chart has no gaps
function dayKeys(days: number): string[] {
    const keys: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
        keys.push(new Date(Date.now() + 60 * 60 * 1000 - i * DAY).toISOString().slice(0, 10));
    }
    return keys;
}

async function dailySeries(match: Record<string, unknown>, dateField: string, valueField: string, days: number) {
    const rows = await Transaction.aggregate([
        { $match: { ...match, [dateField]: { $gte: new Date(Date.now() - days * DAY) } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}`, timezone: 'Africa/Lagos' } },
                amount: { $sum: `$${valueField}` },
                count: { $sum: 1 },
            },
        },
    ]);
    const byDate = new Map(rows.map((r) => [r._id as string, r]));
    return dayKeys(days).map((date) => ({
        date,
        amount: byDate.get(date)?.amount ?? 0,
        count: byDate.get(date)?.count ?? 0,
    }));
}

export async function vendorStats(vendorId: string) {
    const vid = new Types.ObjectId(vendorId);

    const [rows, daily] = await Promise.all([
        Transaction.aggregate([
            { $match: { vendor: vid } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    payout: { $sum: '$vendorPayout' },
                    volume: { $sum: '$itemAmount' },
                    fees: { $sum: '$platformFee' },
                },
            },
        ]),
        dailySeries({ vendor: vid, status: 'released' }, 'releasedAt', 'vendorPayout', 30),
    ]);

    const by: Record<string, Group> = {};
    for (const r of rows) by[r._id] = r as unknown as Group;
    const get = (s: string): Group => by[s] ?? { count: 0, payout: 0, volume: 0, fees: 0, total: 0 };

    const released = get('released');
    const refunded = get('refunded');
    const finished = released.count + refunded.count;

    return {
        earned: {
            amount: released.payout, // what has actually reached the vendor's bank
            orders: released.count,
            itemVolume: released.volume,
            feesPaid: released.fees,
        },
        inEscrow: {
            amount: IN_ESCROW.reduce((sum, s) => sum + get(s).payout, 0), // what they will receive if all goes well
            orders: IN_ESCROW.reduce((sum, s) => sum + get(s).count, 0),
        },
        awaitingPayment: get('pending_payment').count,
        openDisputes: get('disputed').count,
        needsAttention: get('release_failed').count,
        refundedOrders: refunded.count,
        completionRate: finished ? Math.round((released.count / finished) * 100) : null,
        byStatus: Object.fromEntries(rows.map((r) => [r._id, r.count])),
        daily,
    };
}

export async function adminStats() {
    const [byStatus, paid, fees, oldestDispute, vendors, newVendors, daily, stuckPayouts] = await Promise.all([
        Transaction.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } }]),
        Transaction.aggregate([
            { $match: { paidAt: { $exists: true } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
        ]),
        LedgerEntry.aggregate([
            { $match: { type: 'platform_fee' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.findOne({ 'dispute.status': 'open' }).sort({ 'dispute.raisedAt': 1 }).select('reference dispute.raisedAt'),
        Vendor.countDocuments({ role: 'vendor' }),
        Vendor.countDocuments({ role: 'vendor', joinedAt: { $gte: new Date(Date.now() - 7 * DAY) } }),
        dailySeries({}, 'paidAt', 'totalAmount', 14),
        Transaction.countDocuments({ status: 'release_pending', updatedAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) } }),
    ]);

    const by: Record<string, Group> = {};
    for (const r of byStatus) by[r._id] = r as unknown as Group;
    const get = (s: string): Group => by[s] ?? { count: 0, payout: 0, volume: 0, fees: 0, total: 0 };

    return {
        volume: { paidOrders: paid[0]?.count ?? 0, totalPaid: paid[0]?.total ?? 0 },
        heldInEscrow: {
            amount: HELD.reduce((sum, s) => sum + get(s).total, 0),
            orders: HELD.reduce((sum, s) => sum + get(s).count, 0),
        },
        platformFeesEarned: fees[0]?.total ?? 0, // from the ledger, so it only counts completed releases
        disputes: {
            open: get('disputed').count,
            oldestOpenReference: oldestDispute?.reference ?? null,
            oldestOpenSince: oldestDispute?.dispute?.raisedAt ?? null,
        },
        needsAttention: {
            failedPayouts: get('release_failed').count,
            failedRefunds: get('refund_failed').count,
            stuckPayouts: stuckPayouts,
        },
        vendors: { total: vendors, newThisWeek: newVendors },
        byStatus: Object.fromEntries(byStatus.map((r) => [r._id, r.count])),
        daily,
    };
}

// Orders where money movement went wrong or has been stuck for a while
export async function attentionList() {
    const stuckBefore = new Date(Date.now() - 15 * 60 * 1000);
    const items = await Transaction.find({
        $or: [
            { status: { $in: ['release_failed', 'refund_failed'] } },
            { status: { $in: ['release_pending', 'refund_pending'] }, updatedAt: { $lt: stuckBefore } },
        ],
    })
        .sort({ updatedAt: 1 })
        .limit(50)
        .populate('vendor', 'businessName');
    return { items };
}