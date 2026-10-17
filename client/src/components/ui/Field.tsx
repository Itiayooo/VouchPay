import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    hint?: string;
    trailing?: ReactNode;
    leading?: ReactNode;
}

export default function Field({ label, error, hint, trailing, leading, className = '', ...rest }: Props) {
    const id = useId();
    const noteId = `${id}-note`;
    const note = error ?? hint;

    return (
        <div className={className}>
            <label htmlFor={id} className="mb-1.5 block text-[15px] font-semibold">
                {label}
            </label>
            <div className="relative">
                {leading && (
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-display text-[18px] text-mute">
                        {leading}
                    </span>
                )}
                <input
                    id={id}
                    aria-invalid={Boolean(error)}
                    aria-describedby={note ? noteId : undefined}
                    className={`h-[52px] w-full rounded-btn border-[1.5px] bg-white px-4 text-[17px] text-ink placeholder:text-mute/60 focus:border-ink ${error ? 'border-alert' : 'border-line'
                        } ${trailing ? 'pr-20' : ''} ${leading ? 'pl-10' : ''}`}
                    {...rest}
                />
                {trailing && <div className="absolute inset-y-0 right-2 flex items-center">{trailing}</div>}
            </div>
            {note && (
                <p id={noteId} className={`mt-1.5 text-sm ${error ? 'text-alert' : 'text-mute'}`}>
                    {note}
                </p>
            )}
        </div>
    );
}