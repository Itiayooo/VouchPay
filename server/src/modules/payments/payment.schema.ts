import { z } from 'zod';

export const initializePaymentSchema = z.object({
    reference: z.string().trim().min(1),
    email: z.string().trim().toLowerCase().email().optional(),
});