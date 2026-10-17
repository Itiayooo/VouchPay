import type { VendorStats } from '../../api/types';

interface Item {
    key: string;
    status: string;
    text: string;
    style: string;
}

export default function AttentionStrip({
    stats,
    onShow,
}: {
    stats: VendorStats;
    onShow: (status: string) => void;
}) {
    const items: Item[] = [];

    if (stats.needsAttention > 0) {
        const n = stats.needsAttention;
        items.push({
            key: 'payouts',
            status: 'release_failed',
            text: `${n} ${n === 1 ? 'payout' : 'payouts'} failed. Open ${n === 1 ? 'it' : 'them'} and try again.`,
            style: 'bg-alert-bg text-alert',
        });
    }
    if (stats.openDisputes > 0) {
        const n = stats.openDisputes;
        items.push({
            key: 'disputes',
            status: 'disputed',
            text: `${n} open ${n === 1 ? 'dispute' : 'disputes'}. Add your side so the mediator sees both.`,
            style: 'bg-sand text-amber',
        });
    }
    if (items.length === 0) return null;

    return (
        <div className="grid gap-2">
            {items.map((i) => (
                <div key={i.key} className={`flex items-center justify-between gap-3 rounded-[18px] px-5 py-3.5 ${i.style}`}>
                    <p className="font-medium">{i.text}</p>
                    <button type="button" onClick={() => onShow(i.status)} className="shrink-0 rounded-lg px-3 py-1.5 font-bold underline">
                        Show
                    </button>
                </div>
            ))}
        </div>
    );
}