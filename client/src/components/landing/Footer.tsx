import { Link } from 'react-router-dom';
import { useCreateLinkPath } from '../../lib/useCreateLinkPath';
import Container from './Container';

const link = 'block py-1 hover:text-white hover:underline';
const heading = 'mb-3 font-sans text-[15px] font-bold text-white';

export default function Footer() {
    const createPath = useCreateLinkPath();

    return (
        <footer className="mt-3 bg-ink pt-14 pb-10 text-[15px] text-night-mute">
            <Container>
                <div className="grid gap-[34px] md:grid-cols-[1.6fr_1fr_1fr_1fr]">
                    <div>
                        <span className="mb-3 block font-display text-2xl font-bold tracking-[-0.04em] text-white">VouchPay</span>
                        Escrow for online sellers and buyers in Nigeria.
                    </div>
                    <div>
                        <h5 className={heading}>Product</h5>
                        <a className={link} href="#how">How it works</a>
                        <a className={link} href="#fee">Fees</a>
                        <a className={link} href="#faq">FAQ</a>
                    </div>
                    <div>
                        <h5 className={heading}>Sellers</h5>
                        <Link className={link} to={createPath}>Create an escrow link</Link>
                        <a className={link} href="#who">Seller protection</a>
                    </div>
                    <div>
                        <h5 className={heading}>Buyers</h5>
                        <Link className={link} to="/track">Track your order</Link>
                        <a className={link} href="#who">Buyer protection</a>
                    </div>
                </div>
                <p className="mt-9 max-w-[60em] border-t border-night-line pt-6 text-sm">
                    VouchPay is a startup currently in test mode. © 2026 VouchPay.
                </p>
            </Container>
        </footer>
    );
}