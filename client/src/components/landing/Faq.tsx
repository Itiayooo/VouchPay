import Container from './Container';

const FAQS = [
    { q: 'Is VouchPay live?', a: "We're in test mode. That means we're still building and learning with early sellers and buyers. We'll tell you plainly as that changes." },
    { q: 'What if the buyer never confirms?', a: "The money stays locked and a VouchPay mediator steps in to review what happened. Silence alone doesn't pay anyone." },
    { q: "What if the item isn't what I ordered?", a: "Don't show the QR or read the PIN. Keep your photos, chats and receipts, and raise it. A mediator reviews the evidence before any money moves." },
    { q: 'Who pays the fee?', a: 'The seller pays 2.5% of the item price plus ₦300, with a lower rate on the part above ₦200,000. The buyer pays exactly the agreed amount.' },
    { q: 'Can I use my own rider?', a: 'Yes. Your own rider, a courier, or hand delivery all work.' },
    { q: 'How can the buyer pay?', a: 'By card, bank transfer or USSD.' },
];

export default function Faq() {
    return (
        <section id="faq" className="py-[68px] md:py-24">
            <Container>
                <div className="grid gap-9 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-16">
                    <h2 className="text-[clamp(36px,5.6vw,60px)]">Questions people ask first</h2>
                    <div>
                        {FAQS.map((f) => (
                            <details key={f.q} className="group border-t border-line last:border-b">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-[21px] text-[19px] font-semibold after:grid after:h-[34px] after:w-[34px] after:flex-none after:place-items-center after:rounded-full after:bg-leaf after:text-[22px] after:transition-transform after:content-['+'] group-open:after:rotate-45 [&::-webkit-details-marker]:hidden">
                                    {f.q}
                                </summary>
                                <p className="pr-12 pb-[22px] text-mute">{f.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </Container>
        </section>
    );
}