import type { PublicOrder } from '../../api/buyer';
import { formatNaira } from '../../lib/money';
import Chip from '../ui/Chip';

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4">
            <dt className="text-mute">{label}</dt>
            <dd>{value}</dd>
        </div>
    );
}

export default function OrderSummary({ order }: { order: PublicOrder }) {
    return (
        <section className="rounded-card bg-white p-6 md:p-8">
            <p className="text-mute">You're buying from</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
                <h1 className="text-[28px]">{order.vendor.businessName}</h1>
                {order.vendor.verified && <Chip tone="mint">Verified seller</Chip>}
            </div>
            {order.vendor.instagramHandle && <p className="text-sm text-mute">@{order.vendor.instagramHandle}</p>}

            <div className="mt-6 border-t border-line pt-5">
                <p className="font-semibold">{order.itemDescription}</p>
                <dl className="mt-4 grid gap-2">
                    <Row label="Item" value={formatNaira(order.itemAmount)} />
                    <Row label="Delivery" value={order.deliveryFee ? formatNaira(order.deliveryFee) : 'Free'} />
                    <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-line pt-4">
                        <dt className="font-semibold">Total</dt>
                        <dd className="font-display text-[34px] font-medium tracking-[-0.04em]">{formatNaira(order.totalAmount)}</dd>
                    </div>
                </dl>
            </div>
            <p className="mt-4 text-sm text-mute">Reference {order.reference}</p>
        </section>
    );
}