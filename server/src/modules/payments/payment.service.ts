import { AppError } from '../../utils/AppError';
import { recordEntry } from '../ledger/ledger.service';
import { Transaction } from '../transactions/transaction.model';
import { transitionStatus } from '../transactions/transaction.service';
import * as paystack from './paystack.service';
import crypto from 'crypto';
import { deriveBuyerToken } from '../handover/handover.crypto';

export async function initializePayment(reference: string, bodyEmail?: string) {
    const txn = await Transaction.findOne({ reference: reference.toUpperCase() });
    if (!txn) throw new AppError(404, 'Transaction not found');
    if (txn.status !== 'pending_payment') {
        throw new AppError(400, 'This order is no longer awaiting payment', 'NOT_PAYABLE');
    }
    if (txn.paymentExpiresAt < new Date()) {
        throw new AppError(400, 'This payment link has expired', 'LINK_EXPIRED');
    }

    const email = bodyEmail || txn.buyer.email;
    if (!email) throw new AppError(400, 'Email is required to pay', 'EMAIL_REQUIRED');

    // A fresh Paystack reference per attempt, so an abandoned payment never blocks a retry
    const paystackReference = `${txn.reference}-${Date.now().toString(36)}`;
    const init = await paystack.initializeTransaction({
        email,
        amount: txn.totalAmount,
        reference: paystackReference,
        callbackUrl: `${process.env.CLIENT_URL}/pay/${txn.reference}`,
        metadata: { vouchpayReference: txn.reference },
    });

    await Transaction.updateOne(
        { _id: txn._id },
        { paystackReference, paystackAccessCode: init.access_code, 'buyer.email': email }
    );

    return {
        authorizationUrl: init.authorization_url,
        reference: txn.reference,
        buyerToken: deriveBuyerToken(paystackReference),
    };
}

// Called by both the webhook and the verify endpoint. Safe to run any number of times.
export async function confirmFunding(data: paystack.PaystackChargeData) {
    const ref = data.metadata?.vouchpayReference;
    const txn = ref ? await Transaction.findOne({ reference: ref }) : null;
    if (!txn) {
        console.warn(`Payment ${data.reference} does not match any order`);
        return 'unknown';
    }

    if (txn.status !== 'pending_payment') {
        if (['cancelled', 'expired'].includes(txn.status) || data.reference !== txn.paystackReference) {
            console.warn(`Payment ${data.reference} received for ${txn.reference} (${txn.status}). Needs manual refund.`);
        }
        return 'ignored';
    }

    if (data.amount !== txn.totalAmount || data.currency !== 'NGN') {
        console.warn(`Amount mismatch on ${txn.reference}: paid ${data.amount} ${data.currency}, expected ${txn.totalAmount}`);
        return 'mismatch';
    }

    try {
        await transitionStatus(txn.id, 'pending_payment', 'funded', 'Payment confirmed', {
            paidAt: new Date(),
            paystackReference: data.reference,
            paymentChannel: data.channel,
            handoverSalt: crypto.randomBytes(16).toString('hex'),
        });
    } catch (err) {
        if (err instanceof AppError && err.code === 'STATE_CONFLICT') return 'ignored'; // the other path got there first
        throw err;
    }

    await recordEntry({
        transaction: txn._id,
        type: 'payment_received',
        direction: 'in',
        amount: data.amount,
        idempotencyKey: `payment:${txn.reference}`,
        meta: { paystackReference: data.reference, channel: data.channel },
    });

    return 'funded';
}

// The buyer lands back on the payment page after paying; the page calls this
export async function verifyPayment(reference: string) {
    const txn = await Transaction.findOne({ reference: reference.toUpperCase() });
    if (!txn) throw new AppError(404, 'Transaction not found');

    if (txn.status === 'pending_payment' && txn.paystackReference) {
        const data = await paystack.verifyTransaction(txn.paystackReference);
        if (data.status === 'success') {
            await confirmFunding({ ...data, metadata: { vouchpayReference: txn.reference } });
        }
    }

    const fresh = await Transaction.findById(txn._id);
    return { reference: txn.reference, status: fresh!.status };
}
