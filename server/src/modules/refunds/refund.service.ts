import { AppError } from '../../utils/AppError';
import { recordEntry } from '../ledger/ledger.service';
import * as paystack from '../payments/paystack.service';
import { processRelease } from '../payouts/payout.service';
import { Transaction } from '../transactions/transaction.model';
import { getTransaction, transitionStatus } from '../transactions/transaction.service';
import { findOrderForBuyer } from '../handover/buyer.auth';

const isRaceError = (err: unknown) =>
    err instanceof AppError && ['STATE_CONFLICT', 'INVALID_TRANSITION'].includes(err.code || '');

export async function failRefund(id: string, reason: string) {
    try {
        await transitionStatus(
            id, 'refund_pending', 'refund_failed', reason,
            { refundFailureReason: reason },
            { refundInitiatedAt: 1, refundId: 1 }
        );
    } catch (err) {
        if (isRaceError(err)) return;
        throw err;
    }
}

export async function finalizeRefund(id: string) {
    const current = await Transaction.findById(id);
    if (!current || current.status !== 'refund_pending') return;

    let txn;
    try {
        // A split dispute continues to the vendor payout once the buyer's share is back
        txn = current.refundThenRelease
            ? await transitionStatus(id, 'refund_pending', 'release_pending', 'Buyer refund processed, releasing vendor share', { refundedAt: new Date() })
            : await transitionStatus(id, 'refund_pending', 'refunded', 'Refund processed', { refundedAt: new Date() });
    } catch (err) {
        if (isRaceError(err)) return;
        throw err;
    }

    await recordEntry({
        transaction: txn._id,
        type: 'refund_issued',
        direction: 'out',
        amount: txn.refundAmount as number,
        idempotencyKey: `refund:${txn.reference}`,
        meta: { refundId: txn.refundId },
    });

    if (current.refundThenRelease) {
        try {
            await processRelease(txn.id);
        } catch (err) {
            console.error(`Release failed for ${txn.reference} after refund`, err);
        }
    }
}

export async function issueRefund(id: string) {
    // Only one caller can win this claim, so a refund is never created twice
    const claimed = await Transaction.findOneAndUpdate(
        { _id: id, status: 'refund_pending', refundInitiatedAt: { $exists: false } },
        { $set: { refundInitiatedAt: new Date() } },
        { new: true }
    );
    if (!claimed) return;

    if (!claimed.paystackReference || !claimed.refundAmount) {
        await failRefund(claimed.id, 'Missing payment reference or refund amount');
        return;
    }

    try {
        const refund = await paystack.createRefund({
            transaction: claimed.paystackReference,
            amount: claimed.refundAmount,
            note: `VouchPay ${claimed.reference}`,
        });
        await Transaction.updateOne({ _id: claimed._id }, { refundId: String(refund.id) });
        if (refund.status === 'processed') await finalizeRefund(claimed.id);
        else if (refund.status === 'failed') await failRefund(claimed.id, 'Refund failed at Paystack');
        // pending / processing: the webhook or reconcile finishes it
    } catch (err) {
        if (err instanceof AppError && err.code?.startsWith('PAYSTACK_4')) {
            await failRefund(claimed.id, err.message); // rejected, so no refund exists
        } else {
            console.error(`Refund for ${claimed.reference} is in an unknown state. Check the Paystack dashboard, then use reconcile.`, err);
        }
    }
}

export async function reconcileRefund(id: string) {
    const txn = await Transaction.findById(id);
    if (!txn || txn.status !== 'refund_pending' || !txn.refundInitiatedAt || !txn.paystackReference) return;

    const list = await paystack.listRefunds(txn.paystackReference);
    const latest = list?.[0];
    if (!latest) {
        console.warn(`Paystack has no refund on record for ${txn.reference}. Check the dashboard before retrying.`);
        return;
    }
    if (latest.status === 'processed') await finalizeRefund(txn.id);
    else if (latest.status === 'failed') await failRefund(txn.id, 'Refund failed at Paystack');
    else if (latest.status === 'needs-attention') {
        console.warn(`Refund for ${txn.reference} needs the customer's bank details. Handle it from the Paystack dashboard.`);
    }
}

export async function handleRefundWebhook(event: string, data: any) {
    const ref = data?.transaction_reference ?? data?.transaction?.reference;
    const txn = ref ? await Transaction.findOne({ paystackReference: ref }) : null;
    if (!txn) {
        console.warn(`Refund event ${event} did not match any order`, JSON.stringify(data).slice(0, 300));
        return;
    }
    if (event === 'refund.processed') return finalizeRefund(txn.id);
    if (event === 'refund.failed') return failRefund(txn.id, 'Refund failed at Paystack');
    if (event === 'refund.needs-attention') {
        console.warn(`Refund for ${txn.reference} needs the customer's bank details. Handle it from the Paystack dashboard.`);
    }
}

const startFullRefund = async (txn: { id: string; status: string; totalAmount: number }, note: string) => {
    await transitionStatus(txn.id, txn.status as any, 'refund_pending', note, {
        refundAmount: txn.totalAmount,
        cancelledAt: new Date(),
    });
    await issueRefund(txn.id);
    return Transaction.findById(txn.id);
};

export async function buyerCancel(reference: string, buyerToken: string) {
    const txn = await findOrderForBuyer(reference, buyerToken);
    if (txn.status !== 'funded') {
        if (txn.status === 'in_transit') {
            throw new AppError(400, "This order has already shipped and can't be cancelled. If something is wrong, open a dispute.", 'USE_DISPUTE');
        }
        throw new AppError(400, 'This order can no longer be cancelled', 'NOT_CANCELLABLE');
    }
    return startFullRefund(txn, 'Cancelled by buyer before shipping');
}

export async function vendorCancel(id: string, vendorId: string) {
    const txn = await getTransaction(id, { id: vendorId, role: 'vendor' });
    if (!['funded', 'in_transit'].includes(txn.status)) {
        throw new AppError(400, 'This order can no longer be cancelled', 'NOT_CANCELLABLE');
    }
    return startFullRefund(txn, 'Cancelled by vendor, full refund');
}

export async function retryRefund(id: string) {
    const txn = await Transaction.findById(id);
    if (!txn) throw new AppError(404, 'Transaction not found');

    if (txn.status === 'refund_failed') {
        await transitionStatus(txn.id, 'refund_failed', 'refund_pending', 'Refund retry requested');
        await issueRefund(txn.id);
    } else if (txn.status === 'refund_pending' && txn.refundInitiatedAt) {
        await reconcileRefund(txn.id);
    } else {
        throw new AppError(400, 'There is no refund to retry on this order', 'NOTHING_TO_RETRY');
    }
    return Transaction.findById(txn.id);
}