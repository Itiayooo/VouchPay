// All amounts are in kobo (₦1 = 100 kobo)
const TIER_LIMIT = 20_000_000; // ₦200,000
const BASE_RATE = 0.025; // 2.5%
const FLAT_FEE = 30_000; // ₦300
const OVER_TIER_RATE = 0.005; // 0.5% on the portion above ₦200,000
const MAX_FEE = 2_000_000; // ₦20,000

export function calculatePlatformFee(itemAmount: number): number {
    const tierPart = Math.min(itemAmount, TIER_LIMIT);
    let fee = Math.round(tierPart * BASE_RATE) + FLAT_FEE;
    if (itemAmount > TIER_LIMIT) {
        fee += Math.round((itemAmount - TIER_LIMIT) * OVER_TIER_RATE);
    }
    return Math.min(fee, MAX_FEE);
}

export function calculateAmounts(itemAmount: number, deliveryFee: number) {
    const platformFee = calculatePlatformFee(itemAmount);
    const totalAmount = itemAmount + deliveryFee;
    const vendorPayout = totalAmount - platformFee;
    return { platformFee, totalAmount, vendorPayout };
}

export const toKobo = (naira: number): number => Math.round(naira * 100);