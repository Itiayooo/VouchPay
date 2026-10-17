import { useId, type TextareaHTMLAttributes } from 'react';

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    hint?: string;
    error?: string;
}

export default function TextAreaField({ label, hint, error, className = '', ...rest }: Props) {
    const id = useId();
    const noteId = `${id}-note`;
    const note = error ?? hint;

    return (
        <div className={className}>
            <label htmlFor={id} className="mb-1.5 block text-[15px] font-semibold">
                {label}
            </label>
            <textarea
                id={id}
                rows={4}
                aria-invalid={Boolean(error)}
                aria-describedby={note ? noteId : undefined}
                className={`w-full resize-y rounded-btn border-[1.5px] bg-white px-4 py-3 text-[17px] text-ink placeholder:text-mute/60 focus:border-ink ${error ? 'border-alert' : 'border-line'
                    }`}
                {...rest}
            />
            {note && (
                <p id={noteId} className={`mt-1.5 text-sm ${error ? 'text-alert' : 'text-mute'}`}>
                    {note}
                </p>
            )}
        </div>
    );
}