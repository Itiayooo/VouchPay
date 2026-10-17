import { useState, type ChangeEvent, type FormEvent } from 'react';
import { updateProfile } from '../../api/auth';
import { ApiError } from '../../api/client';
import type { Vendor } from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { cleanPhone, isNgPhone, serverFieldErrors } from '../../lib/validation';
import Button from '../ui/Button';
import Field from '../ui/Field';
import FormError from '../ui/FormError';

interface FormState {
    name: string;
    businessName: string;
    phone: string;
    instagramHandle: string;
    whatsappNumber: string;
}

const fromVendor = (v: Vendor): FormState => ({
    name: v.name,
    businessName: v.businessName,
    phone: v.phone,
    instagramHandle: v.instagramHandle ?? '',
    whatsappNumber: v.whatsappNumber ?? '',
});

const normalize = (f: FormState): FormState => ({
    name: f.name.trim(),
    businessName: f.businessName.trim(),
    phone: cleanPhone(f.phone),
    instagramHandle: f.instagramHandle.trim().replace(/^@/, ''),
    whatsappNumber: cleanPhone(f.whatsappNumber),
});

const PHONE_MSG = 'Enter a valid Nigerian number, like 08012345678.';

function validate(f: FormState) {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = 'Enter your full name.';
    if (f.businessName.trim().length < 2) e.businessName = 'Enter your business name.';
    if (!isNgPhone(f.phone)) e.phone = PHONE_MSG;
    if (f.whatsappNumber.trim() && !isNgPhone(f.whatsappNumber)) e.whatsappNumber = PHONE_MSG;
    return e;
}

export default function ProfileSection() {
    const { vendor, setVendor } = useAuth();
    const [form, setForm] = useState<FormState>(() => fromVendor(vendor as Vendor));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    if (!vendor) return null;

    const next = normalize(form);
    const prev = normalize(fromVendor(vendor));
    const changes: Partial<FormState> = {};
    (Object.keys(next) as (keyof FormState)[]).forEach((k) => {
        if (next[k] !== prev[k]) changes[k] = next[k];
    });
    const dirty = Object.keys(changes).length > 0;

    const set = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
        setSaved(false);
        setErrors((errs) => {
            if (!errs[key]) return errs;
            const rest = { ...errs };
            delete rest[key];
            return rest;
        });
    };

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setFormError('');
        const found = validate(form);
        setErrors(found);
        if (Object.keys(found).length || !dirty) return;

        setSaving(true);
        try {
            const updated = await updateProfile(changes);
            setVendor(updated);
            setForm(fromVendor(updated));
            setSaved(true);
        } catch (err) {
            if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
                const fields = serverFieldErrors(err.message);
                if (Object.keys(fields).length) setErrors(fields);
                else setFormError(err.message);
            } else {
                setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
            }
        } finally {
            setSaving(false);
        }
    }

    return (
        <section aria-labelledby="profile-title" className="rounded-card bg-white p-6 md:p-8">
            <h2 id="profile-title" className="text-[24px]">Your details</h2>
            <p className="mt-1 text-mute">Buyers see your business name and Instagram handle on the payment page.</p>

            <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-5">
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
                    value={vendor.email}
                    readOnly
                    disabled
                    hint="You can't change your email yet."
                />
                <Field
                    label="Phone number"
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={set('phone')}
                    error={errors.phone}
                />
                <div className="grid gap-5 md:grid-cols-2">
                    <Field
                        label="Instagram handle"
                        placeholder="@yourbusiness"
                        value={form.instagramHandle}
                        onChange={set('instagramHandle')}
                        error={errors.instagramHandle}
                    />
                    <Field
                        label="WhatsApp number"
                        type="tel"
                        hint="Leave empty to remove it."
                        value={form.whatsappNumber}
                        onChange={set('whatsappNumber')}
                        error={errors.whatsappNumber}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <Button type="submit" loading={saving} disabled={!dirty}>
                        Save changes
                    </Button>
                    <p role="status" className="font-semibold text-forest">
                        {saved ? 'Saved.' : ''}
                    </p>
                </div>
            </form>
        </section>
    );
}