import { useEffect, useState } from 'react';
import { getHandover, type Handover } from '../../api/buyer';
import { ApiError } from '../../api/client';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import FormError from '../ui/FormError';

export default function CodePanel({ reference, token }: { reference: string; token: string }) {
    const [data, setData] = useState<Handover | null>(null);
    const [error, setError] = useState('');
    const [shown, setShown] = useState(false);

    useEffect(() => {
        let stale = false;
        getHandover(reference, token)
            .then((d) => {
                if (!stale) setData(d);
            })
            .catch((err) => {
                if (!stale) setError(err instanceof ApiError ? err.message : 'Could not load your code.');
            });
        return () => {
            stale = true;
        };
    }, [reference, token]);

    return (
        <section aria-labelledby="code-title" className="rounded-card bg-ink p-6 text-white md:p-8">
            <Chip>Only you can see this</Chip>
            <h2 id="code-title" className="mt-4 text-[28px]">
                Your delivery code
            </h2>
            <p className="mt-1 text-night-mute">Show it only when your item is in your hands and you're happy with it.</p>

            {error ? (
                <div className="mt-6">
                    <FormError message={error} />
                </div>
            ) : !data ? (
                <div className="mt-6 h-12 animate-pulse rounded-btn bg-night" aria-hidden="true" />
            ) : !shown ? (
                <Button onClick={() => setShown(true)} className="mt-6 w-full">
                    Show my code
                </Button>
            ) : (
                <div className="mt-6 grid gap-5">
                    <div className="mx-auto rounded-[20px] bg-white p-3">
                        <img src={data.qrImage} alt="Your delivery QR code" className="h-auto w-[min(260px,70vw)]" />
                    </div>
                    <div>
                        <p className="text-center text-sm text-night-mute">No signal? Read out this PIN instead.</p>
                        <div className="mt-2 flex justify-center gap-2">
                            {data.pin.split('').map((digit, i) => (
                                <span
                                    key={i}
                                    className="grid h-14 w-12 place-items-center rounded-xl bg-leaf font-display text-[26px] font-bold text-ink"
                                >
                                    {digit}
                                </span>
                            ))}
                        </div>
                    </div>
                    <Button variant="outline" onClick={() => setShown(false)}>
                        Hide code
                    </Button>
                </div>
            )}

            <p className="mt-5 text-sm text-night-mute">
                Anyone who has this code can release your payment. Turn your screen brightness up so it scans easily.
            </p>
        </section>
    );
}