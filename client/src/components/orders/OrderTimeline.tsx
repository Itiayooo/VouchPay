import type { Transaction } from '../../api/types';
import { formatDateTime } from '../../lib/date';
import { STATUS } from '../../lib/status';

export default function OrderTimeline({ history }: { history: NonNullable<Transaction['statusHistory']> }) {
    return (
        <section aria-labelledby="history-title" className="rounded-card bg-white p-6 md:p-8">
            <h2 id="history-title" className="text-[24px]">History</h2>
            <ol className="mt-5 grid gap-5 border-l-2 border-line pl-6">
                {history.map((h, i) => (
                    <li key={`${h.status}-${h.at}-${i}`} className="relative">
                        <span className="absolute top-1.5 -left-[31px] h-3 w-3 rounded-full bg-leaf ring-4 ring-white" />
                        <p className="font-semibold">{STATUS[h.status]?.label ?? h.status}</p>
                        <p className="text-sm text-mute">{formatDateTime(h.at)}</p>
                        {h.note && <p className="mt-0.5 text-sm text-mute">{h.note}</p>}
                    </li>
                ))}
            </ol>
        </section>
    );
}