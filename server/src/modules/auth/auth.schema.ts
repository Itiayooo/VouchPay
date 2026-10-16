import { z } from 'zod';

export const phone = z
    .string()
    .regex(/^(\+?234|0)[789][01]\d{8}$/, 'Enter a valid Nigerian phone number');

export const registerSchema = z.object({
    name: z.string().trim().min(2),
    businessName: z.string().trim().min(2),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    phone,
    instagramHandle: z.string().trim().optional(),
    whatsappNumber: phone.optional(),
});

export const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1),
});

export const refreshSchema = z.object({
    refreshToken: z.string().min(1),
});

export const updateProfileSchema = z
    .object({
        name: z.string().trim().min(2),
        businessName: z.string().trim().min(2),
        phone,
        instagramHandle: z.string().trim(),
        whatsappNumber: phone,
    })
    .partial()
    .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;