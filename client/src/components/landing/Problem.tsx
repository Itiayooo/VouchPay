import type { ReactNode } from 'react';
import Chip from '../ui/Chip';
import Container from './Container';
import SectionHead from './SectionHead';

function Bubble({ side, time, children }: { side: 'out' | 'in'; time: string; children: ReactNode }) {
    const style = side === 'out' ? 'self-end rounded-br-[5px] bg-[#B9F0C8]' : 'rounded-bl-[5px] bg-white';
    return (
        <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-[1.35] ${style}`}>
            {children}
            <small className="mt-0.5 block text-right text-[12px] text-mute">{time}</small>
        </div>
    );
}

function SysNote({ children }: { children: ReactNode }) {
    return <div className="self-center rounded-full bg-white px-3 py-1 text-[12.5px] text-mute">{children}</div>;
}

function Caption({ title, children, dark = false }: { title: string; children: ReactNode; dark?: boolean }) {
    return (
        <div
            className={`rounded-[18px] px-[18px] py-4 text-[15px] leading-[1.45] ${dark ? 'bg-night text-night-mute' : 'bg-white text-mute'}`}
        >
            <b className={`mb-0.5 block text-[17px] font-bold ${dark ? 'text-white' : 'text-ink'}`}>{title}</b>
            {children}
        </div>
    );
}

const card = 'flex flex-col gap-4 rounded-card bg-mint p-[22px] md:min-h-[430px]';
const cardTitle = 'font-sans text-base leading-normal font-bold tracking-normal';

export default function Problem() {
    return (
        <section className="py-[68px] md:py-24">
            <Container>
                <SectionHead title={<>Right now, it all runs on “trust me.”</>}>
                    Buyers pay and the vendor disappears. Vendors pack the order, pay the rider, and the buyer cancels. Both
                    lose, and nobody can prove anything.
                </SectionHead>

                <div className="mt-12 grid gap-4 md:grid-cols-3">
                    <div className={card}>
                        <h4 className={cardTitle}>Buyer pays, vendor vanishes</h4>
                        <div className="flex flex-1 flex-col justify-center gap-[9px] px-1 py-1.5">
                            <Bubble side="out" time="2:14 PM ✓✓">Sent ₦42,000 just now. Check your account 🙏</Bubble>
                            <Bubble side="out" time="Mon ✓✓">Hello? When will it arrive?</Bubble>
                            <Bubble side="out" time="Wed ✓">Please reply abeg</Bubble>
                            <SysNote>You can't message this account</SysNote>
                        </div>
                        <Caption title="Money gone, item gone.">Nothing you can do but screenshot and cry.</Caption>
                    </div>

                    <div className={card}>
                        <h4 className={cardTitle}>Vendor packs, buyer ghosts</h4>
                        <div className="flex flex-1 flex-col justify-center gap-[9px] px-1 py-1.5">
                            <Bubble side="in" time="11:02 AM">Rider is at your gate now</Bubble>
                            <Bubble side="in" time="11:20 AM">I'm outside, abeg come out</Bubble>
                            <Bubble side="out" time="11:41 AM ✓✓">Sorry, I changed my mind. I don't need it again</Bubble>
                            <SysNote>Delivery cost: ₦2,500</SysNote>
                        </div>
                        <Caption title="Stock bought, rider paid.">And the seller carries the loss.</Caption>
                    </div>

                    <div className="flex flex-col gap-4 rounded-card bg-ink p-[22px] text-white md:min-h-[430px]">
                        <h4 className={cardTitle}>With VouchPay</h4>
                        <div className="my-auto grid gap-3 rounded-[20px] bg-night p-[18px]">
                            <div className="justify-self-start">
                                <Chip>Money held safely</Chip>
                            </div>
                            <div className="flex justify-between text-[15px] text-night-mute">
                                <span>Ankara two-piece</span>
                                <b className="text-white">₦42,000</b>
                            </div>
                            <div className="h-2 overflow-hidden rounded-lg bg-night-line">
                                <i className="block h-full w-[62%] rounded-lg bg-leaf" />
                            </div>
                            <div className="flex justify-between text-[15px] text-night-mute">
                                <span>Seller shipped</span>
                                <span>Waiting for buyer to confirm</span>
                            </div>
                        </div>
                        <Caption title="Money waits in the middle." dark>
                            It moves only when the buyer is happy.
                        </Caption>
                    </div>
                </div>
            </Container>
        </section>
    );
}