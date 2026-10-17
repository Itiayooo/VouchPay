import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../ui/Logo';

interface Props {
    title: string;
    subtitle: string;
    aside: ReactNode;
    footer: ReactNode;
    children: ReactNode;
}

export default function AuthLayout({ title, subtitle, aside, footer, children }: Props) {
    return (
        <div className="grid min-h-dvh md:grid-cols-2">
            <main className="flex flex-col px-5 py-6 md:px-14">
                <Link to="/" aria-label="VouchPay home" className="w-fit">
                    <Logo />
                </Link>
                <div className="mx-auto my-auto w-full max-w-[440px] py-10">
                    <h1 className="text-[clamp(34px,5vw,48px)] font-medium tracking-[-0.05em]">{title}</h1>
                    <p className="mt-2 text-mute">{subtitle}</p>
                    <div className="mt-8">{children}</div>
                    <p className="mt-6 text-mute">{footer}</p>
                </div>
            </main>
            <aside className="diamonds hidden items-center justify-center p-10 md:flex">{aside}</aside>
        </div>
    );
}