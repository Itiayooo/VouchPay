import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { retryRefund } from '../api/admin';
import { ApiError } from '../api/client';
import { getTransaction, retryPayout } from '../api/transactions';
import type { Transaction } from '../api/types';
import ResolveForm from '../components/admin/ResolveForm';
import DisputePanel from '../components/orders/DisputePanel';
import OrderTimeline from '../components/orders/OrderTimeline';
import Button, { buttonStyles } from '../components/ui/Button';
import FormError from '../components/ui/FormError';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDateTime } from '../lib/date';
import { formatNaira } from '../lib/money';

const LIVE = ['funded', 'in_transit', 'delivered', 'release_pending', 'refund_pending'];

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex justify-between gap-4">
            <dt className="text-mute">{label}</dt>
            <dd className="text-right">{children}</dd>
        </div>
    );
}

function RetryPanel({ t, onChanged }: { t: Transaction; onChanged: () => Promise<void> }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const payout = t.status === 'release_failed' || t.status === 'release_pending';
    const refund = t.status === 'refund_failed' || t.status === 'refund_pending';
    if (!payout && !refund) return null;

    const reason = payout ? t.payoutFailureReason : t.refundFailureReason;
    const failed = t.status === 'release_failed' || t.status === 'refund_failed';

    async function run() {
        setBusy(true);
        setError('');
        try {
            await (payout ? retryPayout(t.id) : retryRefund(t.id));
            await onChanged();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="rounded-card bg-white p-6 md:p-8">
            <h2 className="text-[24px]">{payout ? 'Payout' : 'Refund'} {failed ? 'failed' : 'in progress'}</h2>
            {reason && <p className="mt-1 text-mute">Reason: {reason}</p>}
            <p className="mt-2 max-w-[36em] text-mute">
                Retrying asks Paystack what really happened first, so it can't send the money twice.
            </p>
            <div className="mt-4 grid gap-3">
                <FormError message={error} />
                <div>
                    <Button size="sm" loading={busy} onClick={run}>
                        {failed ? `Retry ${payout ? 'payout' : 'refund'}` : 'Check status with Paystack'}
                    </Button>
                </div>
            </div>
        </section>
    );
}

export default function AdminOrder() {
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
        <Link to="/admin" className="text-[15px] font-semibold text-forest underline">
            Back to admin
        </Link>
    );

    if (state === 'loading') return <div className="h-[360px] animate-pulse rounded-card bg-line/70" aria-hidden="true" />;

    if (state === 'missing') {
        return (
            <div className="grid max-w-[560px] gap-4 rounded-card bg-white p-6 md:p-8">
                <h1 className="text-[28px]">We couldn't find that order</h1>
                <Link to="/admin" className={`${buttonStyles('primary', 'sm')} w-fit`}>
                    Back to admin
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

    const vendor = typeof t.vendor === 'object' ? t.vendor : null;
    const openDispute = t.status === 'disputed' && t.dispute?.status === 'open';

    return (
        <div className="mx-auto grid max-w-[760px] gap-6">
            <div className="grid gap-2">
                {back}
                <h1 className="text-[clamp(28px,4.5vw,40px)] font-medium tracking-[-0.05em]">{t.itemDescription}</h1>
                <p className="text-mute">{t.reference}</p>
            </div>

            <section aria-label="Order summary" className="rounded-card bg-ink p-6 text-white md:p-8">
                <StatusBadge status={t.status} />
                <p className="mt-5 text-night-mute">The buyer paid</p>
                <p className="font-display text-[clamp(44px,7vw,68px)] leading-none font-medium tracking-[-0.05em]">
                    {formatNaira(t.totalAmount)}
                </p>
                <dl className="mt-6 grid gap-2 border-t border-night-line pt-5 text-[15px]">
                    <div className="flex justify-between gap-4">
                        <dt className="text-night-mute">Item</dt>
                        <dd>{formatNaira(t.itemAmount)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="text-night-mute">Delivery</dt>
                        <dd>{formatNaira(t.deliveryFee)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="text-night-mute">VouchPay fee, if released in full</dt>
                        <dd>{formatNaira(t.platformFee)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="text-night-mute">Seller receives, if released in full</dt>
                        <dd>{formatNaira(t.vendorPayout)}</dd>
                    </div>
                </dl>
            </section>

            <section aria-labelledby="parties-title" className="rounded-card bg-white p-6 md:p-8">
                <h2 id="parties-title" className="text-[24px]">The two sides</h2>
                <div className="mt-4 grid gap-6 md:grid-cols-2">
                    <div>
                        <p className="text-sm text-mute">Buyer</p>
                        <p className="font-bold">{t.buyer.name}</p>
                        <a href={`tel:${t.buyer.phone}`} className="font-semibold text-forest underline">
                            {t.buyer.phone}
                        </a>
                        {t.buyer.email && <p className="text-sm text-mute">{t.buyer.email}</p>}
                    </div>
                    <div>
                        <p className="text-sm text-mute">Seller</p>
                        <p className="font-bold">{vendor?.businessName ?? 'Unknown'}</p>
                        {vendor?.name && <p className="text-sm text-mute">{vendor.name}</p>}
                        {vendor?.phone && (
                            <a href={`tel:${vendor.phone}`} className="font-semibold text-forest underline">
                                {vendor.phone}
                            </a>
                        )}
                        {vendor?.email && <p className="text-sm text-mute">{vendor.email}</p>}
                    </div>
                </div>
            </section>

            <DisputePanel t={t} onChanged={() => load(true)} />
            {openDispute && <ResolveForm t={t} onChanged={() => load(true)} />}
            <RetryPanel key={t.status} t={t} onChanged={() => load(true)} />

            <section aria-labelledby="details-title" className="rounded-card bg-white p-6 md:p-8">
                <h2 id="details-title" className="text-[24px]">Details</h2>
                <dl className="mt-5 grid gap-3">
                    <Row label="Delivery">{t.deliveryType === 'local' ? 'Local handover' : 'Courier or interstate'}</Row>
                    <Row label="Seller promised to ship within">
                        {t.dispatchWindowDays} {t.dispatchWindowDays === 1 ? 'day' : 'days'}
                    </Row>
                    <Row label="Created">{formatDateTime(t.createdAt)}</Row>
                    {t.paidAt && <Row label="Paid">{formatDateTime(t.paidAt)}</Row>}
                    {t.shippedAt && <Row label="Shipped">{formatDateTime(t.shippedAt)}</Row>}
                    {t.deliveredAt && <Row label="Delivered">{formatDateTime(t.deliveredAt)}</Row>}
                    {t.releasedAt && <Row label="Paid out">{formatDateTime(t.releasedAt)}</Row>}
                    {t.refundAmount ? <Row label="Refunded to buyer">{formatNaira(t.refundAmount)}</Row> : null}
                </dl>
            </section>

            {t.statusHistory && t.statusHistory.length > 0 && <OrderTimeline history={t.statusHistory} />}
        </div>
    );
}