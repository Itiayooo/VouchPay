const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const formatNaira = (kobo: number) =>
    '₦' +
    (kobo / 100).toLocaleString('en-NG', {
        minimumFractionDigits: kobo % 100 ? 2 : 0,
        maximumFractionDigits: 2,
    });

export const when = (d: Date) =>
    d.toLocaleString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export interface Mail {
    heading: string;
    lines: string[];
    cta?: { label: string; url: string };
    note?: string;
}

export function render(m: Mail) {
    const paragraphs = m.lines
        .map((l) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#0B1F14">${esc(l)}</p>`)
        .join('');
    const button = m.cta
        ? `<p style="margin:22px 0 6px"><a href="${esc(m.cta.url)}" style="display:inline-block;background:#6BE38A;color:#0B1F14;font-weight:700;text-decoration:none;padding:14px 24px;border-radius:12px">${esc(m.cta.label)}</a></p>`
        : '';
    const note = m.note ? `<p style="margin:14px 0 0;font-size:14px;line-height:1.5;color:#4F6A5A">${esc(m.note)}</p>` : '';

    const html =
        `<div style="background:#F1FCF5;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">` +
        `<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:20px;padding:28px">` +
        `<p style="margin:0 0 18px;font-size:18px;font-weight:700;color:#0B1F14">VouchPay</p>` +
        `<h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;color:#0B1F14">${esc(m.heading)}</h1>` +
        `${paragraphs}${button}${note}</div></div>`;

    const text = [m.heading, '', ...m.lines, m.cta ? `\n${m.cta.label}: ${m.cta.url}` : '', m.note ? `\n${m.note}` : '']
        .filter((x) => x !== '')
        .join('\n');

    return { html, text };
}