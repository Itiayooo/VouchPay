import Container from './Container';

const ITEMS = [
    { title: 'Sell on Instagram', text: 'Drop the link in your DMs. No more "send proof of payment" back and forth.' },
    { title: 'Sell on WhatsApp', text: 'Share it in a chat or on your status. One link per order.' },
    { title: 'Sell on Jiji, X, Telegram', text: 'If you can paste a link there, VouchPay works there.' },
    { title: 'Use your own rider', text: 'Your rider, a courier or hand delivery. We only care that the buyer confirms.' },
    { title: 'Buy from someone new', text: 'Pay a stranger without sending money into the unknown.' },
];

export default function Platforms() {
    return (
        <section className="py-[68px] md:py-24">
            <Container>
                <h2 className="text-center text-[clamp(34px,5.4vw,56px)]">Wherever you sell, it works.</h2>
                <div className="-mx-5 mt-9 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-5 pt-1 pb-[22px] [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
                    {ITEMS.map((c) => (
                        <div key={c.title} className="flex-[0_0_min(290px,76vw)] snap-start rounded-[24px] border-[1.5px] border-line bg-white px-6 pt-[26px] pb-7">
                            <span className="mb-[22px] block font-display text-[34px] leading-none font-bold tracking-[-0.1em] italic">//</span>
                            <h3 className="mb-2 text-[27px]">{c.title}</h3>
                            <p className="text-[15.5px] text-mute">{c.text}</p>
                        </div>
                    ))}
                </div>
            </Container>
        </section>
    );
}