import { z } from 'zod';

export const confirmHandoverSchema = z
    .object({
        qrToken: z.string().trim().length(64).optional(),
        pin: z.string().trim().regex(/^\d{4}$/, 'PIN must be 4 digits').optional(),
    })
    .refine((d) => Boolean(d.qrToken) !== Boolean(d.pin), 'Send either qrToken or pin');