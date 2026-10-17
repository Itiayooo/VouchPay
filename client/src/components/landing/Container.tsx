import type { ReactNode } from 'react';

export default function Container({ children }: { children: ReactNode }) {
    return <div className="mx-auto w-[min(1180px,100%_-_40px)]">{children}</div>;
}