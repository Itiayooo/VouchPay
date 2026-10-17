import { useCallback, useEffect, useState } from 'react';
import { getAdminStats } from '../api/admin';
import { ApiError } from '../api/client';
import type { AdminStats } from '../api/types';
import AttentionList from '../components/admin/AttentionList';
import DisputeQueue from '../components/admin/DisputeQueue';
import PlatformPanel from '../components/admin/PlatformPanel';
import Button from '../components/ui/Button';
import FormError from '../components/ui/FormError';
import { timeAgo } from '../lib/date';

export default function Admin() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [error, setError] = useState('');

    const load = useCallback(() => {
        setError('');
        getAdminStats()
            .then(setStats)
            .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load the numbers.'));
    }, []);

    useEffect(load, [load]);

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-[clamp(30px,4.5vw,44px)] font-medium tracking-[-0.05em]">Admin</h1>
                <p className="text-mute">
                    {stats && stats.disputes.open > 0 && stats.disputes.oldestOpenSince
                        ? `${stats.disputes.open} open ${stats.disputes.open === 1 ? 'dispute' : 'disputes'}. The oldest was opened ${timeAgo(stats.disputes.oldestOpenSince)}.`
                        : 'The platform at a glance.'}
                </p>
            </div>

            {stats ? (
                <PlatformPanel stats={stats} />
            ) : error ? (
                <div className="grid gap-3 rounded-card bg-white p-6">
                    <FormError message={error} />
                    <div>
                        <Button variant="outline" size="sm" onClick={load}>
                            Try again
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="h-[300px] animate-pulse rounded-card bg-line/70" aria-hidden="true" />
            )}

            <AttentionList />
            <DisputeQueue openCount={stats?.disputes.open ?? 0} />
        </div>
    );
}