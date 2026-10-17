const key = (reference: string) => `vp_buyer_${reference.toUpperCase()}`;

export const buyerToken = {
    get(reference: string): string | null {
        try {
            return localStorage.getItem(key(reference));
        } catch {
            return null;
        }
    },
    set(reference: string, token: string) {
        try {
            localStorage.setItem(key(reference), token);
        } catch {
            // private browsing can block storage
        }
    },
};