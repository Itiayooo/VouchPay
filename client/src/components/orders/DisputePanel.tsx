import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { respondToDispute } from '../../api/transactions';
import { getVendorSignature } from '../../api/uploads';
import type { Transaction } from '../../api/types';
import { REASONS, RESOLUTIONS } from '../../lib/disputes';
import { formatDateTime } from '../../lib/date';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import FormError from '../ui/FormError';
import PhotoPicker from '../ui/PhotoPicker';
import TextAreaField from '../ui/TextAreaField';
import EvidenceGallery from './EvidenceGallery';

export default function DisputePanel({ t, onChanged }: { t: Transaction; onChanged: () => Promise<void> }) {
    const d = t.dispute;
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(d?.vendorResponse ?? '');
    const [photos, setPhotos] = useState<string[]>(d?.vendorEvidence ?? []);
    const [uploading, setUploading] = useState(false);
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
            await respondToDispute(t.id, text.trim(), photos);
            setEditing(false);
            await onChanged();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
        } finally {
            setBusy(false);
        }
    }

    const sellerSide = d.vendorResponse ? (
        <div className="rounded-btn bg-mint p-4">
            <p className="text-sm text-mute">The seller's side</p>
            <p className="mt-1">{d.vendorResponse}</p>
            <EvidenceGallery urls={d.vendorEvidence} />
        </div>
    ) : null;

    return (
        <section aria-labelledby="dispute-title" className="rounded-card bg-white p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
                <h2 id="dispute-title" className="text-[26px]">Dispute</h2>
                <Chip tone={open ? 'alert' : 'muted'}>{open ? 'Open' : 'Resolved'}</Chip>
            </div>

            <div className="mt-4 rounded-btn bg-mint p-4">
                <p className="text-sm text-mute">The buyer's side{d.raisedAt ? `, ${formatDateTime(d.raisedAt)}` : ''}</p>
                <p className="mt-1 font-semibold">{REASONS[d.reason ?? ''] ?? d.reason}</p>
                <p className="mt-1">{d.description}</p>
                <EvidenceGallery urls={d.evidence} />
            </div>

            {open && (
                <div className="mt-5">
                    {d.vendorResponse && !editing ? (
                        <div className="grid gap-3">
                            {sellerSide}
                            <div>
                                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                                    Edit the seller's response
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={submit} noValidate className="grid gap-4">
                            <FormError message={error} />
                            <TextAreaField
                                label="The seller's side of the story"
                                hint="Say what happened and what was sent. The mediator reads both sides before deciding."
                                value={text}
                                maxLength={1000}
                                onChange={(e) => {
                                    setText(e.target.value);
                                    setFieldError('');
                                }}
                                error={fieldError}
                            />
                            <PhotoPicker
                                label="Photos (optional)"
                                hint="Proof of what you sent, like the packed item, a receipt or the chat."
                                value={photos}
                                onChange={setPhotos}
                                getSignature={() => getVendorSignature(t.id)}
                                onBusyChange={setUploading}
                                disabled={busy}
                            />
                            <div className="flex gap-3">
                                <Button type="submit" size="sm" loading={busy} disabled={uploading}>
                                    Send response
                                </Button>
                                <Button type="submit" variant="dark" size="sm" loading={busy} disabled={uploading}></Button>
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
                    {sellerSide}
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