import crypto from 'crypto';
import QRCode from 'qrcode';
import { AppError } from '../../utils/AppError';
import { hashToken } from '../../utils/token';
import { Transaction } from '../transactions/transaction.model';
import { getTransaction, transitionStatus } from '../transactions/transaction.service';
import { deriveBuyerToken, derivePin, deriveQrToken, safeEqual } from './handover.crypto';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 30;

function newScanLink() {
    const token = crypto.randomBytes(32).toString('hex');
    return { hash: hashToken(token), url: `${process.env.CLIENT_URL}/handover/${token}` };
}

export async function shipOrder(id: string, vendorId: string) {
    const txn = await getTransaction(id, { id: vendorId, role: 'vendor' });
    if (txn.status !== 'funded') {
        throw new AppError(400, 'Only paid orders can be marked as shipped', 'NOT_SHIPPABLE');
    }
    const link = newScanLink();
    const transaction = await transitionStatus(txn.id, 'funded', 'in_transit', 'Marked as shipped by vendor', {
        shippedAt: new Date(),
        scanTokenHash: link.hash,
    });
    return { transaction, scanUrl: link.url };
}

// Lets the vendor get a fresh link if they lose it. The old link stops working.
export async function regenerateLink(id: string, vendorId: string) {
    const txn = await getTransaction(id, { id: vendorId, role: 'vendor' });
    if (txn.status !== 'in_transit') {
        throw new AppError(400, 'A handover link only exists for shipped orders', 'NOT_IN_TRANSIT');
    }
    const link = newScanLink();
    await Transaction.updateOne({ _id: txn._id, status: 'in_transit' }, { scanTokenHash: link.hash });
    return { scanUrl: link.url };
}

export async function getBuyerHandover(reference: string, buyerToken: string) {
    const txn = await Transaction.findOne({ reference: reference.toUpperCase() }).select('+handoverSalt');
    if (!txn || !txn.paystackReference || !buyerToken || !safeEqual(buyerToken, deriveBuyerToken(txn.paystackReference))) {
        throw new AppError(404, 'Order not found');
    }
    if (!txn.handoverSalt || !['funded', 'in_transit'].includes(txn.status)) {
        throw new AppError(400, 'There is no active handover code for this order', 'NO_ACTIVE_CODE');
    }
    const qrToken = deriveQrToken(txn.reference, txn.handoverSalt);
    const qrImage = await QRCode.toDataURL(qrToken, { margin: 2, width: 512 });
    return { reference: txn.reference, status: txn.status, qrImage, pin: derivePin(txn.reference, txn.handoverSalt) };
}

export async function confirmHandover(scanToken: string, input: { qrToken?: string; pin?: string }) {
    const txn = await Transaction.findOne({ scanTokenHash: hashToken(scanToken) }).select('+handoverSalt');
    if (!txn || !txn.handoverSalt) throw new AppError(404, 'This handover link is invalid or has expired');
    if (txn.status !== 'in_transit') {
        throw new AppError(400, 'This order is not waiting for handover', 'NOT_IN_TRANSIT');
    }
    if (txn.handoverLockedUntil && txn.handoverLockedUntil > new Date()) {
        throw new AppError(429, 'Too many wrong attempts. Try again later.', 'LOCKED');
    }

    const method = input.qrToken ? 'qr' : 'pin';
    const expected = method === 'qr' ? deriveQrToken(txn.reference, txn.handoverSalt) : derivePin(txn.reference, txn.handoverSalt);
    const supplied = (input.qrToken ?? input.pin) as string;

    if (!safeEqual(supplied.toLowerCase(), expected)) {
        const updated = await Transaction.findByIdAndUpdate(txn._id, { $inc: { handoverAttempts: 1 } }, { new: true });
        const attempts = updated?.handoverAttempts ?? MAX_ATTEMPTS;
        if (attempts >= MAX_ATTEMPTS) {
            await Transaction.updateOne(
                { _id: txn._id },
                { handoverAttempts: 0, handoverLockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000) }
            );
            throw new AppError(429, `Too many wrong attempts. Locked for ${LOCK_MINUTES} minutes.`, 'LOCKED');
        }
        throw new AppError(400, `Incorrect code. ${MAX_ATTEMPTS - attempts} attempts left.`, 'WRONG_CODE');
    }

    await transitionStatus(txn.id, 'in_transit', 'release_pending', `Handover confirmed via ${method}`, {
        deliveredAt: new Date(),
        handoverMethod: method,
    });
    return { status: 'release_pending' };
}