interface Props {
    value: 'local' | 'courier';
    onChange: (v: 'local' | 'courier') => void;
}

const OPTIONS = [
    {
        value: 'local' as const,
        title: 'Local handover',
        text: "You or a rider hand it over in person. The buyer shows a QR code or reads a 4-digit PIN, and you're paid straight away.",
    },
    {
        value: 'courier' as const,
        title: 'Courier or interstate',
        text: "A courier or park driver carries it. The buyer confirms in the app once they've collected it.",
    },
];

export default function DeliveryTypePicker({ value, onChange }: Props) {
    return (
        <fieldset>
            <legend className="mb-1.5 text-[15px] font-semibold">How will it reach the buyer?</legend>
            <div className="grid gap-3 md:grid-cols-2">
                {OPTIONS.map((o) => (
                    <label
                        key={o.value}
                        className="flex cursor-pointer gap-3 rounded-[18px] border-[1.5px] border-line bg-white p-4 has-[:checked]:border-ink has-[:checked]:bg-mint has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink"
                    >
                        <input
                            type="radio"
                            name="deliveryType"
                            value={o.value}
                            checked={value === o.value}
                            onChange={() => onChange(o.value)}
                            className="mt-1.5 h-4 w-4 shrink-0 accent-forest"
                        />
                        <span>
                            <b className="block font-bold">{o.title}</b>
                            <span className="text-[15px] text-mute">{o.text}</span>
                        </span>
                    </label>
                ))}
            </div>
            <p className="mt-2 text-sm text-mute">
                If the buyer goes quiet after delivery is reported, payment is released automatically after{' '}
                {value === 'local' ? '3 days' : '5 days'}, unless they open a dispute.
            </p>
        </fieldset>
    );
}