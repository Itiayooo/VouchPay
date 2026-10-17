import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { getVendorStats } from '../api/stats';
import type { VendorStats } from '../api/types';
import AttentionStrip from '../components/dashboard/AttentionStrip';
import BankBanner from '../components/dashboard/BankBanner';
import EscrowPanel from '../components/dashboard/EscrowPanel';
import OrderList from '../components/dashboard/OrderList';
import Button from '../components/ui/Button';
import FormError from '../components/ui/FormError';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
    const { vendor } = useAuth();
    const [stats, setStats] = useState<VendorStats | null>(null);
    const [statsError, setStatsError] = useState('');
    const [status, setStatus] = useState('');

    const loadStats = useCallback(() => {
        setStatsError('');
        getVendorStats()
            .then(setStats)
            .catch((err) => setStatsError(err instanceof ApiError ? err.message : 'Could not load your numbers.'));
    }, []);

    useEffect(loadStats, [loadStats]);

    function showStatus(s: string) {
        setStatus(s);
        document.getElementById('orders')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (!vendor) return null;

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-[clamp(30px,4.5vw,44px)] font-medium tracking-[-0.05em]">{vendor.businessName}</h1>
                <p className="text-mute">Here's where your orders stand.</p>
            </div>

            {!vendor.accountNumber && <BankBanner />}

            {stats ? (
                <EscrowPanel stats={stats} />
            ) : statsError ? (
                <div className="grid gap-3 rounded-card bg-white p-6">
                    <FormError message={statsError} />
                    <div>
                        <Button variant="outline" size="sm" onClick={loadStats}>
                            Try again
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="h-[300px] animate-pulse rounded-card bg-line/70" aria-hidden="true" />
            )}

            {stats && <AttentionStrip stats={stats} onShow={showStatus} />}

            <OrderList status={status} onStatusChange={setStatus} counts={stats?.byStatus} />
        </div>
    );
}