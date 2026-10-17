const key = (orderId: string) => `vp_rider_${orderId}`;

export const riderLink = {
    get(orderId: string): string | null {
        try {
            return localStorage.getItem(key(orderId));
        } catch {
            return null;
        }
    },
    set(orderId: string, url: string) {
        try {
            localStorage.setItem(key(orderId), url);
        } catch {
            // storage can be blocked in private browsing
        }
    },
};