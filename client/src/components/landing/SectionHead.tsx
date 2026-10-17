import type { ReactNode } from 'react';

interface Props {
    title: ReactNode;
    children: ReactNode;
    action?: ReactNode;
    textClassName?: string;
}

export default function SectionHead({ title, children, action, textClassName = 'text-mute' }: Props) {
    return (
        <div className="grid items-start gap-[18px] md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_auto] md:gap-10">
            <h2 className="text-[clamp(36px,5.6vw,60px)]">{title}</h2>
            <p className={`max-w-[32em] text-[18px] ${textClassName}`}>{children}</p>
            {action && <div className="justify-self-start md:justify-self-end">{action}</div>}
        </div>
    );
}