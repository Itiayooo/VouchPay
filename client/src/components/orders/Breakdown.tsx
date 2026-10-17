import { calculatePlatformFee } from '../../lib/fees';
import { formatNaira } from '../../lib/money';

export default function Breakdown({ itemDigits, deliveryDigits }: { itemDigits: string; deliveryDigits: string }) {
    const item = Number(itemDigits || 0) * 100;
    const delivery = Number(deliveryDigits || 0) * 100;
    const fee = calculatePlatformFee(item);
    const total = item + delivery;

    return (
        <div className="rounded-card bg-ink p-6 text-white" aria-live="polite">
            <p className="text-night-mute">Buyer pays</p>
            <p className="mt-1 font-display text-[clamp(40px,5vw,56px)] leading-none font-medium tracking-[-0.05em]">
                {formatNaira(total)}
            </p>

            <dl className="mt-6 grid gap-3 border-t border-night-line pt-5 text-[15px]">
                <div className="flex justify-between gap-4">
                    <dt className="text-night-mute">Item</dt>
                    <dd>{formatNaira(item)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                    <dt className="text-night-mute">Delivery</dt>
                    <dd>{formatNaira(delivery)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                    <dt className="text-night-mute">VouchPay fee</dt>
                    <dd>-{formatNaira(fee)}</dd>
                </div>
            </dl>

            <div className="mt-5 rounded-[18px] bg-night p-4">
                <p className="text-sm text-night-mute">You receive</p>
                <p className="font-display text-[32px] leading-tight font-medium tracking-[-0.03em] text-leaf">
                    {formatNaira(total - fee)}
                </p>
                <p className="mt-1 text-sm text-night-mute">Delivery is included, so you can pay your rider from it.</p>
            </div>

            <p className="mt-4 text-[13.5px] text-night-mute">
                The buyer pays exactly the total above. Our fee comes out of your payout, never the buyer's payment.
            </p>
        </div>
    );
}