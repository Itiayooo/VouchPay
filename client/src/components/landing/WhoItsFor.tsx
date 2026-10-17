import { Link } from 'react-router-dom';
import { useCreateLinkPath } from '../../lib/useCreateLinkPath';
import { buttonStyles } from '../ui/Button';
import { CheckIcon } from '../ui/icons';
import Container from './Container';
import SectionHead from './SectionHead';

const SELLERS = [
    "No last-minute cancellations. After payment the order can't be changed, and can't be cancelled once shipped.",
    'Use any rider: your own, a courier, or hand delivery.',
    'Paid straight away when the buyer confirms.',
    "Fair review by a mediator if there's a dispute.",
];

const BUYERS = [
    "Your money isn't sent to the seller until you confirm.",
    "If the vendor vanishes, your money doesn't go with them.",
    'You pay exactly the agreed amount. No extra fee.',
    'Pay by card, bank transfer or USSD.',
];

function Points({ items }: { items: string[] }) {
    return (
        <ul className="mb-7 grid gap-3.5">
            {items.map((t) => (
                <li key={t} className="grid grid-cols-[22px_1fr] gap-3">
                    <CheckIcon className="mt-0.5 box-border h-[22px] w-[22px] rounded-full bg-leaf p-1 text-ink" />
                    {t}
                </li>
            ))}
        </ul>
    );
}

export default function WhoItsFor() {
    const createPath = useCreateLinkPath();

    return (
        <section id="who" className="py-[68px] md:py-24">
            <Container>
                <SectionHead title={<>Fair to the seller.<br />Safe for the buyer.</>}>
                    Same link, same rules for everyone, so nobody has to just hope.
                </SectionHead>

                <div className="mt-12 grid gap-4 md:grid-cols-2">
                    <div className="rounded-card bg-ink px-[26px] py-[34px] text-white md:px-10 md:py-11">
                        <h3 className="mb-1.5 text-[38px]">For sellers</h3>
                        <p className="mb-6 text-night-mute">Ship with confidence. The money is already there.</p>
                        <Points items={SELLERS} />
                        <Link to={createPath} className={buttonStyles('primary')}>Create an escrow link</Link>
                    </div>
                    <div className="rounded-card bg-mint px-[26px] py-[34px] md:px-10 md:py-11">
                        <h3 className="mb-1.5 text-[38px]">For buyers</h3>
                        <p className="mb-6 text-mute">Pay someone you've never met without holding your breath.</p>
                        <Points items={BUYERS} />
                        <Link to="/track" className={buttonStyles('outline')}>Have a link? Track your order</Link>
                    </div>
                </div>
            </Container>
        </section>
    );
}