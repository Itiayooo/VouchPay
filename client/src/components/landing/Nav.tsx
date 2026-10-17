import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCreateLinkPath } from '../../lib/useCreateLinkPath';
import { buttonStyles } from '../ui/Button';
import Logo from '../ui/Logo';
import Container from './Container';

export default function Nav() {
    const { vendor } = useAuth();
    const createPath = useCreateLinkPath();

    return (
        <nav className="sticky top-0 z-20 bg-white/90 backdrop-blur-md">
            <Container>
                <div className="flex h-[70px] items-center gap-4 md:gap-[30px]">
                    <Link to="/" aria-label="VouchPay home">
                        <Logo />
                    </Link>
                    <div className="ml-2 hidden gap-7 text-base font-medium text-mute md:flex">
                        <a href="#how" className="hover:text-ink">How it works</a>
                        <a href="#who" className="hover:text-ink">For sellers and buyers</a>
                        <a href="#fee" className="hover:text-ink">Fees</a>
                        <a href="#faq" className="hover:text-ink">FAQ</a>
                    </div>
                    <div className="flex-1" />
                    <Link to="/track" className="hidden text-base font-semibold md:block">
                        Track your order
                    </Link>
                    <Link
                        to={vendor ? '/dashboard' : '/login'}
                        className="hidden text-base font-semibold min-[400px]:block"
                    >
                        {vendor ? 'Dashboard' : 'Log in'}
                    </Link>
                    <Link to={createPath} className={buttonStyles('primary', 'sm')}>
                        Create a link
                    </Link>
                </div>
            </Container>
        </nav>
    );
}