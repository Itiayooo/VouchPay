import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ApiError } from '../api/client';
import AuthLayout from '../components/auth/AuthLayout';
import PasswordField from '../components/auth/PasswordField';
import Spinner from '../components/Spinner';
import Button from '../components/ui/Button';
import Chip from '../components/ui/Chip';
import Field from '../components/ui/Field';
import FormError from '../components/ui/FormError';
import { useAuth } from '../context/AuthContext';

function Aside() {
    return (
        <div className="w-full max-w-[360px] rounded-card bg-ink p-[22px] text-white">
            <div className="grid gap-3 rounded-[20px] bg-night p-[18px]">
                <div className="justify-self-start">
                    <Chip>Paid, ready to ship</Chip>
                </div>
                <div className="flex justify-between text-[15px] text-night-mute">
                    <span>Ankara two-piece</span>
                    <b className="text-white">₦42,000</b>
                </div>
                <p className="text-[15px] text-night-mute">The buyer has paid. It's safe to ship.</p>
            </div>
            <p className="mt-4 px-1 text-[15px] text-night-mute">
                Your orders, your payouts and your disputes, all in one place.
            </p>
        </div>
    );
}

export default function Login() {
    const { vendor, loading: sessionLoading, login } = useAuth();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const from = (location.state as { from?: string } | null)?.from;
    const target = from && from.startsWith('/') && !['/login', '/register'].includes(from) ? from : '/dashboard';

    if (sessionLoading) return <Spinner />;
    if (vendor) return <Navigate to={target} replace />;

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');
        if (!email.trim() || !password) {
            setError('Enter your email and password.');
            return;
        }
        setSubmitting(true);
        try {
            await login(email.trim(), password);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
            setSubmitting(false);
        }
    }

    return (
        <AuthLayout
            title="Log in"
            subtitle="Welcome back. Your orders are where you left them."
            aside={<Aside />}
            footer={
                <>
                    New to VouchPay?{' '}
                    <Link to="/register" className="font-semibold text-forest underline">
                        Create an account
                    </Link>
                </>
            }
        >
            <form onSubmit={onSubmit} noValidate className="grid gap-5">
                <FormError message={error} />
                <Field
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <PasswordField
                    label="Password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <Button type="submit" loading={submitting} className="w-full">
                    Log in
                </Button>
            </form>
        </AuthLayout>
    );
}