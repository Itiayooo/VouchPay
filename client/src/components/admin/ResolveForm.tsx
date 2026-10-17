import { useState } from 'react';
import { resolveDispute, type ResolveInput } from '../../api/admin';
import { ApiError } from '../../api/client';
import type { Transaction } from '../../api/types';
import { formatNaira } from '../../lib/money';
import Button from '../ui/Button';
import FormError from '../ui/FormError';
import MoneyField from '../ui/MoneyField';
import TextAreaField from '../ui/TextAreaField';

type Resolution = ResolveInput['resolution'];

const OPTIONS: { value: Resolution; title: string; text: string }[] = [
    { value: 'refund_full', title: 'Refund the buyer in full', text: 'The buyer gets everything back, delivery included. The seller gets nothing and pays no fee.' },
    { value: 'refund_keep_delivery', title: 'Refund the buyer, seller keeps the delivery fee', text: 'For "changed my mind" cases. The rider was already paid for the trip.' },
    { value: 'release_full', title: 'Release to the seller in full', text: 'The seller is paid as normal and the fee applies.' },
    { value: 'split', title: 'Split', text: 'You choose how much of the total the seller keeps. The rest goes back to the buyer.' },
];

type Outcome = { ok: false; error: string } | { ok: true; buyer: number; seller: number; fee: number };

// Same maths as the server: our fee is scaled to the seller's share
function outcome(t: Transaction, resolution: Resolution, splitDigits: string): Outcome {
    const total = t.totalAmount;
    let share: number;
    if (resolution === 'release_full') share = total;
    else if (resolution === 'refund_full') share = 0;
    else if (resolution === 'refund_keep_delivery') share = t.deliveryFee;
    else {
        if (!splitDigits) return { ok: false, error: '' };
        share = Number(splitDigits) * 100;
        if (share <= 0 || share >= total) {
            return {
                ok: false,
                error: `Enter an amount above ₦0 and below ${formatNaira(total)}. Use a full refund or a full release otherwise.`,
            };
        }
    }
    const fee = share === 0 ? 0 : share === total ? t.platformFee : Math.round((t.platformFee * share) / total);
    return { ok: true, buyer: total - share, seller: share - fee, fee };
}

export default function ResolveForm({ t, onChanged }: { t: Transaction; onChanged: () => Promise<void> }) {
    const [resolution, setResolution] = useState<Resolution | ''>('');
    const [split, setSplit] = useState('');
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState<{ resolution?: string; split?: string; notes?: string }>({});
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const result = resolution ? outcome(t, resolution, split) : null;
    const preview = result?.ok ? result : null;

    function review() {
        const found: typeof errors = {};
        if (!resolution) found.resolution = 'Choose a decision.';
        if (result && !result.ok && resolution === 'split') found.split = result.error || 'Enter how much the seller keeps.';
        if (notes.trim().length < 5) found.notes = 'Write a short note on why. Both sides can see it.';
        setErrors(found);
        if (Object.keys(found).length === 0) setConfirming(true);
    }

    async function apply() {
        if (!resolution) return;
        setBusy(true);
        setError('');
        const input: ResolveInput = {
            resolution,
            mediatorNotes: notes.trim(),
            ...(resolution === 'split' ? { vendorAmount: Number(split) } : {}),
        };
        try {
            await resolveDispute(t.id, input);
            await onChanged();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
            setConfirming(false);
            void onChanged();
        } finally {
            setBusy(false);
        }
    }

    return (
        <section aria-labelledby="resolve-title" className="rounded-card bg-white p-6 md:p-8">
            <h2 id="resolve-title" className="text-[26px]">Your decision</h2>
            <p className="mt-1 max-w-[36em] text-mute">
                This moves real money and can't be undone. Read both sides above first.
            </p>

            <div className="mt-5 grid gap-5">
                <FormError message={error} />

                <fieldset disabled={confirming || busy}>
                    <legend className="mb-2 text-[15px] font-semibold">What should happen to the money?</legend>
                    <div className="grid gap-3">
                        {OPTIONS.map((o) => (
                            <label
                                key={o.value}
                                className="flex cursor-pointer gap-3 rounded-[18px] border-[1.5px] border-line bg-white p-4 has-[:checked]:border-ink has-[:checked]:bg-mint has-[:disabled]:cursor-default has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink"
                            >
                                <input
                                    type="radio"
                                    name="resolution"
                                    value={o.value}
                                    checked={resolution === o.value}
                                    onChange={() => {
                                        setResolution(o.value);
                                        setErrors((e) => ({ ...e, resolution: undefined, split: undefined }));
                                    }}
                                    className="mt-1.5 h-4 w-4 shrink-0 accent-forest"
                                />
                                <span>
                                    <b className="block font-bold">{o.title}</b>
                                    <span className="text-[15px] text-mute">{o.text}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                    {errors.resolution && <p className="mt-2 text-sm text-alert">{errors.resolution}</p>}
                </fieldset>

                {resolution === 'split' && (
                    <MoneyField
                        label="How much of the total does the seller keep, before our fee?"
                        hint={`The buyer paid ${formatNaira(t.totalAmount)} in total.`}
                        placeholder="0"
                        disabled={confirming || busy}
                        value={split}
                        onValueChange={(v) => {
                            setSplit(v);
                            setErrors((e) => ({ ...e, split: undefined }));
                        }}
                        error={errors.split}
                    />
                )}

                {preview && (
                    <div aria-live="polite" className="rounded-btn bg-mint p-4">
                        <p className="text-sm text-mute">What this does</p>
                        <dl className="mt-2 grid gap-1.5">
                            <div className="flex justify-between gap-4">
                                <dt>Refunded to the buyer</dt>
                                <dd className="font-bold">{formatNaira(preview.buyer)}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt>Paid to the seller</dt>
                                <dd className="font-bold">{formatNaira(preview.seller)}</dd>
                            </div>
                            <div className="flex justify-between gap-4 text-mute">
                                <dt>VouchPay fee</dt>
                                <dd>{formatNaira(preview.fee)}</dd>
                            </div>
                        </dl>
                    </div>
                )}

                <TextAreaField
                    label="Your note"
                    hint="Explain the decision in a sentence or two. The buyer and the seller can both read it."
                    disabled={confirming || busy}
                    maxLength={1000}
                    value={notes}
                    onChange={(e) => {
                        setNotes(e.target.value);
                        setErrors((er) => ({ ...er, notes: undefined }));
                    }}
                    error={errors.notes}
                />

                {!confirming ? (
                    <div>
                        <Button onClick={review}>Review my decision</Button>
                    </div>
                ) : (
                    <div className="grid gap-4 rounded-btn bg-ink p-4 text-white">
                        <p>
                            You're about to {OPTIONS.find((o) => o.value === resolution)?.title.toLowerCase()}. Money moves
                            straight away and this can't be undone.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Button size="sm" loading={busy} onClick={apply}>
                                Confirm and apply
                            </Button>
                            <Button variant="outline" size="sm" disabled={busy} onClick={() => setConfirming(false)}>
                                Go back
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}