import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { getTransaction } from '../api/transactions';
import type { Transaction } from '../api/types';
import DisputePanel from '../components/orders/DisputePanel';
import OrderActions from '../components/orders/OrderActions';
import OrderTimeline from '../components/orders/OrderTimeline';
import RiderLink from '../components/orders/RiderLink';
import { nextStep } from '../components/orders/nextStep';
import Button, { buttonStyles } from '../components/ui/Button';
import CopyField from '../components/ui/CopyField';
import FormError from '../components/ui/FormError';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDateTime } from '../lib/date';
import { formatNaira } from '../lib/money';

const LIVE = ['pending_payment', 'funded', 'in_transit', 'delivered', 'disputed', 'release_pending', 'refund_pending'];
const NO_PAYOUT = ['cancelled', 'expired', 'refunded', 'refund_pending', 'refund_failed'];

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex justify-between gap-4">
            <dt className="text-mute">{label}</dt>
            <dd className="text-right">{children}</dd>
        </div>
    );
}

export default function OrderDetail() {
    const { id = '' } = useParams();
    const [t, setT] = useState<Transaction | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
    const [error, setError] = useState('');

    const load = useCallback(
        async (quiet = false) => {
            try {
                setT(await getTransaction(id));
                setState('ready');
            } catch (err) {
                if (err instanceof ApiError && err.status === 404) setState('missing');
                else if (!quiet) {
                    setError(err instanceof ApiError ? err.message : 'Could not load this order.');
                    setState('error');
                }
            }
        },
        [id]
    );

    useEffect(() => {
        void load();
    }, [load]);

    const live = t ? LIVE.includes(t.status) : false;
    useEffect(() => {
        if (!live) return;
        const timer = setInterval(() => {
            if (!document.hidden) void load(true);
        }, 20_000);
        return () => clearInterval(timer);
    }, [live, load]);

    const back = (
        <Link to="/dashboard" className="text-[15px] font-semibold text-forest underline">
            Back to dashboard
        </Link>
    );

    if (state === 'loading') return <div className="h-[360px] animate-pulse rounded-card bg-line/70" aria-hidden="true" />;

    if (state === 'missing') {
        return (
            <div className="grid max-w-[560px] gap-4 rounded-card bg-white p-6 md:p-8">
                <h1 className="text-[28px]">We couldn't find that order</h1>
                <p className="text-mute">It may belong to another account, or the link is wrong.</p>
                <Link to="/dashboard" className={`${buttonStyles('primary', 'sm')} w-fit`}>
                    Back to dashboard
                </Link>
            </div>
        );
    }

    if (state === 'error' || !t) {
        return (
            <div className="grid max-w-[560px] gap-4 rounded-card bg-white p-6 md:p-8">
                <FormError message={error || 'Could not load this order.'} />
                <div>
                    <Button variant="outline" size="sm" onClick={() => void load()}>
                        Try again
                    </Button>
                </div>
            </div>
        );
    }

    const noPayout = NO_PAYOUT.includes(t.status);
    const showRiderLink = t.status === 'in_transit' || t.status === 'delivered';
    const buyer = t.buyer.name.split(/\s+/)[0];

    return (
        <div className="mx-auto grid max-w-[760px] gap-6">
            <div className="grid gap-2">
                {back}
                <h1 className="text-[clamp(28px,4.5vw,40px)] font-medium tracking-[-0.05em]">{t.itemDescription}</h1>
                <p className="text-mute">
                    {t.reference}, for {t.buyer.name}
                </p>
            </div>

            <section aria-label="Order summary" className="rounded-card bg-ink p-6 text-white md:p-8">
                <StatusBadge status={t.status} />
                <p className="mt-5 text-night-mute">{noPayout ? 'Order total' : 'You receive'}</p>
                <p className="font-display text-[clamp(44px,7vw,68px)] leading-none font-medium tracking-[-0.05em]">
                    {formatNaira(noPayout ? t.totalAmount : t.vendorPayout)}
                </p>
                <p className="mt-4 max-w-[36em] text-night-mute" aria-live="polite">
                    {nextStep(t)}
                </p>
                {t.status === 'release_failed' && t.payoutFailureReason && (
                    <p className="mt-2 text-sm text-night-mute">Reason: {t.payoutFailureReason}</p>
                )}
                {!noPayout && (
                    <dl className="mt-6 grid gap-2 border-t border-night-line pt-5 text-[15px]">
                        <div className="flex justify-between gap-4">
                            <dt className="text-night-mute">{buyer} pays</dt>
                            <dd>{formatNaira(t.totalAmount)}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt className="text-night-mute">VouchPay fee</dt>
                            <dd>-{formatNaira(t.platformFee)}</dd>
                        </div>
                    </dl>
                )}
            </section>

            <OrderActions key={t.status} t={t} onChanged={() => load(true)} />
            {showRiderLink && <RiderLink orderId={t.id} reference={t.reference} />}
            <DisputePanel t={t} onChanged={() => load(true)} />

            <section aria-labelledby="details-title" className="rounded-card bg-white p-6 md:p-8">
                <h2 id="details-title" className="text-[24px]">Details</h2>
                {t.status === 'pending_payment' && (
                    <div className="mt-4 grid gap-2">
                        <p className="text-mute">Payment link. Send it to {buyer}.</p>
                        <CopyField value={t.escrowLink} label="Payment link" />
                    </div>
                )}
                <dl className="mt-5 grid gap-3">
                    <Row label="Buyer">{t.buyer.name}</Row>
                    <Row label="Phone">
                        <a href={`tel:${t.buyer.phone}`} className="font-semibold text-forest underline">
                            {t.buyer.phone}
                        </a>
                    </Row>
                    <Row label="Item price">{formatNaira(t.itemAmount)}</Row>
                    <Row label="Delivery fee">{formatNaira(t.deliveryFee)}</Row>
                    <Row label="Delivery">{t.deliveryType === 'local' ? 'Local handover' : 'Courier or interstate'}</Row>
                    <Row label="You ship within">
                        {t.dispatchWindowDays} {t.dispatchWindowDays === 1 ? 'day' : 'days'}
                    </Row>
                    <Row label="Created">{formatDateTime(t.createdAt)}</Row>
                    {t.paidAt && <Row label="Paid">{formatDateTime(t.paidAt)}</Row>}
                    {t.shippedAt && <Row label="Shipped">{formatDateTime(t.shippedAt)}</Row>}
                    {t.deliveredAt && <Row label="Delivered">{formatDateTime(t.deliveredAt)}</Row>}
                    {t.releasedAt && <Row label="Paid out">{formatDateTime(t.releasedAt)}</Row>}
                    {t.notes && <Row label="Your note">{t.notes}</Row>}
                </dl>
            </section>

            {t.statusHistory && t.statusHistory.length > 0 && <OrderTimeline history={t.statusHistory} />}
        </div>
    );
}