// 0801... and +234801... both become 234801..., which is what wa.me expects
export function toWhatsAppNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('234')) return digits;
    if (digits.startsWith('0')) return `234${digits.slice(1)}`;
    return digits;
}

export const whatsappUrl = (phone: string, text: string) =>
    `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(text)}`;