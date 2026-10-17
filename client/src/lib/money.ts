export function formatNaira(kobo: number): string {
    const naira = kobo / 100;
    const hasKobo = kobo % 100 !== 0;
    return (
        '₦' +
        naira.toLocaleString('en-NG', {
            minimumFractionDigits: hasKobo ? 2 : 0,
            maximumFractionDigits: 2,
        })
    );
}

export const toKobo = (naira: number) => Math.round(naira * 100);
export const digitsOnly = (v: string) => v.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 9);
export const withCommas = (digits: string) => (digits ? Number(digits).toLocaleString('en-NG') : '');