import { z } from 'zod';
import { phone } from '../auth/auth.schema';

// Amounts here are in naira; the service converts to kobo
export const createTransactionSchema = z.object({
    itemDescription: z.string().trim().min(3).max(300),
    itemAmount: z.number().min(500, 'Minimum item price is ₦500').max(10_000_000),
    deliveryFee: z.number().min(0).max(1_000_000).default(0),
    deliveryType: z.enum(['local', 'courier']).default('local'),
    dispatchWindowDays: z.number().int().min(1).max(14).default(2),
    buyer: z.object({
        name: z.string().trim().min(2),
        phone,
        email: z.string().trim().toLowerCase().email().optional(),
    }),
    notes: z.string().trim().max(500).optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;