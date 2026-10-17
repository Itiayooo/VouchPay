import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { confirmHandover, getScanInfo, reportDelivered, type ScanInfo } from '../api/handover';
import BuyerLayout from '../components/buyer/BuyerLayout';
import QrScanner, { canScan } from '../components/handover/QrScanner';
import Button from '../components/ui/Button';
import Chip from '../components/ui/Chip';
import Field from '../components/ui/Field';
import FormError from '../components/ui/FormError';

type Phase = 'loading' | 'ready' | 'invalid' | 'error';
type Mode = 'choose' | 'scan' | 'pin';
type Done = null | 'confirmed' | 'reported';

const WAITING = ['in_transit', 'delivered'];

function closedMessage(status: string): string {
    switch (status) {
        case 'released':
            return 'This delivery is complete and the seller has been paid. Nothing more to do.';
        case 'release_pending':
        case 'release_failed':
            return 'The buyer has confirmed this delivery. Nothing more to do.';
        case 'disputed':
            return "The buyer has opened a dispute on this order. Don't hand over the item until the seller tells you what to do.";
        case 'refund_pending':
        case 'refund_failed':
        case 'refunded':
        case 'cancelled':
            return "This order was cancelled. Don't deliver it.";
        default:
            return "This link isn't active right now. Ask the seller.";
    }
}

