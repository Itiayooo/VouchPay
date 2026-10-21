import { useState, type FormEvent } from 'react';
import { cancelOrder, confirmReceipt, openDispute, type PublicOrder } from '../../api/buyer';
import { ApiError } from '../../api/client';
import Button from '../ui/Button';
import FormError from '../ui/FormError';
import SelectField from '../ui/SelectField';
import TextAreaField from '../ui/TextAreaField';
// import { getBuyerSignature } from '../../api/uploads';
// import PhotoPicker from '../ui/PhotoPicker';

const REASONS = [
    { value: 'not_as_described', label: 'Not as described' },
    { value: 'wrong_item', label: 'Wrong item' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'fake', label: 'Fake or counterfeit' },
    { value: 'not_received', label: 'I never got it' },
    { value: 'changed_mind', label: 'I changed my mind' },
    { value: 'other', label: 'Something else' },
];

type Panel = null | 'cancel' | 'confirm' | 'dispute';

interface Props {
    order: PublicOrder;
    token: string;
    onChanged: () => Promise<void>;
}

export default function BuyerActions({ order, token, onChanged }: Props) {
    const [panel, setPanel] = useState<Panel>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [fieldErrors, setFieldErrors] = useState<{ reason?: string; description?: string }>({});
    const [photos] = useState<string[]>([]);
    // const [photos, setPhotos] = useState<string[]>([]);
    // const [uploading, setUploading] = useState(false);

    const beforeShipping = order.status === 'funded';

    async function run(action: () => Promise<unknown>) {
        setBusy(true);
        setError('');
        try {
            await action();
            setPanel(null);
            await onChanged();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
            void onChanged(); // the order may have just changed, so refresh what the page shows
        } finally {
            setBusy(false);
        }
    }

    function submitDispute(e: FormEvent) {
        e.preventDefault();
        const found: { reason?: string; description?: string } = {};
        if (!reason) found.reason = 'Choose what went wrong.';
        if (description.trim().length < 10) found.description = 'Tell us a bit more, at least 10 characters.';
        setFieldErrors(found);
        if (Object.keys(found).length) return;
        void run(() => openDispute(order.reference, token, { reason, description: description.trim(), evidence: photos }));
    }

    const open = (p: Panel) => {
        setError('');
        setPanel(p);
    };

    return (
        <section className="rounded-card bg-white p-6 md:p-8">
            <h2 className="text-[24px]">{beforeShipping ? 'Changed your mind?' : 'Got your item?'}</h2>
            <p className="mt-1 text-mute">
                {beforeShipping
                    ? 'You can cancel for a full refund until the seller ships.'
                    : order.deliveryType === 'local'
                        ? 'You can also just show your code to the person delivering.'
                        : "Collect it, check it, then let us know."}
            </p>

            <div className="mt-5 grid gap-4">
                <FormError message={error} />

                {panel === null && (
                    <div className="flex flex-wrap gap-3">
                        {beforeShipping ? (
                            <Button variant="outline" onClick={() => open('cancel')}>
                                Cancel order
                            </Button>
                        ) : (
                            <>
                                <Button onClick={() => open('confirm')}>I've received it</Button>
                                <Button variant="outline" onClick={() => open('dispute')}>
                                    Something's wrong
                                </Button>
                            </>
                        )}
                    </div>
                )}

                {panel === 'cancel' && (
                    <div className="grid gap-4 rounded-btn bg-mint p-4">
                        <p>Cancel this order? You get a full refund, delivery included. This can't be undone.</p>
                        <div className="flex flex-wrap gap-3">
                            <Button variant="dark" size="sm" loading={busy} onClick={() => run(() => cancelOrder(order.reference, token))}>
                                Yes, cancel and refund
                            </Button>
                            <Button variant="outline" size="sm" disabled={busy} onClick={() => setPanel(null)}>
                                Keep my order
                            </Button>
                        </div>
                    </div>
                )}

                {panel === 'confirm' && (
                    <div className="grid gap-4 rounded-btn bg-mint p-4">
                        <p>Only confirm if you have the item and you're happy with it. The seller is paid straight away and this can't be undone.</p>
                        <div className="flex flex-wrap gap-3">
                            <Button size="sm" loading={busy} onClick={() => run(() => confirmReceipt(order.reference, token))}>
                                Yes, pay the seller
                            </Button>
                            <Button variant="outline" size="sm" disabled={busy} onClick={() => setPanel(null)}>
                                Not yet
                            </Button>
                        </div>
                    </div>
                )}

                {panel === 'dispute' && (
                    <form onSubmit={submitDispute} noValidate className="grid gap-4 rounded-btn bg-mint p-4">
                        <p>Your money stays locked while a mediator reviews both sides. Don't show your code to anyone.</p>
                        <SelectField
                            label="What went wrong?"
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                setFieldErrors((f) => ({ ...f, reason: undefined }));
                            }}
                            error={fieldErrors.reason}
                            hint={
                                reason === 'changed_mind'
                                    ? 'If the mediator agrees, the seller keeps the delivery fee and the rest is refunded to you.'
                                    : undefined
                            }
                        >
                            <option value="">Choose a reason</option>
                            {REASONS.map((r) => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </SelectField>
                        <TextAreaField
                            label="Tell us what happened"
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value);
                                setFieldErrors((f) => ({ ...f, description: undefined }));
                            }}
                            error={fieldErrors.description}
                            hint="Keep your photos and chats. You can share them if the mediator asks."
                            maxLength={1000}
                        />
                        Tell us what happened
                        <div className="flex flex-wrap gap-3">
                            <Button type="submit" variant="dark" size="sm" loading={busy}>
                                Open dispute
                            </Button>
                            <Button variant="outline" size="sm" disabled={busy} onClick={() => setPanel(null)}>
                                Go back
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </section>
    );
}