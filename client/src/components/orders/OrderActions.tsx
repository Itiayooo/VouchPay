import { useState } from 'react';
import { ApiError } from '../../api/client';
import { cancelUnpaid, retryPayout, shipOrder, vendorCancel } from '../../api/transactions';
import type { Transaction } from '../../api/types';
import { riderLink } from '../../lib/riderLink';
import Button from '../ui/Button';
import FormError from '../ui/FormError';

type Step = null | 'ship' | 'cancel' | 'cancelUnpaid';

interface Props {
    t: Transaction;
    onChanged: () => Promise<void>;
}

export default function OrderActions({ t, onChanged }: Props) {
    const [step, setStep] = useState<Step>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const buyer = t.buyer.name.split(/\s+/)[0];

    async function run(action: () => Promise<unknown>) {
        setBusy(true);
        setError('');
        try {
            await action();
            setStep(null);
            await onChanged();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
            void onChanged(); // the order may have just changed
        } finally {
            setBusy(false);
        }
    }

    const ship = () =>
        run(async () => {
            const res = await shipOrder(t.id);
            riderLink.set(t.id, res.scanUrl);
        });

    const s = t.status;
    const canCancelPaid = s === 'funded' || s === 'in_transit';
    const showCard = s === 'pending_payment' || canCancelPaid || s === 'release_failed' || s === 'release_pending';
    if (!showCard) return null;

    return (
        <section className="rounded-card bg-white p-6 md:p-8">
            <h2 className="text-[24px]">What you can do</h2>
            <div className="mt-4 grid gap-4">
                <FormError message={error} />

                {step === null && (
                    <div className="flex flex-wrap gap-3">
                        {s === 'funded' && <Button onClick={() => setStep('ship')}>Mark as shipped</Button>}
                        {s === 'pending_payment' && (
                            <Button variant="outline" onClick={() => setStep('cancelUnpaid')}>
                                Cancel this link
                            </Button>
                        )}
                        {canCancelPaid && (
                            <Button variant="outline" onClick={() => setStep('cancel')}>
                                Cancel and refund {buyer}
                            </Button>
                        )}
                        {s === 'release_failed' && (
                            <Button loading={busy} onClick={() => run(() => retryPayout(t.id))}>
                                Retry payout
                            </Button>
                        )}
                        {s === 'release_pending' && (
                            <Button variant="outline" loading={busy} onClick={() => run(() => retryPayout(t.id))}>
                                Check payout status
                            </Button>
                        )}
                    </div>
                )}

                {step === 'ship' && (
                    <div className="grid gap-4 rounded-btn bg-mint p-4">
                        <p>
                            Only mark this as shipped when the item is really on its way. After this {buyer} can't cancel, and
                            you'll get a link for your rider.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Button size="sm" loading={busy} onClick={ship}>
                                Yes, it's shipped
                            </Button>
                            <Button variant="outline" size="sm" disabled={busy} onClick={() => setStep(null)}>
                                Not yet
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'cancel' && (
                    <div className="grid gap-4 rounded-btn bg-mint p-4">
                        <p>Cancel this order? {buyer} gets a full refund and you won't be paid for it. This can't be undone.</p>
                        <div className="flex flex-wrap gap-3">
                            <Button variant="dark" size="sm" loading={busy} onClick={() => run(() => vendorCancel(t.id))}>
                                Yes, cancel and refund
                            </Button>
                            <Button variant="outline" size="sm" disabled={busy} onClick={() => setStep(null)}>
                                Keep the order
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'cancelUnpaid' && (
                    <div className="grid gap-4 rounded-btn bg-mint p-4">
                        <p>Cancel this link? {buyer} won't be able to pay it any more.</p>
                        <div className="flex flex-wrap gap-3">
                            <Button variant="dark" size="sm" loading={busy} onClick={() => run(() => cancelUnpaid(t.id))}>
                                Yes, cancel the link
                            </Button>
                            <Button variant="outline" size="sm" disabled={busy} onClick={() => setStep(null)}>
                                Keep it
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}