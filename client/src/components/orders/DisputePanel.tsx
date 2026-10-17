import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { respondToDispute } from '../../api/transactions';
import type { Transaction } from '../../api/types';
import { formatDateTime } from '../../lib/date';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import FormError from '../ui/FormError';
import TextAreaField from '../ui/TextAreaField';

const REASONS: Record<string, string> = {
    not_as_described: 'Not as described',
    wrong_item: 'Wrong item',
    damaged: 'Damaged',
    fake: 'Fake or counterfeit',
    not_received: 'Never received it',
    changed_mind: 'Changed their mind',
    other: 'Something else',
};

const RESOLUTIONS: Record<string, string> = {
    refund_full: 'Refunded to the buyer in full',
    refund_keep_delivery: 'Refunded to the buyer, and you keep the delivery fee',
    release_full: 'Released to you in full',
    split: 'Split between you and the buyer',
};

export default function DisputePanel({ t, onChanged }: { t: Transaction; onChanged: () => Promise<void> }) {
    const d = t.dispute;
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(d?.vendorResponse ?? '');
    const [fieldError, setFieldError] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    if (!d?.status) return null;
    const open = d.status === 'open';

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (text.trim().length < 10) {
            setFieldError('Write at least 10 characters.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            await respondToDispute(t.id, text.trim());
            setEditing(false);
            await onChanged();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <section aria-labelledby="dispute-title" className="rounded-card bg-white p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
                <h2 id="dispute-title" className="text-[26px]">Dispute</h2>
                <Chip tone={open ? 'alert' : 'muted'}>{open ? 'Open' : 'Resolved'}</Chip>
            </div>

            <div className="mt-4 rounded-btn bg-mint p-4">
                <p className="text-sm text-mute">
                    The buyer's side{d.raisedAt ? `, ${formatDateTime(d.raisedAt)}` : ''}
                </p>
                <p className="mt-1 font-semibold">{REASONS[d.reason ?? ''] ?? d.reason}</p>
                <p className="mt-1">{d.description}</p>
            </div>

            {open && (
                <div className="mt-5">
                    {d.vendorResponse && !editing ? (
                        <div className="grid gap-3">
                            <div className="rounded-btn bg-mint p-4">
                                <p className="text-sm text-mute">Your side</p>
                                <p className="mt-1">{d.vendorResponse}</p>
                            </div>
                            <div>
                                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                                    Edit my response
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={submit} noValidate className="grid gap-4">
                            <FormError message={error} />
                            <TextAreaField
                                label="Your side of the story"
                                hint="Say what happened and what you sent. The mediator reads both sides before deciding."
                                value={text}
                                maxLength={1000}
                                onChange={(e) => {
                                    setText(e.target.value);
                                    setFieldError('');
                                }}
                                error={fieldError}
                            />
                            <div className="flex gap-3">
                                <Button type="submit" size="sm" loading={busy}>
                                    Send my response
                                </Button>
                                {editing && (
                                    <Button variant="outline" size="sm" disabled={busy} onClick={() => setEditing(false)}>
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </form>
                    )}
                </div>
            )}

            {!open && (
                <div className="mt-5 grid gap-3">
                    {d.vendorResponse && (
                        <div className="rounded-btn bg-mint p-4">
                            <p className="text-sm text-mute">Your side</p>
                            <p className="mt-1">{d.vendorResponse}</p>
                        </div>
                    )}
                    <div className="rounded-btn bg-ink p-4 text-white">
                        <p className="text-sm text-night-mute">The mediator's decision</p>
                        <p className="mt-1 font-semibold">{RESOLUTIONS[d.resolution ?? ''] ?? d.resolution}</p>
                        {d.mediatorNotes && <p className="mt-2 text-night-mute">{d.mediatorNotes}</p>}
                    </div>
                </div>
            )}
        </section>
    );
}