import { z } from 'zod';
import { DISPUTE_REASONS } from '../transactions/transaction.states';

const evidence = z.array(z.string().trim().url()).max(5).default([]);

export const raiseDisputeSchema = z.object({
    reason: z.enum(DISPUTE_REASONS),
    description: z.string().trim().min(10).max(1000),
    evidence,
});

export const respondDisputeSchema = z.object({
    response: z.string().trim().min(10).max(1000),
    evidence,
});

export const resolveDisputeSchema = z
    .object({
        resolution: z.enum(['refund_full', 'refund_keep_delivery', 'release_full', 'split']),
        vendorAmount: z.number().positive().optional(), // naira the vendor keeps, split only
        mediatorNotes: z.string().trim().min(5).max(1000),
    })
    .refine((d) => d.resolution !== 'split' || d.vendorAmount !== undefined, {
        message: 'vendorAmount is required for a split',
        path: ['vendorAmount'],
    });