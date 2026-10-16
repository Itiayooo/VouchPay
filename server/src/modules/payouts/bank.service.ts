import { AppError } from '../../utils/AppError';
import * as paystack from '../payments/paystack.service';
import { Vendor } from '../vendors/vendor.model';

type Bank = { name: string; code: string };
let cache: { at: number; banks: Bank[] } | null = null;
const ONE_DAY = 24 * 60 * 60 * 1000;

export async function getBanks(): Promise<Bank[]> {
    if (cache && Date.now() - cache.at < ONE_DAY) return cache.banks;
    const all: Bank[] = [];
    for (let page = 1; page <= 5; page++) {
        const batch = await paystack.listBanks(page);
        all.push(...batch.map((b) => ({ name: b.name, code: b.code })));
        if (batch.length < 100) break;
    }
    cache = { at: Date.now(), banks: all.sort((a, b) => a.name.localeCompare(b.name)) };
    return cache.banks;
}

export async function resolveAccount(accountNumber: string, bankCode: string) {
    const data = await paystack.resolveAccount(accountNumber, bankCode);
    return { accountName: data.account_name };
}

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

    const resolved = await paystack.resolveAccount(input.accountNumber, input.bankCode);
    const recipient = await paystack.createRecipient({
        name: resolved.account_name,
        accountNumber: input.accountNumber,
        bankCode: input.bankCode,
    });

    return Vendor.findByIdAndUpdate(
        vendorId,
        {
            bankName: bank.name,
            bankCode: input.bankCode,
            accountNumber: input.accountNumber,
            accountName: resolved.account_name,
            paystackRecipientCode: recipient.recipient_code,
        },
        { new: true }
    );
}