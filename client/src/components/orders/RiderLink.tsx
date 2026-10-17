import { useState } from 'react';
import { ApiError } from '../../api/client';
import { newRiderLink } from '../../api/transactions';
import { riderLink } from '../../lib/riderLink';
import { whatsappShareUrl } from '../../lib/share';
import Button, { buttonStyles } from '../ui/Button';
import CopyField from '../ui/CopyField';
import FormError from '../ui/FormError';

export default function RiderLink({ orderId, reference }: { orderId: string; reference: string }) {
    const [url, setUrl] = useState(() => riderLink.get(orderId));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    async function fresh() {
        setBusy(true);
        setError('');
        try {
            const { scanUrl } = await newRiderLink(orderId);
            riderLink.set(orderId, scanUrl);
            setUrl(scanUrl);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
        } finally {
            setBusy(false);
        }
    }

    const message = `Delivery link for order ${reference}. Open it when you reach the buyer, then scan their QR code or type their 4-digit PIN: ${url}`;

    return (
        <section aria-labelledby="rider-title" className="rounded-card bg-ink p-6 text-white md:p-8">
            <h2 id="rider-title" className="text-[26px]">Rider link</h2>
            <p className="mt-1 max-w-[36em] text-night-mute">
                Give this to whoever delivers: your rider, a courier, or yourself. At the buyer's door they scan the buyer's QR
                code or type the PIN, and you're paid. No login needed.
            </p>

            <div className="mt-5 grid gap-3">
                <FormError message={error} />
                {url ? (
                    <>
                        <CopyField value={url} label="Rider link" dark />
                        <a
                            href={whatsappShareUrl(message)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${buttonStyles('outline')} w-full`}
                        >
                            Send on WhatsApp
                        </a>
                        <div>
                            <Button variant="outline" size="sm" loading={busy} onClick={fresh}>
                                Get a new link
                            </Button>
                            <p className="mt-2 text-sm text-night-mute">A new link stops the old one from working.</p>
                        </div>
                    </>
                ) : (
                    <div>
                        <p className="mb-3 text-night-mute">This device doesn't have the link saved. Get a fresh one.</p>
                        <Button loading={busy} onClick={fresh}>
                            Get a rider link
                        </Button>
                    </div>
                )}
            </div>
        </section>
    );
}