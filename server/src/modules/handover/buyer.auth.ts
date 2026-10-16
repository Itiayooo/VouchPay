import { Request } from 'express';
import { AppError } from '../../utils/AppError';
import { Transaction } from '../transactions/transaction.model';
import { deriveBuyerToken, safeEqual } from './handover.crypto';

export const tokenFrom = (req: Request): string => {
    const t = req.headers['x-buyer-token'];
    return typeof t === 'string' ? t : '';
};

export async function findOrderForBuyer(reference: string, buyerToken: string) {
    const txn = await Transaction.findOne({ reference: reference.toUpperCase() });
    if (!txn || !txn.paystackReference || !buyerToken || !safeEqual(buyerToken, deriveBuyerToken(txn.paystackReference))) {
        throw new AppError(404, 'Order not found');
    }
    return txn;
}