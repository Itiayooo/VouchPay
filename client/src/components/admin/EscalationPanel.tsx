import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { addNote, deescalateDispute, escalateDispute, getNotes } from '../../api/admin';
import { ApiError } from '../../api/client';
import type { DisputeNote, Transaction } from '../../api/types';
import { formatDateTime } from '../../lib/date';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import FormError from '../ui/FormError';
import TextAreaField from '../ui/TextAreaField';

type Mode = 'note' | 'escalate' | 'deescalate';

const KIND: Record<DisputeNote['kind'], string> = {
    note: 'Note',
    escalated: 'Escalated for legal review',
    deescalated: 'Returned to normal review',
};

const FORM: Record<Mode, { label: string; hint: string; button: string; min: number }> = {
    note: {
        label: 'Private note',
        hint: "Only admins can see this. Notes can't be edited or deleted, so they stay as a record.",
        button: 'Add note',
        min: 3,
    },
    escalate: {
        label: "Why can't this be settled here?",
        hint: 'The money stays held. Both sides are told it needs extended review, without your reason.',
        button: 'Escalate for legal review',
        min: 10,
    },
    deescalate: {
        label: 'Why is it going back to normal review?',
        hint: 'This puts it back in the normal queue so a mediator can decide it.',
        button: 'Return to normal review',
        min: 10,
    },
};

export default function EscalationPanel({ t, onChanged }: { t: Transaction; onChanged: () => Promise<void> }) {
    const open = t.status === 'disputed' && t.dispute?.status === 'open';
    const escalated = Boolean(t.dispute?.escalated);

    const [notes, setNotes] = useState<DisputeNote[] | null>(null);
    const [loadError, setLoadError] = useState('');
    const [mode, setMode] = useState<Mode>('note');
    const [text, setText] = useState('');
    const [fieldError, setFieldError] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            setNotes(await getNotes(t.id));
            setLoadError('');
        } catch (err) {
            setLoadError(err instanceof ApiError ? err.message : 'Could not load the notes.');
        }
    }, [t.id]);

    useEffect(() => {
        void load();
    }, [load, escalated]);

    function switchMode(next: Mode) {
        setMode(next);
        setText('');
        setFieldError('');
        setError('');
    }

    async function submit(e: FormEvent) {
        e.preventDefault();
        const f = FORM[mode];
        const value = text.trim();
        if (value.length < f.min) {
            setFieldError(`Write at least ${f.min} characters.`);
            return;
        }
        setBusy(true);
        setError('');
        try {
            if (mode === 'note') await addNote(t.id, value);
            else if (mode === 'escalate') await escalateDispute(t.id, value);
            else await deescalateDispute(t.id, value);
            setText('');
            setMode('note');
            await load();
            await onChanged();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
            void onChanged();
        } finally {
            setBusy(false);
        }
    }

    const f = FORM[mode];

    return (
        <section aria-labelledby="notes-title" className="rounded-card bg-white p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
                <h2 id="notes-title" className="text-[26px]">Internal notes</h2>
                <Chip tone="muted">Admins only</Chip>
                {escalated && <Chip tone="alert">Legal review</Chip>}
            </div>

            {open && escalated && (
                <p className="mt-4 rounded-btn bg-sand px-4 py-3 text-amber">
                    On legal hold since {t.dispute?.escalatedAt ? formatDateTime(t.dispute.escalatedAt) : 'earlier'}. The money
                    stays held. Don't apply a decision until you have the legal outcome or written instructions.
                </p>
            )}

            {loadError ? (
                <div className="mt-4">
                    <FormError message={loadError} />
                </div>
            ) : !notes ? (
                <div className="mt-4 h-12 animate-pulse rounded-lg bg-line/70" aria-hidden="true" />
            ) : notes.length === 0 ? (
                <p className="mt-4 text-mute">No notes yet.</p>
            ) : (
                <ol className="mt-5 grid gap-3">
                    {notes.map((n) => (
                        <li key={n.id} className="rounded-btn bg-mint p-4">
                            <div className="flex flex-wrap items-center gap-2 text-sm text-mute">
                                {n.kind !== 'note' && <Chip tone={n.kind === 'escalated' ? 'alert' : 'muted'}>{KIND[n.kind]}</Chip>}
                                <span>
                                    {n.author?.name ?? 'Admin'}, {formatDateTime(n.createdAt)}
                                </span>
                            </div>
                            <p className="mt-1.5 whitespace-pre-wrap">{n.text}</p>
                        </li>
                    ))}
                </ol>
            )}

            {open && (
                <form onSubmit={submit} noValidate className="mt-6 grid gap-4 border-t border-line pt-6">
                    <FormError message={error} />
                    <TextAreaField
                        label={f.label}
                        hint={f.hint}
                        maxLength={mode === 'note' ? 2000 : 1000}
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value);
                            setFieldError('');
                        }}
                        error={fieldError}
                    />
                    <div className="flex flex-wrap gap-3">
                        <Button type="submit" size="sm" loading={busy} variant={mode === 'escalate' ? 'dark' : 'primary'}>
                            {f.button}
                        </Button>
                        {mode === 'note' ? (
                            <Button variant="outline" size="sm" disabled={busy} onClick={() => switchMode(escalated ? 'deescalate' : 'escalate')}>
                                {escalated ? 'Return to normal review' : 'Escalate for legal review'}
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm" disabled={busy} onClick={() => switchMode('note')}>
                                Cancel
                            </Button>
                        )}
                    </div>
                </form>
            )}
        </section>
    );
}