import { z } from 'zod';

export const resolveAccountSchema = z.object({
    bankCode: z.string().trim().min(2).max(10),
    accountNumber: z.string().trim().regex(/^\d{10}$/, 'Account number must be 10 digits'),
});

export const saveBankAccountSchema = resolveAccountSchema.extend({
    password: z.string().min(1, 'Enter your password to confirm'),
});