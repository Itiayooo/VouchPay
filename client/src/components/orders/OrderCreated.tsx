import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Transaction } from '../../api/types';
import { formatNaira } from '../../lib/money';
import { whatsappUrl } from '../../lib/share';
import Button, { buttonStyles } from '../ui/Button';
import Chip from '../ui/Chip';

interface Props {
    transaction: Transaction;
    onReset: () => void;
}

export default function OrderCreated({ transaction: t, onReset }: Props) {
    const [copied, setCopied] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const firstName = t.buyer.name.trim().split(/\s+/)[0];

    const message =
        `Hi ${firstName}, here is your VouchPay link for ${t.itemDescription}: ${t.escrowLink}\n\n` +
        `Total: ${formatNaira(t.totalAmount)}. Your money is held safely and only goes to me once you confirm you received the item.`;

    async function copy() {
        try {
            await navigator.clipboard.writeText(t.escrowLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            inputRef.current?.select(); // clipboard blocked: select it so Ctrl+C works
        }
    }

    return (
        <div className="mx-auto grid max-w-[680px] gap-6">
            <section className="rounded-card bg-ink p-6 text-white md:p-8">
                <Chip>Link created</Chip>
                <h1 className="mt-4 text-[clamp(32px,5vw,48px)] font-medium tracking-[-0.05em]">Send this to {firstName}</h1>
                <p className="mt-2 text-night-mute">{t.itemDescription}</p>

                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                    <input
                        ref={inputRef}
                        readOnly
                        aria-label="Escrow link"
                        value={t.escrowLink}
                        onFocus={(e) => e.currentTarget.select()}
                        className="h-[52px] min-w-0 flex-1 rounded-btn border-[1.5px] border-night-line bg-night px-4 text-white focus:border-leaf"
                    />
                    <Button onClick={copy}>{copied ? 'Copied' : 'Copy link'}</Button>
                </div>
                <span className="sr-only" aria-live="polite">
                    {copied ? 'Link copied' : ''}
                </span>

                <a
                    href={whatsappUrl(t.buyer.phone, message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${buttonStyles('outline')} mt-3 w-full`}
                >
                    Send to {firstName} on WhatsApp
                </a>
            </section>

            <section className="rounded-card bg-white p-6 md:p-8">
                <dl className="grid gap-3">
                    <div className="flex justify-between gap-4">
                        <dt className="text-mute">Buyer pays</dt>
                        <dd className="font-display text-[22px] font-medium">{formatNaira(t.totalAmount)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="text-mute">You receive</dt>
                        <dd className="font-display text-[22px] font-medium">{formatNaira(t.vendorPayout)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="text-mute">Reference</dt>
                        <dd className="font-semibold">{t.reference}</dd>
                    </div>
                </dl>

                <p className="mt-6 border-t border-line pt-5 text-mute">
                    When {firstName} pays, this order moves to "Paid, ready to ship" on your dashboard. Only ship after that. The
                    link works for 7 days.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                    <Link to={`/orders/${t.id}`} className={buttonStyles('primary', 'sm')}>
                        View order
                    </Link>
                    <Button variant="outline" size="sm" onClick={onReset}>
                        Create another link
                    </Button>
                    <Link to="/dashboard" className="px-3 py-2.5 text-[15.5px] font-semibold text-forest underline">
                        Back to dashboard
                    </Link>
                </div>
            </section>
        </div>
    );
}