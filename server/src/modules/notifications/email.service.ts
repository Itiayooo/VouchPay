import nodemailer, { Transporter } from 'nodemailer';

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
    if (transporter !== undefined) return transporter;
    const host = process.env.SMTP_HOST;
    if (!host) {
        transporter = null;
        return null;
    }
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    return transporter;
}

// Never throws: a failed email must never break an order
export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }) {
    const t = getTransporter();
    if (!t) {
        console.log(`\n[email not sent, SMTP is not set up] to: ${msg.to}\nsubject: ${msg.subject}\n${msg.text}\n`);
        return;
    }
    try {
        await t.sendMail({ from: process.env.EMAIL_FROM || 'VouchPay <no-reply@vouchpay.test>', ...msg });
    } catch (err) {
        console.error(`[email] could not send "${msg.subject}" to ${msg.to}`, err);
    }
}