import crypto from 'crypto';
import { AppError } from '../../utils/AppError';
import * as paystack from '../payments/paystack.service';
import { Vendor } from '../vendors/vendor.model';

type Bank = { name: string; code: string };
let cache: { at: number; banks: Bank[] } | null = null;
const ONE_DAY = 24 * 60 * 60 * 1000;

const isTestMode = () => (process.env.PAYSTACK_SECRET_KEY ?? '').startsWith('sk_test_');

// Any Paystack failure except a bad key. In test mode there are no real banks to ask.
const isLookupFailure = (err: unknown) =>
    err instanceof AppError && Boolean(err.code?.startsWith('PAYSTACK_')) && err.code !== 'PAYSTACK_401';

export async function getBanks(): Promise<Bank[]> {
    if (cache && Date.now() - cache.at < ONE_DAY) return cache.banks;

    const seen = new Set<string>();
    const all: Bank[] = [];
    let cursor: string | undefined;

    for (let i = 0; i < 10; i++) {
        const { banks, next } = await paystack.listBanksPage(cursor);
        let added = 0;
        for (const b of banks) {
            const key = `${b.code}|${b.name}`;
            if (!seen.has(key)) {
                seen.add(key);
                all.push({ name: b.name, code: b.code });
                added++;
            }
        }
        if (!next || added === 0) break; // done, or the page repeated
        cursor = next;
    }

    cache = { at: Date.now(), banks: all.sort((a, b) => a.name.localeCompare(b.name)) };
    return cache.banks;
}

async function resolveName(accountNumber: string, bankCode: string) {
    try {
        const data = await paystack.resolveAccount(accountNumber, bankCode);
        return { accountName: data.account_name, simulated: false };
    } catch (err) {
        if (isTestMode() && isLookupFailure(err)) {
            return { accountName: 'TEST MODE ACCOUNT', simulated: true };
        }
        throw err;
    }
}

export const resolveAccount = (accountNumber: string, bankCode: string) => resolveName(accountNumber, bankCode);

export async function saveBankAccount(
    vendorId: string,
    input: { bankCode: string; accountNumber: string; password: string }
) {
    const vendor = await Vendor.findById(vendorId).select('+password');
    if (!vendor || !(await vendor.comparePassword(input.password))) {
        throw new AppError(401, 'Incorrect password', 'BAD_CREDENTIALS');
    }

    const bank = (await getBanks()).find((b) => b.code === input.bankCode);
    if (!bank) throw new AppError(400, 'Unknown bank', 'BAD_BANK');

    const resolved = await resolveName(input.accountNumber, input.bankCode);

    let recipientCode: string;
    try {
        const recipient = await paystack.createRecipient({
            name: resolved.accountName,
            accountNumber: input.accountNumber,
            bankCode: input.bankCode,
        });
        recipientCode = recipient.recipient_code;
    } catch (err) {
        // A simulated account has no real recipient. Payouts to it are simulated too (test mode only).
        if (isTestMode() && resolved.simulated && isLookupFailure(err)) {
            recipientCode = `RCP_SIM_${crypto.randomUUID()}`;
        } else {
            throw err;
        }
    }

    return Vendor.findByIdAndUpdate(
        vendorId,
        {
            bankName: bank.name,
            bankCode: input.bankCode,
            accountNumber: input.accountNumber,
            accountName: resolved.accountName,
            paystackRecipientCode: recipientCode,
        },
        { new: true }
    );
}