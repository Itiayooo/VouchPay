import { useEffect, useRef, useState } from 'react';
import { getDispute, type BuyerDispute } from '../../api/buyer';
import { ApiError } from '../../api/client';
import { formatDateTime } from '../../lib/date';
import { REASONS } from '../../lib/disputes';
import { formatNaira } from '../../lib/money';
import EvidenceGallery from '../orders/EvidenceGallery';
import Chip from '../ui/Chip';

const OUTCOME: Record<string, string> = {
    refund_full: 'You were refunded in full',
    refund_keep_delivery: 'You were refunded, and the seller kept the delivery fee',
    release_full: 'The seller was paid in full',
    split: 'The payment was split between you and the seller',
};

export default function DisputeCard({ reference, token }: { reference: string; token: string }) {
    const [data, setData] = useState<BuyerDispute | null>(null);
    const [hidden, setHidden] = useState(false);
    const resolved = useRef(false);

    useEffect(() => {
        let stale = false;
        const load = () =>
            getDispute(reference, token)
                .then((d) => {
                    if (stale) return;
                    resolved.current = d.status === 'resolved';
                    setData(d);
                })
                .catch((err) => {
                    // An order without a dispute simply shows nothing. Other errors keep the last view.
                    if (!stale && err instanceof ApiError && err.status === 404) setHidden(true);
                });

        void load();
        const timer = setInterval(() => {
            if (!document.hidden && !resolved.current) void load();
        }, 30_000);
        return () => {
            stale = true;
            clearInterval(timer);
        };
    }, [reference, token]);

    if (hidden || !data) return null;
    const open = data.status === 'open';

    return (
        <section aria-labelledby="dispute-title" className="rounded-card bg-white p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
                <h2 id="dispute-title" className="text-[26px]">Your dispute</h2>
                <Chip tone={open ? 'alert' : 'muted'}>{open ? 'Open' : 'Resolved'}</Chip>
                {open && data.escalated && <Chip tone="amber">Extended review</Chip>}
            </div>

            {open && data.escalated && (
                <p className="mt-4 rounded-btn bg-sand px-4 py-3 text-amber">
                    This dispute needs extended review, so it will take longer than usual. Your money stays held until it is
                    settled, and we'll email you the outcome. Keep your photos, chats and receipts.
                </p>
            )}

            <div className="mt-4 rounded-btn bg-mint p-4">
                <p className="text-sm text-mute">What you told us{data.raisedAt ? `, ${formatDateTime(data.raisedAt)}` : ''}</p>
                <p className="mt-1 font-semibold">{REASONS[data.reason] ?? data.reason}</p>
                <p className="mt-1 whitespace-pre-wrap">{data.description}</p>
                <EvidenceGallery urls={data.evidence} />
            </div>

            <div className="mt-3 rounded-btn bg-mint p-4">
                <p className="text-sm text-mute">The seller's reply</p>
                {data.vendorResponse ? (
                    <>
                        <p className="mt-1 whitespace-pre-wrap">{data.vendorResponse}</p>
                        <EvidenceGallery urls={data.vendorEvidence} />
                    </>
                ) : (
                    <p className="mt-1 text-mute">The seller hasn't replied yet.</p>
                )}
            </div>

            {!open && data.resolution && (
                <div className="mt-3 rounded-btn bg-ink p-4 text-white">
                    <p className="text-sm text-night-mute">
                        The mediator's decision{data.resolvedAt ? `, ${formatDateTime(data.resolvedAt)}` : ''}
                    </p>
                    <p className="mt-1 font-semibold">{OUTCOME[data.resolution] ?? data.resolution}</p>
                    {data.refundAmount > 0 && (
                        <p className="mt-1 text-night-mute">
                            Refund to you: {formatNaira(data.refundAmount)}. It can take a few days to show up.
                        </p>
                    )}
                    {data.mediatorNotes && <p className="mt-2 whitespace-pre-wrap text-night-mute">{data.mediatorNotes}</p>}
                </div>
            )}
        </section>
    );
}