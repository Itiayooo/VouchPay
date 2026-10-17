import { useState } from 'react';
import { calculatePlatformFee } from '../../lib/fees';
import { formatNaira, toKobo } from '../../lib/money';
import Container from './Container';
import SectionHead from './SectionHead';

const field =
    'mb-[22px] flex items-center gap-1.5 border-b-[1.5px] border-ink/30 pb-1.5 last:mb-0 focus-within:border-ink';
const inputClass =
    'w-full min-w-0 bg-transparent font-display text-[30px] font-medium tracking-[-0.02em] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
const big =
    'mt-0.5 mb-[22px] font-display text-[clamp(34px,5vw,46px)] leading-[1.1] font-medium tracking-[-0.04em] last:mb-0';

export default function FeeCalculator() {
    const [price, setPrice] = useState('40000');
    const [delivery, setDelivery] = useState('2000');

    const item = toKobo(Math.max(0, Number(price) || 0));
    const del = toKobo(Math.max(0, Number(delivery) || 0));
    const fee = calculatePlatformFee(item);

    return (
        <section id="fee" className="diamonds py-[72px] text-ink md:py-[104px]">
            <Container>
                <SectionHead title="One fee. Seen before you send." textClassName="text-ink/80">
                    Sellers pay 2.5% of the item price plus ₦300. Buyers pay exactly what was agreed, nothing added. Try your
                    own numbers.
                </SectionHead>

                <div className="mt-12 grid gap-3.5 md:grid-cols-[1fr_1.25fr_1fr]">
                    <div className="rounded-[22px] bg-white/40 p-6">
                        <label htmlFor="price" className="mb-1.5 block text-[14.5px] opacity-85">Item price</label>
                        <div className={field}>
                            <span className="font-display text-[26px] font-medium opacity-80">₦</span>
                            <input id="price" className={inputClass} type="number" inputMode="numeric" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
                        </div>
                        <label htmlFor="delivery" className="mb-1.5 block text-[14.5px] opacity-85">Delivery fee</label>
                        <div className={field}>
                            <span className="font-display text-[26px] font-medium opacity-80">₦</span>
                            <input id="delivery" className={inputClass} type="number" inputMode="numeric" min="0" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
                        </div>
                    </div>

                    <div className="rounded-[22px] bg-white p-6" aria-live="polite">
                        <p className="mb-1.5 text-[14.5px] opacity-70">Buyer pays</p>
                        <div className={big}>{formatNaira(item + del)}</div>
                        <p className="mb-1.5 text-[14.5px] opacity-70">Seller receives</p>
                        <div className={`${big} -ml-1.5 w-fit px-1.5 [background:linear-gradient(transparent_58%,var(--color-leaf)_58%)]`}>
                            {formatNaira(item + del - fee)}
                        </div>
                    </div>

                    <div className="rounded-[22px] bg-white/40 p-6">
                        <p className="mb-1.5 text-[14.5px] opacity-85">VouchPay fee</p>
                        <div className={big}>{formatNaira(fee)}</div>
                        <small className="mt-0.5 block text-[14.5px] opacity-80">
                            2.5% of the item price, plus ₦300. Paid by the seller.
                        </small>
                    </div>
                </div>

                <p className="mt-5 text-sm opacity-85">
                    Example only. Your link shows the exact figures before you send it. On items above ₦200,000 the rate drops to
                    0.5% on the amount above that, with the fee capped at ₦20,000.
                </p>
            </Container>
        </section>
    );
}