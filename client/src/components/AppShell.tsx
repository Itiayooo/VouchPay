import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { buttonStyles } from './ui/Button';
import Logo from './ui/Logo';

const navLink = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-4 py-2 text-[15.5px] font-semibold whitespace-nowrap transition-colors ${isActive ? 'bg-ink text-white' : 'text-mute hover:bg-mint hover:text-ink'
    }`;

export default function AppShell() {
    const { vendor, logout } = useAuth();
    const navigate = useNavigate();

    async function onLogout() {
        await logout();
        navigate('/', { replace: true });
    }

    return (
        <div className="min-h-dvh bg-wash">
            <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur-md">
                <div className="mx-auto flex w-[min(1180px,100%_-_40px)] flex-wrap items-center gap-x-4 gap-y-1 py-3 md:h-[70px] md:flex-nowrap md:py-0">
                    <Link to="/dashboard" aria-label="VouchPay dashboard">
                        <Logo />
                    </Link>

                    <nav
                        aria-label="Main"
                        className="order-last -mx-1 flex w-full items-center gap-1 overflow-x-auto md:order-none md:mx-0 md:ml-4 md:w-auto"
                    >
                        <NavLink to="/dashboard" className={navLink}>Dashboard</NavLink>
                        <NavLink to="/settings" className={navLink}>Settings</NavLink>
                        {vendor?.role === 'admin' && <NavLink to="/admin" className={navLink}>Admin</NavLink>}
                        <button
                            type="button"
                            onClick={onLogout}
                            className="ml-auto rounded-full px-4 py-2 text-[15.5px] font-semibold whitespace-nowrap text-mute hover:bg-mint hover:text-ink md:hidden"
                        >
                            Log out
                        </button>
                    </nav>

                    <div className="ml-auto flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onLogout}
                            className="hidden rounded-full px-3 py-2 text-[15.5px] font-semibold text-mute hover:bg-mint hover:text-ink md:block"
                        >
                            Log out
                        </button>
                        <Link to="/orders/new" className={buttonStyles('primary', 'sm')}>
                            New link
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-[min(1180px,100%_-_40px)] py-8 md:py-12">
                <Outlet />
            </main>
        </div>
    );
}