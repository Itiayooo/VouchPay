import type { InputHTMLAttributes } from 'react';
import { digitsOnly, withCommas } from '../../lib/money';
import Field from './Field';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
    label: string;
    value: string;
    onValueChange: (digits: string) => void;
    error?: string;
    hint?: string;
}

export default function MoneyField({ value, onValueChange, ...rest }: Props) {
    return (
        <Field
            {...rest}
            leading="₦"
            inputMode="numeric"
            autoComplete="off"
            value={withCommas(value)}
            onChange={(e) => onValueChange(digitsOnly(e.target.value))}
        />
    );
}