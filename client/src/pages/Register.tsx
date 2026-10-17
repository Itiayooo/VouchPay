import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import type { RegisterInput } from '../api/auth';
import { ApiError } from '../api/client';
import AuthLayout from '../components/auth/AuthLayout';
import PasswordField from '../components/auth/PasswordField';
import Spinner from '../components/Spinner';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import FormError from '../components/ui/FormError';
import { useAuth } from '../context/AuthContext';
import { cleanPhone, isEmail, isNgPhone, serverFieldErrors } from '../lib/validation';

interface FormState {
    name: string;
    businessName: string;
    email: string;
    phone: string;
    password: string;
    instagramHandle: string;
    whatsappNumber: string;
}

const EMPTY: FormState = {
    name: '',
    businessName: '',
    email: '',
    phone: '',
    password: '',
    instagramHandle: '',
    whatsappNumber: '',
};

const PHONE_MSG = 'Enter a valid Nigerian number, like 08012345678.';

function validate(f: FormState) {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = 'Enter your full name.';
    if (f.businessName.trim().length < 2) e.businessName = 'Enter your business name.';
    if (!isEmail(f.email.trim())) e.email = 'Enter a valid email address.';
    if (!isNgPhone(f.phone)) e.phone = PHONE_MSG;
    if (f.password.length < 8) e.password = 'Use at least 8 characters.';
    if (f.whatsappNumber && !isNgPhone(f.whatsappNumber)) e.whatsappNumber = PHONE_MSG;
    return e;
}

function Aside() {
    const steps = [
        "Add your bank account in settings. That's where we pay you when a buyer confirms.",
        'Create a link with the item price and delivery fee.',
        "Share it in any chat. The buyer pays, and you ship when we tell you it's safe.",
    ];
    return (
        <div className="w-full max-w-[380px] rounded-card bg-ink p-7 text-white">
            <h2 className="text-[28px]">Ready to sell in minutes</h2>
            <ol className="mt-5 grid gap-4">
                {steps.map((s, i) => (
                    <li key={s} className="grid grid-cols-[32px_1fr] gap-3 text-night-mute">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-leaf font-display text-[15px] font-bold text-ink">
                            {i + 1}
                        </span>
                        <span className="pt-0.5">{s}</span>
                    </li>
                ))}
            </ol>
        </div>
    );
}

export default function Register() {
    const { vendor, loading: sessionLoading, register } = useAuth();
    const [form, setForm] = useState<FormState>(EMPTY);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (sessionLoading) return <Spinner />;
    if (vendor) return <Navigate to="/dashboard" replace />;

    const set = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
        setErrors((errs) => {
            if (!errs[key]) return errs;
            const { [key]: _removed, ...rest } = errs;
            return rest;
        });
    };

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setFormError('');
        const found = validate(form);
        setErrors(found);
        if (Object.keys(found).length) return;

        const input: RegisterInput = {
            name: form.name.trim(),
            businessName: form.businessName.trim(),
            email: form.email.trim(),
            password: form.password,
            phone: cleanPhone(form.phone),
        };
        const handle = form.instagramHandle.trim().replace(/^@/, '');
        if (handle) input.instagramHandle = handle;
        if (form.whatsappNumber) input.whatsappNumber = cleanPhone(form.whatsappNumber);

        setSubmitting(true);
        try {
            await register(input);
        } catch (err) {
            if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') {
                setErrors({ email: 'An account with this email already exists. Try logging in.' });
            } else if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
                const fields = serverFieldErrors(err.message);
                if (Object.keys(fields).length) setErrors(fields);
                else setFormError(err.message);
            } else {
                setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
            }
            setSubmitting(false);
        }
    }

    return (
        <AuthLayout
            title="Create your account"
            subtitle="Set up in a minute. You can add your bank account right after."
            aside={<Aside />}
            footer={
                <>
                    Already have an account?{' '}
                    <Link to="/login" className="font-semibold text-forest underline">
                        Log in
                    </Link>
                </>
            }
        >
            <form onSubmit={onSubmit} noValidate className="grid gap-5">
                <FormError message={formError} />
                <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
                    <Field
                        label="Business name"
                        autoComplete="organization"
                        value={form.businessName}
                        onChange={set('businessName')}
                        error={errors.businessName}
                    />
                </div>
                <Field
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={set('email')}
                    error={errors.email}
                />
                <Field
                    label="Phone number"
                    type="tel"
                    autoComplete="tel"
                    placeholder="08012345678"
                    value={form.phone}
                    onChange={set('phone')}
                    error={errors.phone}
                />
                <PasswordField
                    label="Password"
                    autoComplete="new-password"
                    hint="At least 8 characters."
                    value={form.password}
                    onChange={set('password')}
                    error={errors.password}
                />
                <div className="grid gap-5 md:grid-cols-2">
                    <Field
                        label="Instagram handle"
                        placeholder="@yourbusiness"
                        hint="Optional"
                        value={form.instagramHandle}
                        onChange={set('instagramHandle')}
                        error={errors.instagramHandle}
                    />
                    <Field
                        label="WhatsApp number"
                        type="tel"
                        hint="Optional, if different from your phone"
                        value={form.whatsappNumber}
                        onChange={set('whatsappNumber')}
                        error={errors.whatsappNumber}
                    />
                </div>
                <Button type="submit" loading={submitting} className="w-full">
                    Create account
                </Button>
            </form>
        </AuthLayout>
    );
}