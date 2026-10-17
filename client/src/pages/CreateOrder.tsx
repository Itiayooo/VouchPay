import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { createTransaction, type CreateTransactionInput } from '../api/transactions';
import type { Transaction } from '../api/types';
import Breakdown from '../components/orders/Breakdown';
import DeliveryTypePicker from '../components/orders/DeliveryTypePicker';
import OrderCreated from '../components/orders/OrderCreated';
import Button, { buttonStyles } from '../components/ui/Button';
import Field from '../components/ui/Field';
import FormError from '../components/ui/FormError';
import MoneyField from '../components/ui/MoneyField';
import SelectField from '../components/ui/SelectField';
import { useAuth } from '../context/AuthContext';
import { cleanPhone, isEmail, isNgPhone, serverFieldErrors } from '../lib/validation';

interface FormState {
    itemDescription: string;
    itemAmount: string;
    deliveryFee: string;
    deliveryType: 'local' | 'courier';
    dispatchWindowDays: string;
    buyerName: string;
    buyerPhone: string;
    buyerEmail: string;
    notes: string;
}

const EMPTY: FormState = {
    itemDescription: '',
    itemAmount: '',
    deliveryFee: '',
    deliveryType: 'local',
    dispatchWindowDays: '2',
    buyerName: '',
    buyerPhone: '',
    buyerEmail: '',
    notes: '',
};

const PHONE_MSG = 'Enter a valid Nigerian number, like 08012345678.';

// The server reports buyer fields as "buyer.name"; the form uses flat names
const SERVER_KEYS: Record<string, string> = {
    'buyer.name': 'buyerName',
    'buyer.phone': 'buyerPhone',
    'buyer.email': 'buyerEmail',
};

function validate(f: FormState) {
    const e: Record<string, string> = {};
    const desc = f.itemDescription.trim();
    if (desc.length < 3) e.itemDescription = 'Describe the item in a few words.';
    else if (desc.length > 300) e.itemDescription = 'Keep it under 300 characters.';

    const price = Number(f.itemAmount || 0);
    if (price < 500) e.itemAmount = 'The minimum item price is ₦500.';
    else if (price > 10_000_000) e.itemAmount = 'The maximum item price is ₦10,000,000.';

    if (Number(f.deliveryFee || 0) > 1_000_000) e.deliveryFee = 'The maximum delivery fee is ₦1,000,000.';
    if (f.buyerName.trim().length < 2) e.buyerName = "Enter the buyer's name.";
    if (!isNgPhone(f.buyerPhone)) e.buyerPhone = PHONE_MSG;
    if (f.buyerEmail.trim() && !isEmail(f.buyerEmail.trim())) e.buyerEmail = 'Enter a valid email address.';
    if (f.notes.length > 500) e.notes = 'Keep it under 500 characters.';
    return e;
}

function BankGate() {
    return (
        <div className="mx-auto max-w-[560px] rounded-card bg-white p-6 md:p-8">
            <h1 className="text-[clamp(28px,4vw,38px)] font-medium tracking-[-0.05em]">Add your bank account first</h1>
            <p className="mt-3 text-mute">
                When a buyer confirms, we pay you straight into your bank account. We need it before you can create links, so
                the money has somewhere to go.
            </p>
            <Link to="/settings" className={`${buttonStyles('primary')} mt-6`}>
                Add bank account
            </Link>
        </div>
    );
}

