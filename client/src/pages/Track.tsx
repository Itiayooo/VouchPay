import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import BuyerLayout from '../components/buyer/BuyerLayout';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';

export default function Track() {
    const navigate = useNavigate();
    const [value, setValue] = useState('');
    const [error, setError] = useState('');

    function onSubmit(e: FormEvent) {
        e.preventDefault();
        // Accepts a bare reference or the whole link the seller sent
        const match = value.match(/VP-\d{4}-[A-Z0-9]{6}/i);
        if (!match) {
            setError('Enter a reference like VP-2026-ABC123, or paste the link the seller sent you.');
            return;
        }
        navigate(`/pay/${match[0].toUpperCase()}`);
    }

    return (
        <BuyerLayout>
            <section className="rounded-card bg-white p-6 md:p-8">
                <h1 className="text-[clamp(30px,5vw,40px)] font-medium tracking-[-0.05em]">Track your order</h1>
                <p className="mt-2 max-w-[32em] text-mute">
                    Paste the link the seller sent you, or type the reference. You'll see where your order stands.
                </p>
                <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-5">
                    <Field
                        label="Reference or link"
                        placeholder="VP-2026-ABC123"
                        autoComplete="off"
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value);
                            setError('');
                        }}
                        error={error}
                    />
                    <Button type="submit" className="w-full sm:w-fit">
                        Find my order
                    </Button>
                </form>
            </section>
        </BuyerLayout>
    );
}