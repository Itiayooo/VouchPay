import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getOrder, verifyPayment, type PublicOrder } from '../api/buyer';
import { ApiError } from '../api/client';
import BuyerActions from '../components/buyer/BuyerActions';
import BuyerLayout from '../components/buyer/BuyerLayout';
import CodePanel from '../components/buyer/CodePanel';
import DisputeCard from '../components/buyer/DisputeCard';
import OrderSummary from '../components/buyer/OrderSummary';
import PayCard from '../components/buyer/PayCard';
import StatusNote from '../components/buyer/StatusNote';
import Button, { buttonStyles } from '../components/ui/Button';
import FormError from '../components/ui/FormError';
import { buyerToken } from '../lib/buyerToken';

// Statuses where something can still change, so the page keeps checking
const LIVE = [
    'funded',
    'in_transit',
    'delivered',
    'disputed',
    'release_pending',
    'release_failed',
    'refund_pending',
    'refund_failed',
];
const HAS_CODE = ['funded', 'in_transit', 'delivered'];
const DISPUTE_STATUSES = [
    'disputed',
    'release_pending',
    'release_failed',
    'released',
    'refund_pending',
    'refund_failed',
    'refunded',
];

type Phase = 'loading' | 'confirming' | 'ready' | 'missing' | 'error';

export default function PayPage() {
    const { reference = '' } = useParams();

    // Paystack sends the buyer back with ?trxref=...&reference=... after payment
    const [cameBack] = useState(() => {
        const q = new URLSearchParams(window.location.search);
        return q.has('trxref') || q.has('reference');
    });

    const [order, setOrder] = useState<PublicOrder | null>(null);
    const [phase, setPhase] = useState<Phase>(cameBack ? 'confirming' : 'loading');
    const [error, setError] = useState('');

    const load = useCallback(
        async (quiet = false) => {
            try {
                setOrder(await getOrder(reference));
                setPhase('ready');
            } catch (err) {
                if (err instanceof ApiError && err.status === 404) setPhase('missing');
                else if (!quiet) {
                    setError(err instanceof ApiError ? err.message : 'Could not load this order.');
                    setPhase('error');
                }
            }
        },
        [reference]
    );

    useEffect(() => {
        let stale = false;
        (async () => {
            if (cameBack) {
                try {
                    await verifyPayment(reference);
                } catch {
                    // the page below shows where things stand
                }
                window.history.replaceState(null, '', window.location.pathname);
            }
            if (!stale) await load();
        })();
        return () => {
            stale = true;
        };
    }, [reference, cameBack, load]);

    const live = order ? LIVE.includes(order.status) : false;
    useEffect(() => {
        if (!live) return;
        const id = setInterval(() => {
            if (!document.hidden) void load(true);
        }, 20_000);
        return () => clearInterval(id);
    }, [live, load]);

    async function checkAgain() {
        setPhase('confirming');
        try {
            await verifyPayment(reference);
        } catch {
            // ignore, we reload below
        }
        await load();
    }

    if (phase === 'loading') {
        return (
            <BuyerLayout>
                <div className="h-[320px] animate-pulse rounded-card bg-line/70" aria-hidden="true" />
            </BuyerLayout>
        );
    }

    if (phase === 'confirming') {
        return (
            <BuyerLayout>
                <section role="status" className="flex items-center gap-4 rounded-card bg-white p-6 md:p-8">
                    <span className="h-7 w-7 shrink-0 animate-spin rounded-full border-[3px] border-line border-t-forest" aria-hidden="true" />
                    <p className="font-semibold">Confirming your payment…</p>
                </section>
            </BuyerLayout>
        );
    }

    if (phase === 'missing') {
        return (
            <BuyerLayout>
                <section className="rounded-card bg-white p-6 md:p-8">
                    <h1 className="text-[28px]">We couldn't find that order</h1>
                    <p className="mt-2 max-w-[32em] text-mute">
                        Check the reference in the link the seller sent you, or ask them for a fresh link.
                    </p>
                    <Link to="/track" className={`${buttonStyles('primary', 'sm')} mt-5`}>
                        Track an order
                    </Link>
                </section>
            </BuyerLayout>
        );
    }

    if (phase === 'error' || !order) {
        return (
            <BuyerLayout>
                <section className="grid gap-4 rounded-card bg-white p-6 md:p-8">
                    <FormError message={error || 'Could not load this order.'} />
                    <div>
                        <Button variant="outline" size="sm" onClick={() => void load()}>
                            Try again
                        </Button>
                    </div>
                </section>
            </BuyerLayout>
        );
    }

    const expired = order.status === 'pending_payment' && new Date(order.paymentExpiresAt) < new Date();
    const status = expired ? 'expired' : order.status;
    const token = buyerToken.get(reference);

    return (
        <BuyerLayout>
            <OrderSummary order={order} />

            {status === 'pending_payment' ? (
                <PayCard order={order} unpaidNotice={cameBack} onCheckAgain={checkAgain} />
            ) : (
                <>
                    <StatusNote order={order} status={status} />
                    {token && DISPUTE_STATUSES.includes(status) && <DisputeCard reference={order.reference} token={token} />}
                    {HAS_CODE.includes(status) &&
                        (token ? (
                            <>
                                <CodePanel reference={order.reference} token={token} />
                                <BuyerActions order={order} token={token} onChanged={() => load(true)} />
                            </>
                        ) : (
                            <section className="rounded-card bg-mint p-6 md:p-8">
                                <h2 className="text-[22px]">Open this page on the device you paid with</h2>
                                <p className="mt-1 max-w-[34em] text-mute">
                                    Your delivery code is kept on the phone or browser you paid from, so only that device can show it,
                                    cancel the order or confirm delivery.
                                </p>
                            </section>
                        ))}
                </>
            )}
        </BuyerLayout>
    );
}