export default function CreateOrder() {
    const { vendor } = useAuth();
    const [form, setForm] = useState<FormState>(EMPTY);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [created, setCreated] = useState<Transaction | null>(null);
    const [needsBank, setNeedsBank] = useState(false);

    if (!vendor) return null;
    if (!vendor.accountNumber || needsBank) return <BankGate />;
    if (created) {
        return (
            <OrderCreated
                transaction={created}
                onReset={() => {
                    setForm(EMPTY);
                    setCreated(null);
                }}
            />
        );
    }

    const clearError = (key: string) =>
        setErrors((errs) => {
            if (!errs[key]) return errs;
            const next = { ...errs };
            delete next[key];
            return next;
        });

    const setValue = (key: keyof FormState) => (value: string) => {
        setForm((f) => ({ ...f, [key]: value }));
        clearError(key);
    };
    const setText = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setValue(key)(e.target.value);

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setFormError('');
        const found = validate(form);
        setErrors(found);
        if (Object.keys(found).length) {
            requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
            return;
        }

        const email = form.buyerEmail.trim();
        const notes = form.notes.trim();
        const input: CreateTransactionInput = {
            itemDescription: form.itemDescription.trim(),
            itemAmount: Number(form.itemAmount),
            deliveryFee: Number(form.deliveryFee || 0),
            deliveryType: form.deliveryType,
            dispatchWindowDays: Number(form.dispatchWindowDays),
            buyer: {
                name: form.buyerName.trim(),
                phone: cleanPhone(form.buyerPhone),
                ...(email ? { email } : {}),
            },
            ...(notes ? { notes } : {}),
        };

        setSubmitting(true);
        try {
            setCreated(await createTransaction(input));
            window.scrollTo({ top: 0 });
        } catch (err) {
            if (err instanceof ApiError && err.code === 'NO_BANK_ACCOUNT') {
                setNeedsBank(true);
            } else if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
                const fields = serverFieldErrors(err.message);
                if (Object.keys(fields).length) {
                    setErrors(Object.fromEntries(Object.entries(fields).map(([k, v]) => [SERVER_KEYS[k] ?? k, v])));
                } else {
                    setFormError(err.message);
                }
            } else {
                setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-[clamp(30px,4.5vw,44px)] font-medium tracking-[-0.05em]">New escrow link</h1>
                <p className="max-w-[36em] text-mute">
                    Add the deal you've already agreed with the buyer. They pay through the link, and the money is held until they
                    confirm they got the item.
                </p>
            </div>

            <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_380px]">
                <form onSubmit={onSubmit} noValidate className="grid gap-8 rounded-card bg-white p-6 md:p-8">
                    <FormError message={formError} />

                    <section className="grid gap-5">
                        <h2 className="text-[22px]">The item</h2>
                        <Field
                            label="What are you selling?"
                            placeholder="Black Air Force 1, size 43"
                            value={form.itemDescription}
                            onChange={setText('itemDescription')}
                            error={errors.itemDescription}
                        />
                        <div className="grid gap-5 md:grid-cols-2">
                            <MoneyField
                                label="Item price"
                                placeholder="40,000"
                                value={form.itemAmount}
                                onValueChange={setValue('itemAmount')}
                                error={errors.itemAmount}
                            />
                            <MoneyField
                                label="Delivery fee"
                                placeholder="0"
                                hint="Leave empty if delivery is free or the buyer is collecting."
                                value={form.deliveryFee}
                                onValueChange={setValue('deliveryFee')}
                                error={errors.deliveryFee}
                            />
                        </div>
                    </section>

                    <section className="grid gap-5 border-t border-line pt-8">
                        <h2 className="text-[22px]">The buyer</h2>
                        <div className="grid gap-5 md:grid-cols-2">
                            <Field
                                label="Buyer's name"
                                autoComplete="off"
                                value={form.buyerName}
                                onChange={setText('buyerName')}
                                error={errors.buyerName}
                            />
                            <Field
                                label="Buyer's phone number"
                                type="tel"
                                autoComplete="off"
                                placeholder="08012345678"
                                value={form.buyerPhone}
                                onChange={setText('buyerPhone')}
                                error={errors.buyerPhone}
                            />
                        </div>
                        <Field
                            label="Buyer's email"
                            type="email"
                            autoComplete="off"
                            hint="Optional. The buyer can add it when they pay."
                            value={form.buyerEmail}
                            onChange={setText('buyerEmail')}
                            error={errors.buyerEmail}
                        />
                    </section>

                    <section className="grid gap-5 border-t border-line pt-8">
                        <h2 className="text-[22px]">Delivery</h2>
                        <DeliveryTypePicker value={form.deliveryType} onChange={setValue('deliveryType')} />
                        <SelectField
                            label="I will ship within"
                            hint="The buyer sees this before they pay."
                            value={form.dispatchWindowDays}
                            onChange={setText('dispatchWindowDays')}
                        >
                            <option value="1">1 day</option>
                            <option value="2">2 days</option>
                            <option value="3">3 days</option>
                            <option value="5">5 days</option>
                            <option value="7">7 days</option>
                            <option value="14">14 days</option>
                        </SelectField>
                        <Field
                            label="Your note"
                            hint="Optional. Only you can see this."
                            value={form.notes}
                            onChange={setText('notes')}
                            error={errors.notes}
                        />
                    </section>

                    <div className="md:hidden">
                        <Breakdown itemDigits={form.itemAmount} deliveryDigits={form.deliveryFee} />
                    </div>

                    <Button type="submit" loading={submitting} className="w-full md:w-fit">
                        Create link
                    </Button>
                </form>

                <aside className="hidden md:sticky md:top-24 md:block">
                    <Breakdown itemDigits={form.itemAmount} deliveryDigits={form.deliveryFee} />
                </aside>
            </div>
        </div>
    );
}