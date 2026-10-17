import type { AdminStats } from '../../api/types';
import { formatNaira } from '../../lib/money';

export default function PlatformPanel({ stats }: { stats: AdminStats }) {
    const max = Math.max(...stats.daily.map((d) => d.amount), 1);
    const paid14 = stats.daily.reduce((sum, d) => sum + d.amount, 0);

    return (
        <section aria-label="Platform summary" className="rounded-card bg-ink p-6 text-white md:p-8">
            <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-end">
                <div>
                    <p className="text-night-mute">Held in escrow right now</p>
                    <p className="mt-1 font-display text-[clamp(44px,7vw,76px)] leading-none font-medium tracking-[-0.05em]">
                        {formatNaira(stats.heldInEscrow.amount)}
                    </p>
                    <p className="mt-3 text-night-mute">
                        Across {stats.heldInEscrow.orders} {stats.heldInEscrow.orders === 1 ? 'order' : 'orders'}. This is buyers'
                        money, not ours.
                    </p>
                </div>
                <div>
                    <p className="mb-3 text-sm text-night-mute">
                        Paid in over the last 14 days: <b className="text-white">{formatNaira(paid14)}</b>
                    </p>
                    <div className="flex h-16 items-end gap-[3px]" aria-hidden="true">
                        {stats.daily.map((d) => (
                            <div
                                key={d.date}
                                title={`${d.date}: ${formatNaira(d.amount)}`}
                                className={`flex-1 rounded-sm ${d.amount ? 'bg-leaf' : 'bg-night-line'}`}
                                style={{ height: d.amount ? `${Math.max(10, (d.amount / max) * 100)}%` : '4px' }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <dl className="mt-8 grid gap-4 border-t border-night-line pt-6 sm:grid-cols-3">
                <div>
                    <dt className="text-sm text-night-mute">Paid through VouchPay, all time</dt>
                    <dd className="mt-0.5 font-display text-[22px] font-medium">{formatNaira(stats.volume.totalPaid)}</dd>
                </div>
                <div>
                    <dt className="text-sm text-night-mute">Fees earned (before Paystack costs)</dt>
                    <dd className="mt-0.5 font-display text-[22px] font-medium">{formatNaira(stats.platformFeesEarned)}</dd>
                </div>
                <div>
                    <dt className="text-sm text-night-mute">Vendors</dt>
                    <dd className="mt-0.5 font-display text-[22px] font-medium">
                        {stats.vendors.total}
                        <span className="ml-2 text-[15px] font-normal text-night-mute">{stats.vendors.newThisWeek} new this week</span>
                    </dd>
                </div>
            </dl>
        </section>
    );
}