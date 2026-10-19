import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listDisputes } from '../../api/admin';
import { ApiError } from '../../api/client';
import type { Paginated, Transaction } from '../../api/types';
import { REASONS, RESOLUTIONS } from '../../lib/disputes';
import { timeAgo } from '../../lib/date';
import { formatNaira } from '../../lib/money';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import FormError from '../ui/FormError';

type Tab = 'open' | 'resolved';

export default function DisputeQueue({ openCount }: { openCount: number }) {
    const [tab, setTab] = useState<Tab>('open');
    const [page, setPage] = useState(1);
    const [reload, setReload] = useState(0);
    const [data, setData] = useState<Paginated<Transaction> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let stale = false;
        setLoading(true);
        setError('');
        listDisputes(tab, page)
            .then((d) => {
                if (stale) return;
                setData(d);
                setLoading(false);
            })
            .catch((err) => {
                if (stale) return;
                setError(err instanceof ApiError ? err.message : 'Could not load disputes.');
                setLoading(false);
            });
        return () => {
            stale = true;
        };
    }, [tab, page, reload]);

    function switchTab(next: Tab) {
        setTab(next);
        setPage(1);
        setData(null);
    }

    const tabClass = (active: boolean) =>
        `rounded-full px-4 py-2 text-[14.5px] font-semibold transition-colors ${active ? 'bg-ink text-white' : 'bg-mint text-ink hover:bg-line'
        }`;

    return (
        <section aria-labelledby="queue-title" className="rounded-card bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 md:p-6">
                <h2 id="queue-title" className="text-[28px]">Disputes</h2>
                <div role="group" aria-label="Show" className="flex gap-2">
                    <button type="button" aria-pressed={tab === 'open'} className={tabClass(tab === 'open')} onClick={() => switchTab('open')}>
                        Open{openCount > 0 && <span className="ml-1.5 opacity-70">{openCount}</span>}
                    </button>
                    <button type="button" aria-pressed={tab === 'resolved'} className={tabClass(tab === 'resolved')} onClick={() => switchTab('resolved')}>
                        Resolved
                    </button>
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
                    <div className="border-t border-line p-6" aria-hidden="true">
                        <div className="h-12 animate-pulse rounded-lg bg-line/70" />
                    </div>
                ) : data.items.length === 0 ? (
                    <p className="border-t border-line p-6 text-mute">
                        {tab === 'open' ? 'No open disputes. Nothing is waiting on you.' : 'No resolved disputes yet.'}
                    </p>
                ) : (
                    <ul className={`divide-y divide-line border-t border-line ${loading ? 'opacity-60' : ''}`}>
                        {data.items.map((t) => (
                            <li key={t.id}>
                                <Link
                                    to={`/admin/orders/${t.id}`}
                                    className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-mint/60 md:flex-row md:items-center md:gap-6 md:px-6"
                                >
                                    <div className="min-w-0 md:flex-[2]">
                                        <p className="truncate font-semibold">{t.itemDescription}</p>
                                        <p className="truncate text-sm text-mute">
                                            {t.buyer.name} vs {typeof t.vendor === 'object' ? t.vendor.businessName : 'seller'}
                                        </p>
                                    </div>
                                    <p className="text-sm text-mute md:flex-1">
                                        {tab === 'open'
                                            ? REASONS[t.dispute?.reason ?? ''] ?? 'Dispute'
                                            : (RESOLUTIONS[t.dispute?.resolution ?? ''] ?? 'Resolved').split(',')[0]}
                                        <span className="block">
                                            {tab === 'open'
                                                ? `Opened ${t.dispute?.raisedAt ? timeAgo(t.dispute.raisedAt) : ''}`
                                                : `Decided ${t.dispute?.resolvedAt ? timeAgo(t.dispute.resolvedAt) : ''}`}
                                        </span>
                                    </p>
                                    <div className="flex items-center justify-between gap-3 md:contents">
                                        <div className="md:w-[150px]">
                                            {tab === 'open' &&
                                                (t.dispute?.escalated ? (
                                                    <Chip tone="alert">Legal review</Chip>
                                                ) : t.dispute?.vendorResponse ? (
                                                    <Chip tone="mint">Seller replied</Chip>
                                                ) : (
                                                    <Chip tone="amber">No reply yet</Chip>
                                                ))}
                                        </div>
                                        <p className="font-display text-[20px] font-medium tracking-[-0.03em] md:w-[120px] md:text-right">
                                            {formatNaira(t.totalAmount)}
                                        </p>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 border-t border-line p-5 md:px-6">
                    <p className="text-sm text-mute">
                        Page {data.page} of {data.totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                            Previous
                        </Button>
                        <Button variant="outline" size="sm" disabled={page >= data.totalPages || loading} onClick={() => setPage((p) => p + 1)}>
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </section>
    );
}