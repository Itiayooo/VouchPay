import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAttention } from '../../api/admin';
import { ApiError } from '../../api/client';
import type { Transaction } from '../../api/types';
import { timeAgo } from '../../lib/date';
import { formatNaira } from '../../lib/money';
import FormError from '../ui/FormError';
import StatusBadge from '../ui/StatusBadge';

export default function AttentionList() {
    const [items, setItems] = useState<Transaction[] | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let stale = false;
        getAttention()
            .then((i) => {
                if (!stale) setItems(i);
            })
            .catch((err) => {
                if (!stale) setError(err instanceof ApiError ? err.message : 'Could not load this list.');
            });
        return () => {
            stale = true;
        };
    }, []);

    if (error) return <FormError message={error} />;
    if (!items || items.length === 0) return null;

    return (
        <section aria-labelledby="attention-title" className="rounded-card bg-alert-bg p-5 md:p-6">
            <h2 id="attention-title" className="text-[24px] text-alert">
                Needs a person
            </h2>
            <p className="mt-1 text-alert">Payouts or refunds that failed, or have been stuck for over 15 minutes.</p>
            <ul className="mt-4 grid gap-2">
                {items.map((t) => (
                    <li key={t.id}>
                        <Link
                            to={`/admin/orders/${t.id}`}
                            className="flex flex-col gap-2 rounded-btn bg-white px-4 py-3 hover:bg-mint md:flex-row md:items-center md:justify-between"
                        >
                            <div className="min-w-0">
                                <p className="truncate font-semibold">{t.itemDescription}</p>
                                <p className="text-sm text-mute">
                                    {t.reference}, {typeof t.vendor === 'object' ? t.vendor.businessName : ''}, updated {timeAgo(t.updatedAt)}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <StatusBadge status={t.status} />
                                <span className="font-display text-[18px] font-medium">{formatNaira(t.totalAmount)}</span>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}