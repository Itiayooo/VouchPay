export default function Logo({ className = '' }: { className?: string }) {
    return (
        <span
            className={`inline-flex items-center gap-2 font-display text-2xl font-bold tracking-[-0.04em] text-ink ${className}`}
        >
            <svg viewBox="0 0 32 32" className="h-[30px] w-[30px]" aria-hidden="true">
                <rect width="32" height="32" rx="9" fill="#0B1F14" />
                <path
                    d="M8.5 16.8l5 5L23.5 10.5"
                    fill="none"
                    stroke="#6BE38A"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            VouchPay
        </span>
    );
}