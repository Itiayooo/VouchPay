import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { getBanks, resolveAccount, saveBankAccount, type Bank } from '../../api/payouts';
import { useAuth } from '../../context/AuthContext';
import PasswordField from '../auth/PasswordField';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import Field from '../ui/Field';
import FormError from '../ui/FormError';

type Resolved =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ok'; name: string; simulated: boolean }
    | { status: 'error'; message: string };

export default function BankSection() {
    const { vendor, setVendor } = useAuth();
    const hasAccount = Boolean(vendor?.accountNumber);
    const [editing, setEditing] = useState(false);
    const open = !hasAccount || editing;

    const [banks, setBanks] = useState<Bank[] | null>(null);
    const [banksError, setBanksError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    const [bankInput, setBankInput] = useState('');
    const [bankTouched, setBankTouched] = useState(false);
    const [accountNumber, setAccountNumber] = useState('');
    const [resolved, setResolved] = useState<Resolved>({ status: 'idle' });
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [justSaved, setJustSaved] = useState(false);

    const bank = banks?.find((b) => b.name.toLowerCase() === bankInput.trim().toLowerCase());
    const bankCode = bank?.code;

    // Load the bank list the first time the form opens
    useEffect(() => {
        if (!open || banks) return;
        let stale = false;
        setBanksError('');
        getBanks()
            .then((b) => {
                if (!stale) setBanks(b);
            })
            .catch((err) => {
                if (!stale) setBanksError(err instanceof ApiError ? err.message : 'Could not load the list of banks.');
            });
        return () => {
            stale = true;
        };
    }, [open, banks, reloadKey]);

    // Check the account as soon as the bank and a full 10-digit number are in
    useEffect(() => {
        setResolved({ status: 'idle' });
        if (!bankCode || accountNumber.length !== 10) return;
        let stale = false;
        setResolved({ status: 'loading' });
        resolveAccount(bankCode, accountNumber)
            .then(({ accountName, simulated }) => {
                if (!stale) setResolved({ status: 'ok', name: accountName, simulated: Boolean(simulated) });
            })
            .catch((err) => {
                if (stale) return;
                const message =
                    err instanceof ApiError ? err.message : 'We could not verify that account. Check the bank and the account number.';
                setResolved({ status: 'error', message });
            });
        return () => {
            stale = true;
        };
    }, [bankCode, accountNumber]);

    function close() {
        setEditing(false);
        setBankInput('');
        setBankTouched(false);
        setAccountNumber('');
        setPassword('');
        setPasswordError('');
        setSaveError('');
    }

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        if (!bank || resolved.status !== 'ok') return;
        setPasswordError('');
        setSaveError('');
        if (!password) {
            setPasswordError('Enter your password to confirm.');
            return;
        }
        setSaving(true);
        try {
            const updated = await saveBankAccount({ bankCode: bank.code, accountNumber, password });
            setVendor(updated);
            close();
            setJustSaved(true);
        } catch (err) {
            if (err instanceof ApiError && err.code === 'BAD_CREDENTIALS') setPasswordError('That password is not right.');
            else setSaveError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
        } finally {
            setSaving(false);
        }
    }

    if (!vendor) return null;

    if (!open) {
        return (
            <section aria-labelledby="bank-title" className="rounded-card bg-ink p-6 text-white md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <Chip>Payout account</Chip>
                        <h2 id="bank-title" className="mt-4 text-[clamp(28px,4vw,40px)] leading-tight font-medium tracking-[-0.04em]">
                            {vendor.accountName}
                        </h2>
                        <p className="mt-1 text-night-mute">
                            {vendor.bankName}, account ending {vendor.accountNumber?.slice(-4)}
                        </p>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => {
                            setJustSaved(false);
                            setEditing(true);
                        }}
                    >
                        Change account
                    </Button>
                </div>
                <p className="mt-6 max-w-[34em] text-[15px] text-night-mute">
                    Buyers' payments reach you here. Orders you've already created keep paying out to the account that was saved
                    when you made the link.
                </p>
                <p role="status" className="mt-3 font-semibold text-leaf">
                    {justSaved ? 'Bank account saved.' : ''}
                </p>
            </section>
        );
    }

    return (
        <section aria-labelledby="bank-title" className="rounded-card bg-white p-6 md:p-8">
            <h2 id="bank-title" className="text-[24px]">
                {hasAccount ? 'Change your bank account' : 'Add your bank account'}
            </h2>
            <p className="mt-1 max-w-[34em] text-mute">
                {hasAccount
                    ? "Orders you've already created keep paying out to your current account."
                    : 'This is where we pay you when a buyer confirms. You need it before you can create links.'}
            </p>

            {banksError ? (
                <div className="mt-6 grid gap-3">
                    <FormError message={banksError} />
                    <div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setBanksError('');
                                setReloadKey((k) => k + 1);
                            }}
                        >
                            Try again
                        </Button>
                    </div>
                </div>
            ) : (
                <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-5">
                    <FormError message={saveError} />

                    <Field
                        label="Bank"
                        list="vouchpay-banks"
                        autoComplete="off"
                        disabled={!banks}
                        placeholder={banks ? 'Start typing, like GTBank or Moniepoint' : 'Loading banks…'}
                        value={bankInput}
                        onChange={(e) => setBankInput(e.target.value)}
                        onBlur={() => setBankTouched(true)}
                        error={bankTouched && bankInput && !bank ? 'Choose a bank from the suggestions.' : undefined}
                    />
                    <datalist id="vouchpay-banks">
                        {banks?.map((b) => (
                                          <option key={`${b.code}-${b.name}`} value={b.name} />
                        ))}
                    </datalist>

                    <Field
                        label="Account number"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="0123456789"
                        hint="10 digits"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />

                    <div aria-live="polite">
                        {resolved.status === 'loading' && <p className="text-mute">Checking the account…</p>}
                        {resolved.status === 'ok' && (
                            <div className="rounded-btn bg-mint px-4 py-3">
                                <p className="text-sm text-mute">Account name</p>
                                <p className="font-bold">{resolved.name}</p>
                                <p className="mt-1 text-sm text-mute">Make sure this is you before you save.</p>
                                {resolved.simulated && (
                                    <p className="mt-1 text-sm text-amber">
                                        Test mode: Paystack has no real banks here, so any account is accepted.
                                    </p>
                                )}
                            </div>
                        )}
                        {resolved.status === 'error' && <FormError message={resolved.message} />}
                    </div>

                    {resolved.status === 'ok' && (
                        <PasswordField
                            label="Your VouchPay password"
                            autoComplete="current-password"
                            hint="We ask so that nobody else can change where your money goes."
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setPasswordError('');
                            }}
                            error={passwordError}
                        />
                    )}

                    <div className="flex flex-wrap gap-3">
                        <Button type="submit" loading={saving} disabled={resolved.status !== 'ok'}>
                            Save bank account
                        </Button>
                        {hasAccount && (
                            <Button variant="outline" onClick={close}>
                                Cancel
                            </Button>
                        )}
                    </div>
                </form>
            )}
        </section>
    );
}