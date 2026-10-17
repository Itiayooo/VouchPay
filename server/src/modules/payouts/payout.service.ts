import { AppError } from '../../utils/AppError';
import { recordEntry } from '../ledger/ledger.service';
import * as paystack from '../payments/paystack.service';
import { Transaction } from '../transactions/transaction.model';
import { getTransaction, transitionStatus } from '../transactions/transaction.service';
import { Vendor } from '../vendors/vendor.model';

// Paystack transfer references: lowercase letters, digits, - and _, 16 to 50 chars
const payoutReference = (reference: string, attempt: number) => `po_${reference.toLowerCase()}_${attempt}`;

const isRaceError = (err: unknown) =>
    err instanceof AppError && ['STATE_CONFLICT', 'INVALID_TRANSITION'].includes(err.code || '');

export async function finalizeRelease(id: string) {
    let txn;
    try {
        txn = await transitionStatus(id, 'release_pending', 'released', 'Payout confirmed', { releasedAt: new Date() });
    } catch (err) {
        if (isRaceError(err)) return; // already finalised by the other path
        throw err;
    }

    await recordEntry({
        transaction: txn._id,
        type: 'vendor_payout',
        direction: 'out',
        amount: txn.vendorPayout,
        idempotencyKey: `payout:${txn.reference}`,
        meta: { payoutReference: txn.payoutReference },
    });
    // Revenue entry. Cash held = payment_received - vendor_payout - refund_issued
    await recordEntry({
        transaction: txn._id,
        type: 'platform_fee',
        direction: 'in',
        amount: txn.platformFee,
        idempotencyKey: `fee:${txn.reference}`,
    });
    await Vendor.updateOne({ _id: txn.vendor }, { $inc: { totalTransactions: 1, totalVolume: txn.itemAmount } });
}

export async function failRelease(id: string, reason: string) {
    try {
        // Clearing payoutReference lets a retry claim the order again with a fresh reference
        await transitionStatus(id, 'release_pending', 'release_failed', reason, { payoutFailureReason: reason }, { payoutReference: 1 });
    } catch (err) {
        if (isRaceError(err)) return;
        throw err;
    }
}

export async function processRelease(id: string) {
    const txn = await Transaction.findById(id);
    if (!txn || txn.status !== 'release_pending' || txn.payoutReference) return;

    if (!txn.payoutRecipientCode) {
        await failRelease(txn.id, 'No payout account on this order');
        return;
    }

    // Only one caller can win this claim, so a double scan can never send two transfers
    const attempt = (txn.payoutAttempts ?? 0) + 1;
    const reference = payoutReference(txn.reference, attempt);
    const claimed = await Transaction.findOneAndUpdate(
        {
            _id: txn._id,
            status: 'release_pending',
            payoutReference: { $exists: false },
            payoutAttempts: txn.payoutAttempts ?? null,
        },
        { $set: { payoutAttempts: attempt, payoutReference: reference } },
        { new: true }
    );
    if (!claimed) return;

    try {
        const simulated = claimed.payoutRecipientCode?.startsWith('RCP_SIM_');
        const transfer: paystack.PaystackTransferData = simulated
            ? { reference, amount: claimed.vendorPayout, status: 'success', transfer_code: `TRF_SIM_${reference}` }
            : await paystack.initiateTransfer({
                amount: claimed.vendorPayout,
                recipient: claimed.payoutRecipientCode as string,
                reference,
                reason: `VouchPay ${claimed.reference}`,
            });
        if (transfer.transfer_code) {
            await Transaction.updateOne({ _id: claimed._id }, { transferCode: transfer.transfer_code });
        }
        if (transfer.status === 'success') await finalizeRelease(claimed.id);
        else if (transfer.status === 'failed') await failRelease(claimed.id, 'Transfer failed');
        else if (transfer.status === 'otp') {
            console.warn(`Transfer for ${claimed.reference} needs an OTP. Turn off OTP for transfers in your Paystack settings.`);
        }
        // 'pending': the webhook or a retry will finish it
    } catch (err) {
        if (err instanceof AppError && err.code?.startsWith('PAYSTACK_4')) {
            await failRelease(claimed.id, err.message); // Paystack rejected it, so no transfer exists
        } else {
            // Timeout or 5xx: we can't know whether the transfer was created. Don't guess.
            console.error(`Payout for ${claimed.reference} is in an unknown state. Use the retry endpoint to reconcile.`, err);
        }
    }
}

export async function reconcile(id: string) {
    const txn = await Transaction.findById(id);
    if (!txn || txn.status !== 'release_pending' || !txn.payoutReference) return;

    let data: paystack.PaystackTransferData;
    try {
        data = await paystack.verifyTransfer(txn.payoutReference);
    } catch (err) {
        if (err instanceof AppError && err.code === 'PAYSTACK_404') {
            await failRelease(txn.id, 'Transfer was never created'); // Paystack has no record of it
            return;
        }
        throw err;
    }
    if (data.status === 'success') await finalizeRelease(txn.id);
    else if (['failed', 'reversed'].includes(data.status)) await failRelease(txn.id, `Transfer ${data.status}`);
}

export async function retryPayout(id: string, requester: { id: string; role: string }) {
    const txn = await getTransaction(id, requester);

    if (txn.status === 'release_failed') {
        await transitionStatus(txn.id, 'release_failed', 'release_pending', 'Payout retry requested');
        await processRelease(txn.id);
    } else if (txn.status === 'release_pending') {
        if (txn.payoutReference) await reconcile(txn.id);
        else await processRelease(txn.id);
    } else {
        throw new AppError(400, 'There is no payout to retry on this order', 'NOTHING_TO_RETRY');
    }
    return Transaction.findById(txn.id);
}

export async function handleTransferWebhook(event: string, data: { reference?: string }) {
    const txn = data.reference ? await Transaction.findOne({ payoutReference: data.reference }) : null;
    if (!txn) {
        console.warn(`Transfer event ${event} did not match any order (${data.reference})`);
        return;
    }
    if (event === 'transfer.success') return finalizeRelease(txn.id);
    if (txn.status === 'release_pending') return failRelease(txn.id, `Transfer ${event.split('.')[1]}`);
    console.warn(`Transfer event ${event} for ${txn.reference} while it is ${txn.status}. Needs manual review.`);
}