import type { ReactNode } from 'react';
import type { Tone } from '../../lib/status';

const tones: Record<Tone, string> = {
    leaf: 'bg-leaf text-ink',
    ink: 'bg-ink text-leaf',
    mint: 'bg-mint text-forest',
    amber: 'bg-sand text-amber',
    alert: 'bg-alert-bg text-alert',
    muted: 'bg-line text-mute',
};

export default function Chip({
    tone = 'leaf',
    dot = true,
    children,
}: {
    tone?: Tone;
    dot?: boolean;
    children: ReactNode;
}) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold leading-none ${tones[tone]}`}
        >
            {dot && <i className="h-2 w-2 rounded-full bg-current" />}
            {children}
        </span>
    );
}