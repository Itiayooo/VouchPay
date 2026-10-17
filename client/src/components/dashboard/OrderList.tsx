import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { listTransactions } from '../../api/transactions';
import type { Paginated, Transaction } from '../../api/types';
import { formatDate } from '../../lib/date';
import { formatNaira } from '../../lib/money';
import { useDebounce } from '../../lib/useDebounce';
import Button, { buttonStyles } from '../ui/Button';
import FormError from '../ui/FormError';
import StatusBadge from '../ui/StatusBadge';

const FILTERS = [
    { value: '', label: 'All' },
    { value: 'funded', label: 'Ready to ship' },
    { value: 'in_transit', label: 'Shipped' },
    { value: 'pending_payment', label: 'Awaiting payment' },
    { value: 'disputed', label: 'In dispute' },
    { value: 'released', label: 'Paid out' },
    { value: 'release_failed', label: 'Payout failed' },
    { value: 'refunded', label: 'Refunded' },
];

const NO_PAYOUT = ['cancelled', 'expired', 'refunded', 'refund_pending', 'refund_failed'];

function OrderRow({ t }: { t: Transaction }) {
    return (
        <li>
            <Link
                to={`/orders/${t.id}`}
                className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-mint/60 md:flex-row md:items-center md:gap-6 md:px-6"
            >
                <div className="min-w-0 md:flex-[2]">
                    <p className="truncate font-semibold">{t.itemDescription}</p>
                    <p className="truncate text-sm text-mute">{t.buyer.name}</p>
                </div>
                <p className="text-sm text-mute md:flex-1">
                    {t.reference}
                    <span className="block">{formatDate(t.createdAt)}</span>
                </p>
                <div className="flex items-center justify-between gap-3 md:contents">
                    <div className="md:w-[210px]">
                        <StatusBadge status={t.status} />
                    </div>
                    <div className="text-right md:w-[130px]">
                        <p className="font-display text-[20px] leading-tight font-medium tracking-[-0.03em]">
                            {formatNaira(t.itemAmount)}
                        </p>
                        {!NO_PAYOUT.includes(t.status) && (
                            <p className="text-[13px] text-mute">You get {formatNaira(t.vendorPayout)}</p>
                        )}
                    </div>
                </div>
            </Link>
        </li>
    );
}

function Skeleton() {
    return (
        <ul className="divide-y divide-line border-t border-line" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
                <li key={i} className="px-5 py-5 md:px-6">
                    <div className="h-10 animate-pulse rounded-lg bg-line/70" />
                </li>
            ))}
        </ul>
    );
}

interface Props {
    status: string;
    onStatusChange: (status: string) => void;
    counts?: Record<string, number>;
}

export default function OrderList({ status, onStatusChange, counts }: Props) {
    const [search, setSearch] = useState('');
    const debounced = useDebounce(search.trim());
    const [page, setPage] = useState(1);
    const [reload, setReload] = useState(0);
    const [data, setData] = useState<Paginated<Transaction> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setPage(1);
    }, [status, debounced]);

    useEffect(() => {
        let stale = false;
        setLoading(true);
        setError('');
        listTransactions({ page, limit: 10, status: status || undefined, search: debounced || undefined })
            .then((d) => {
                if (stale) return;
                setData(d);
                setLoading(false);
            })
            .catch((err) => {
                if (stale) return;
                setError(err instanceof ApiError ? err.message : 'Could not load your orders.');
                setLoading(false);
            });
        return () => {
            stale = true;
        };
    }, [page, status, debounced, reload]);

    const totalCount = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
    const filtered = Boolean(status || debounced);

    function clearFilters() {
        setSearch('');
        onStatusChange('');
    }

    return (
        <section id="orders" aria-labelledby="orders-title" className="rounded-card bg-white">
            <div className="grid gap-4 p-5 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 id="orders-title" className="text-[28px]">Orders</h2>
                    <input
                        type="search"
                        aria-label="Search orders"
                        placeholder="Search by item, buyer or reference"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-11 w-full rounded-btn border-[1.5px] border-line bg-white px-4 text-base placeholder:text-mute/60 focus:border-ink md:w-[320px]"
                    />
                </div>

                <div
                    role="group"
                    aria-label="Filter by status"
                    className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {FILTERS.map((f) => {
                        const n = f.value === '' ? totalCount : counts?.[f.value] ?? 0;
                        const active = status === f.value;
                        return (
                            <button
                                key={f.value}
                                type="button"
                                aria-pressed={active}
                                onClick={() => onStatusChange(f.value)}
                                className={`shrink-0 rounded-full px-4 py-2 text-[14.5px] font-semibold transition-colors ${active ? 'bg-ink text-white' : 'bg-mint text-ink hover:bg-line'
                                    }`}
                            >
                                {f.label}
                                {n > 0 && <span className="ml-1.5 opacity-70">{n}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div aria-live="polite">
                {error ? (
                    <div className="grid gap-3 border-t border-line p-6">
                        <FormError message={error} />
                        <div>
                            <Button variant="outline" size="sm" onClick={() => setReload((k) => k + 1)}>
                                Try again
                            </Button>
                        </div>
                    </div>
                ) : !data ? (
                    <Skeleton />
                ) : data.items.length === 0 ? (
                    <div className="grid justify-items-start gap-3 border-t border-line p-6 md:p-8">
                        {filtered ? (
                            <>
                                <p className="text-mute">No orders match that search or filter.</p>
                                <Button variant="outline" size="sm" onClick={clearFilters}>
                                    Clear filters
                                </Button>
                            </>
                        ) : (
                            <>
                                <h3 className="text-[24px]">No orders yet</h3>
                                <p className="max-w-[30em] text-mute">
                                    Create a link with the item price and delivery fee, share it in any chat, and it shows up here as soon
                                    as the buyer opens it.
                                </p>
                                <Link to="/orders/new" className={buttonStyles('primary', 'sm')}>
                                    Create your first link
                                </Link>
                            </>
                        )}
                    </div>
                ) : (
                    <ul className={`divide-y divide-line border-t border-line transition-opacity ${loading ? 'opacity-60' : ''}`}>
                        {data.items.map((t) => (
                            <OrderRow key={t.id} t={t} />
                        ))}
                    </ul>
                )}
            </div>

            {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 border-t border-line p-5 md:px-6">
                    <p className="text-sm text-mute">
                        Page {data.page} of {data.totalPages}, {data.total} orders
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= data.totalPages || loading}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </section>
    );
}