import { useState, type InputHTMLAttributes } from 'react';
import Field from '../ui/Field';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label: string;
    error?: string;
    hint?: string;
}

export default function PasswordField(props: Props) {
    const [show, setShow] = useState(false);
    return (
        <Field
            {...props}
            type={show ? 'text' : 'password'}
            trailing={
                <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-pressed={show}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    className="rounded-lg px-3 py-1.5 text-sm font-semibold text-forest hover:bg-mint"
                >
                    {show ? 'Hide' : 'Show'}
                </button>
            }
        />
    );
}