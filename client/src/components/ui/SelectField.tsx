import { useId, type ReactNode, type SelectHTMLAttributes } from 'react';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    hint?: string;
    error?: string;
    children: ReactNode;
}

export default function SelectField({ label, hint, error, className = '', children, ...rest }: Props) {
    const id = useId();
    const noteId = `${id}-note`;
    const note = error ?? hint;

    return (
        <div className={className}>
            <label htmlFor={id} className="mb-1.5 block text-[15px] font-semibold">
                {label}
            </label>
            <select
                id={id}
                aria-invalid={Boolean(error)}
                aria-describedby={note ? noteId : undefined}
                className={`h-[52px] w-full rounded-btn border-[1.5px] bg-white px-4 text-[17px] text-ink focus:border-ink ${error ? 'border-alert' : 'border-line'
                    }`}
                {...rest}
            >
                {children}
            </select>
            {note && (
                <p id={noteId} className={`mt-1.5 text-sm ${error ? 'text-alert' : 'text-mute'}`}>
                    {note}
                </p>
            )}
        </div>
    );
}