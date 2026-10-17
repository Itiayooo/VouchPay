import { useState, type FormEvent } from 'react';
import { initializePayment, type PublicOrder } from '../../api/buyer';
import { ApiError } from '../../api/client';
import { buyerToken } from '../../lib/buyerToken';
import { formatNaira } from '../../lib/money';
import { isEmail } from '../../lib/validation';
import Button from '../ui/Button';
import Field from '../ui/Field';
import FormError from '../ui/FormError';
import { CheckIcon } from '../ui/icons';

interface Props {
    order: PublicOrder;
    unpaidNotice: boolean;
    onCheckAgain: () => void;
}

export default function PayCard({ order, unpaidNotice, onCheckAgain }: Props) {
    const [email, setEmail] = useState(order.buyer.email ?? '');
    const [emailError, setEmailError] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const days = order.dispatchWindowDays;
    const points = [
        "VouchPay holds your payment. The seller isn't paid until you confirm you got your item.",
        `The seller ships within ${days} ${days === 1 ? 'day' : 'days'}. Until they do, you can cancel for a full refund.`,
        'Pay by card, bank transfer or USSD on the next screen.',
    ];

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');
        const clean = email.trim();
        if (!isEmail(clean)) {
            setEmailError("Enter your email address. It's where your receipt goes.");
            return;
        }
        setEmailError('');
        setBusy(true);
        try {
            const init = await initializePayment(order.reference, clean);
            buyerToken.set(order.reference, init.buyerToken);
            window.location.assign(init.authorizationUrl);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
            setBusy(false);
        }
    }

    return (
        <section className="rounded-card bg-white p-6 md:p-8">
            {unpaidNotice && (
                <div role="status" className="mb-6 grid gap-3 rounded-btn bg-sand px-4 py-3 text-amber">
                    <p>We haven't received your payment yet. If you were charged, give it a minute and check again.</p>
                    <div>
                        <Button variant="dark" size="sm" onClick={onCheckAgain}>
                            Check again
                        </Button>
                    </div>
                </div>
            )}

            <h2 className="text-[26px]">How your money is protected</h2>
            <ul className="mt-4 grid gap-3">
                {points.map((p) => (
                    <li key={p} className="grid grid-cols-[22px_1fr] gap-3">
                        <CheckIcon className="mt-0.5 box-border h-[22px] w-[22px] rounded-full bg-leaf p-1 text-ink" />
                        {p}
                    </li>
                ))}
            </ul>

            <form onSubmit={onSubmit} noValidate className="mt-7 grid gap-5 border-t border-line pt-7">
                <FormError message={error} />
                <Field
                    label="Your email"
                    type="email"
                    autoComplete="email"
                    hint="Paystack sends your receipt here."
                    value={email}
                    onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError('');
                    }}
                    error={emailError}
                />
                <Button type="submit" loading={busy} className="w-full">
                    Pay {formatNaira(order.totalAmount)}
                </Button>
            </form>
        </section>
    );
}