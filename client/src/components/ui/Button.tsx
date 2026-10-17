import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'outline' | 'dark';
type Size = 'md' | 'sm';

const base =
    'inline-flex items-center justify-center gap-2 rounded-btn font-bold whitespace-nowrap transition duration-150 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50';

const variants: Record<Variant, string> = {
    primary: 'bg-leaf text-ink hover:bg-leaf-hover',
    outline: 'bg-white text-ink shadow-[inset_0_0_0_2px_var(--color-ink)] hover:bg-mint',
    dark: 'bg-ink text-white hover:bg-night',
};

const sizes: Record<Size, string> = {
    md: 'px-7 py-4 text-[17px]',
    sm: 'px-5 py-2.5 text-[15.5px]',
};

// Use this on <Link> so links and buttons look identical
export const buttonStyles = (variant: Variant = 'primary', size: Size = 'md') =>
    `${base} ${variants[variant]} ${sizes[size]}`;

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
}

export default function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    type = 'button',
    className = '',
    disabled,
    children,
    ...rest
}: Props) {
    return (
        <button
            type={type}
            className={`${buttonStyles(variant, size)} ${className}`}
            disabled={disabled || loading}
            {...rest}
        >
            {loading && (
                <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                    aria-hidden="true"
                />
            )}
            {children}
        </button>
    );
}