export default function HandoverPage() {
    const { token = '' } = useParams();
    const [info, setInfo] = useState<ScanInfo | null>(null);
    const [phase, setPhase] = useState<Phase>('loading');
    const [done, setDone] = useState<Done>(null);
    const [mode, setMode] = useState<Mode>('choose');
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [confirmReport, setConfirmReport] = useState(false);

    const load = useCallback(async () => {
        setPhase('loading');
        try {
            setInfo(await getScanInfo(token));
            setPhase('ready');
        } catch (err) {
            if (err instanceof ApiError && err.status === 404) setPhase('invalid');
            else {
                setError(err instanceof ApiError ? err.message : 'Could not load this delivery.');
                setPhase('error');
            }
        }
    }, [token]);

    useEffect(() => {
        void load();
    }, [load]);

    const submit = useCallback(
        async (input: { qrToken: string } | { pin: string }) => {
            setBusy(true);
            setError('');
            try {
                await confirmHandover(token, input);
                setDone('confirmed');
            } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
            } finally {
                setBusy(false);
            }
        },
        [token]
    );

    const onScanned = useCallback(
        (code: string) => {
            setMode('choose');
            void submit({ qrToken: code });
        },
        [submit]
    );

    function onPin(e: FormEvent) {
        e.preventDefault();
        if (!/^\d{4}$/.test(pin)) {
            setPinError('Enter the 4 digits the buyer reads out.');
            return;
        }
        void submit({ pin });
    }

    async function report() {
        setBusy(true);
        setError('');
        try {
            await reportDelivered(token);
            setDone('reported');
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
            setConfirmReport(false);
        } finally {
            setBusy(false);
        }
    }

    if (phase === 'loading') {
        return (
            <BuyerLayout showTrack={false}>
                <div className="h-[260px] animate-pulse rounded-card bg-line/70" aria-hidden="true" />
            </BuyerLayout>
        );
    }

    if (phase === 'invalid') {
        return (
            <BuyerLayout showTrack={false}>
                <section className="rounded-card bg-white p-6 md:p-8">
                    <h1 className="text-[28px]">This delivery link isn't valid</h1>
                    <p className="mt-2 max-w-[32em] text-mute">
                        It may have been replaced by a newer link, or copied wrongly. Ask the seller to send it again.
                    </p>
                </section>
            </BuyerLayout>
        );
    }

    if (phase === 'error' || !info) {
        return (
            <BuyerLayout showTrack={false}>
                <section className="grid gap-4 rounded-card bg-white p-6 md:p-8">
                    <FormError message={error || 'Could not load this delivery.'} />
                    <div>
                        <Button variant="outline" size="sm" onClick={() => void load()}>
                            Try again
                        </Button>
                    </div>
                </section>
            </BuyerLayout>
        );
    }

    if (done) {
        return (
            <BuyerLayout showTrack={false}>
                <section role="status" className="rounded-card bg-ink p-6 text-white md:p-8">
                    <Chip>{done === 'confirmed' ? 'Delivery confirmed' : 'Delivery reported'}</Chip>
                    <h1 className="mt-4 text-[clamp(30px,5vw,42px)] font-medium tracking-[-0.05em]">
                        {done === 'confirmed' ? 'All done. Thank you.' : 'Delivery reported'}
                    </h1>
                    <p className="mt-2 max-w-[32em] text-night-mute">
                        {done === 'confirmed'
                            ? 'The seller is being paid now.'
                            : `${info.buyerName} can still confirm or raise a problem. If they stay quiet, the seller is paid automatically after ${Math.round(
                                info.autoReleaseHours / 24
                            )} days.`}
                    </p>
                </section>
            </BuyerLayout>
        );
    }

    const waiting = WAITING.includes(info.status);
    const days = Math.round(info.autoReleaseHours / 24);

    return (
        <BuyerLayout showTrack={false}>
            <section className="rounded-card bg-white p-6 md:p-8">
                <p className="text-mute">Delivering to {info.buyerName}</p>
                <h1 className="mt-1 text-[clamp(26px,4.5vw,34px)]">{info.itemDescription}</h1>
                <p className="mt-1 text-sm text-mute">{info.reference}</p>
            </section>

            {!waiting ? (
                <section className="rounded-card bg-mint p-6 md:p-8">
                    <p className="max-w-[34em]">{closedMessage(info.status)}</p>
                </section>
            ) : (
                <>
                    <section className="rounded-card bg-ink p-6 text-white md:p-8">
                        <h2 className="text-[26px]">Hand it over, then confirm</h2>
                        <p className="mt-1 text-night-mute">
                            Let {info.buyerName} check the item first. Then ask them to show their QR code or read out their 4-digit
                            PIN.
                        </p>
                        {info.status === 'delivered' && (
                            <p className="mt-3 text-sm text-night-mute">
                                Delivery is already reported. {info.buyerName} can still confirm with a code.
                            </p>
                        )}

                        <div className="mt-5 grid gap-4">
                            <FormError message={error} />

                            {mode === 'choose' && (
                                <div className="grid gap-3">
                                    {canScan() ? (
                                        <Button loading={busy} onClick={() => setMode('scan')}>
                                            Scan the buyer's QR code
                                        </Button>
                                    ) : (
                                        <p className="rounded-btn bg-night px-4 py-3 text-sm text-night-mute">
                                            This browser can't scan QR codes. Ask {info.buyerName} to read out their PIN instead.
                                        </p>
                                    )}
                                    <Button variant={canScan() ? 'outline' : 'primary'} onClick={() => setMode('pin')}>
                                        Type the buyer's PIN
                                    </Button>
                                </div>
                            )}

                            {mode === 'scan' && <QrScanner onCode={onScanned} onCancel={() => setMode('choose')} />}

                            {mode === 'pin' && (
                                <form onSubmit={onPin} noValidate className="grid gap-4 rounded-[20px] bg-white p-4 text-ink">
                                    <Field
                                        label="Buyer's 4-digit PIN"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        maxLength={4}
                                        placeholder="0000"
                                        value={pin}
                                        onChange={(e) => {
                                            setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                                            setPinError('');
                                        }}
                                        error={pinError}
                                    />
                                    <div className="flex gap-3">
                                        <Button type="submit" loading={busy}>
                                            Confirm delivery
                                        </Button>
                                        <Button variant="outline" disabled={busy} onClick={() => setMode('choose')}>
                                            Back
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </section>

                    {info.status === 'in_transit' && (
                        <section className="rounded-card bg-white p-6 md:p-8">
                            <h2 className="text-[22px]">Buyer not around?</h2>
                            <p className="mt-1 max-w-[34em] text-mute">
                                If you've delivered and {info.buyerName} can't or won't confirm, you can report it. They'll have {days}{' '}
                                {days === 1 ? 'day' : 'days'} to confirm or raise a problem before the seller is paid.
                            </p>
                            {confirmReport ? (
                                <div className="mt-4 grid gap-4 rounded-btn bg-mint p-4">
                                    <p>Only do this if you've actually handed over the item. Reporting a delivery that didn't happen can lose the seller their payment.</p>
                                    <div className="flex flex-wrap gap-3">
                                        <Button variant="dark" size="sm" loading={busy} onClick={report}>
                                            Yes, I delivered it
                                        </Button>
                                        <Button variant="outline" size="sm" disabled={busy} onClick={() => setConfirmReport(false)}>
                                            Go back
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4">
                                    <Button variant="outline" size="sm" onClick={() => setConfirmReport(true)}>
                                        Report delivered without a code
                                    </Button>
                                </div>
                            )}
                        </section>
                    )}
                </>
            )}
        </BuyerLayout>
    );
}