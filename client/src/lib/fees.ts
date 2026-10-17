const TIER_LIMIT = 20_000_000; // ₦200,000
const BASE_RATE = 0.025;
const FLAT_FEE = 30_000; // ₦300
const OVER_TIER_RATE = 0.005;
const MAX_FEE = 2_000_000; // ₦20,000

export function calculatePlatformFee(itemAmount: number): number {
    if (itemAmount <= 0) return 0;
    let fee = Math.round(Math.min(itemAmount, TIER_LIMIT) * BASE_RATE) + FLAT_FEE;
    if (itemAmount > TIER_LIMIT) fee += Math.round((itemAmount - TIER_LIMIT) * OVER_TIER_RATE);
    return Math.min(fee, MAX_FEE);
}