import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import type { MessageInput } from '../../api/thread';
import type { ThreadMessage } from '../../api/types';
import type { UploadSignature } from '../../api/uploads';
import { formatDateTime } from '../../lib/date';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import FormError from '../ui/FormError';
import PhotoPicker from '../ui/PhotoPicker';
import TextAreaField from '../ui/TextAreaField';
import EvidenceGallery from './EvidenceGallery';

type Viewer = 'buyer' | 'vendor' | 'admin';

interface Props {
    viewer: Viewer;
    locked: boolean;
    load: () => Promise<ThreadMessage[]>;
    send: (input: MessageInput) => Promise<unknown>;
    getSignature?: () => Promise<UploadSignature>;
    onChanged?: () => Promise<void>;
}

const WHO: Record<Viewer, string> = { buyer: 'Buyer', vendor: 'Seller', admin: 'VouchPay mediator' };

const HINT: Record<Viewer, string> = {
    buyer: 'The mediator and the seller can read this. Messages can’t be edited or deleted.',
    vendor: 'The mediator and the buyer can read this. Messages can’t be edited or deleted.',
    admin: 'The buyer and the seller can both read this and will get an email. Messages can’t be edited or deleted.',
};

export default function DisputeThread({ viewer, locked, load, send, getSignature, onChanged }: Props) {
    const loadRef = useRef(load);
    const sendRef = useRef(send);
    useEffect(() => {
        loadRef.current = load;
        sendRef.current = send;
    });

    const [messages, setMessages] = useState<ThreadMessage[] | null>(null);
    const [loadError, setLoadError] = useState('');
    const [text, setText] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [question, setQuestion] = useState(false);
    const [fieldError, setFieldError] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let stale = false;
        const fetchAll = async () => {
            try {
                const m = await loadRef.current();
                if (!stale) {
                    setMessages(m);
                    setLoadError('');
                }
            } catch (err) {
                if (!stale) setLoadError(err instanceof ApiError ? err.message : 'Could not load the conversation.');
            }
        };
        void fetchAll();
        if (locked) return () => {
            stale = true;
        };
        const timer = setInterval(() => {
            if (!document.hidden) void fetchAll();
        }, 20_000);
        return () => {
            stale = true;
            clearInterval(timer);
        };
    }, [locked]);

    async function submit(e: FormEvent) {
        e.preventDefault();
        const value = text.trim();
        if (value.length < 2) {
            setFieldError('Write at least 2 characters.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            await sendRef.current({ text: value, evidence: photos, isQuestion: viewer === 'admin' && question });
            setText('');
            setPhotos([]);
            setQuestion(false);
            setMessages(await loadRef.current());
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
            void onChanged?.(); // the dispute may have just been resolved
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="mt-6 border-t border-line pt-6">
            <h3 className="text-[22px]">Conversation</h3>

            {loadError ? (
                <div className="mt-3">
                    <FormError message={loadError} />
                </div>
            ) : !messages ? (
                <div className="mt-3 h-12 animate-pulse rounded-lg bg-line/70" aria-hidden="true" />
            ) : messages.length === 0 ? (
                <p className="mt-3 text-mute">
                    {locked
                        ? 'No messages were sent.'
                        : viewer === 'admin'
                            ? 'No messages yet. Ask either side for more details here.'
                            : "No messages yet. If the mediator needs more from you, they'll ask here and email you."}
                </p>
            ) : (
                <ol className="mt-4 grid gap-3" aria-live="polite">
                    {messages.map((m) => {
                        const mediator = m.role === 'admin';
                        return (
                            <li key={m.id} className={`rounded-btn p-4 ${mediator ? 'bg-ink text-white' : 'bg-mint'}`}>
                                <div className={`flex flex-wrap items-center gap-2 text-sm ${mediator ? 'text-night-mute' : 'text-mute'}`}>
                                    <b className={mediator ? 'text-white' : 'text-ink'}>{m.role === viewer ? 'You' : WHO[m.role]}</b>
                                    <span>{formatDateTime(m.createdAt)}</span>
                                    {m.isQuestion && <Chip tone="amber">Question</Chip>}
                                </div>
                                <p className="mt-1.5 whitespace-pre-wrap">{m.text}</p>
                                <EvidenceGallery urls={m.evidence} />
                            </li>
                        );
                    })}
                </ol>
            )}

            {locked ? (
                <p className="mt-4 rounded-btn bg-line/60 px-4 py-3 text-mute">
                    This dispute is resolved, so the conversation is locked. You can still read it.
                </p>
            ) : (
                <form onSubmit={submit} noValidate className="mt-5 grid gap-4">
                    <FormError message={error} />
                    <TextAreaField
                        label={viewer === 'admin' ? 'Message to the buyer and the seller' : 'Message to the mediator'}
                        hint={HINT[viewer]}
                        maxLength={1500}
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value);
                            setFieldError('');
                        }}
                        error={fieldError}
                    />
                    {getSignature && (
                        <PhotoPicker
                            label="Photos (optional)"
                            value={photos}
                            onChange={setPhotos}
                            getSignature={getSignature}
                            onBusyChange={setUploading}
                            disabled={busy}
                        />
                    )}
                    {viewer === 'admin' && (
                        <label className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={question}
                                onChange={(e) => setQuestion(e.target.checked)}
                                className="mt-1.5 h-4 w-4 shrink-0 accent-forest"
                            />
                            <span>This is a question that needs an answer. It's marked so both sides notice it.</span>
                        </label>
                    )}
                    <div>
                        <Button type="submit" size="sm" loading={busy} disabled={uploading}>
                            Send message
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}