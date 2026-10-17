export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export const cleanPhone = (v: string) => v.replace(/[\s-]/g, '');

export const isNgPhone = (v: string) => /^(\+?234|0)[789][01]\d{8}$/.test(cleanPhone(v));

// The server reports validation problems as "field: message; field: message"
export function serverFieldErrors(message: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const part of message.split('; ')) {
        const i = part.indexOf(': ');
        const key = part.slice(0, i);
        if (i > 0 && /^[a-zA-Z.]+$/.test(key)) out[key] = part.slice(i + 2);
    }
    return out;
}