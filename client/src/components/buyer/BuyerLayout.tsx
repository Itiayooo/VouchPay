import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../ui/Logo';

export default function BuyerLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-dvh bg-wash">
            <header className="mx-auto flex w-[min(640px,100%_-_40px)] items-center justify-between py-5">
                <Link to="/" aria-label="VouchPay home">
                    <Logo />
                </Link>
                <Link to="/track" className="text-[15px] font-semibold text-forest underline">
                    Track an order
                </Link>
            </header>
            <main className="mx-auto grid w-[min(640px,100%_-_40px)] gap-5 pb-14">{children}</main>
        </div>
    );
}