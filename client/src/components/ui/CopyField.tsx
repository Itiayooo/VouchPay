import { useRef, useState } from 'react';
import Button from './Button';

export default function CopyField({ value, label, dark = false }: { value: string; label: string; dark?: boolean }) {
    const [copied, setCopied] = useState(false);
    const ref = useRef<HTMLInputElement>(null);

    async function copy() {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            ref.current?.select(); // clipboard blocked: select it so Ctrl+C works
        }
    }

    return (
        <div>
            <div className="flex flex-col gap-2 sm:flex-row">
                <input
                    ref={ref}
                    readOnly
                    aria-label={label}
                    value={value}
                    onFocus={(e) => e.currentTarget.select()}
                    className={`h-[52px] min-w-0 flex-1 rounded-btn border-[1.5px] px-4 ${dark ? 'border-night-line bg-night text-white focus:border-leaf' : 'border-line bg-white text-ink focus:border-ink'
                        }`}
                />
                <Button onClick={copy}>{copied ? 'Copied' : 'Copy link'}</Button>
            </div>
            <span className="sr-only" aria-live="polite">
                {copied ? `${label} copied` : ''}
            </span>
        </div>
    );
}