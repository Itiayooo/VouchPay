import { useRef, useState, type ChangeEvent } from 'react';
import { ApiError } from '../../api/client';
import { uploadToCloudinary, type UploadSignature } from '../../api/uploads';
import { compressImage, thumbUrl } from '../../lib/image';
import Button from './Button';
import FormError from './FormError';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024;

interface Props {
    label?: string;
    hint?: string;
    value: string[];
    onChange: (urls: string[]) => void;
    getSignature: () => Promise<UploadSignature>;
    onBusyChange?: (busy: boolean) => void;
    max?: number;
    disabled?: boolean;
}

export default function PhotoPicker({
    label = 'Photos',
    hint,
    value,
    onChange,
    getSignature,
    onBusyChange,
    max = 5,
    disabled = false,
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    async function onPick(e: ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        e.target.value = '';
        if (files.length === 0) return;

        setError('');
        if (files.length > max - value.length) {
            setError(`You can add up to ${max} photos.`);
            return;
        }
        if (files.some((f) => !TYPES.includes(f.type))) {
            setError('Only JPG, PNG or WebP photos can be added.');
            return;
        }

        setUploading(true);
        onBusyChange?.(true);
        let current = value;
        try {
            const sig = await getSignature();
            for (const file of files) {
                const blob = await compressImage(file);
                if (blob.size > MAX_BYTES) throw new Error('That photo is too large. Try a smaller one.');
                current = [...current, await uploadToCloudinary(blob, sig)];
                onChange(current); // keep each photo as soon as it lands
            }
        } catch (err) {
            setError(err instanceof ApiError || err instanceof Error ? err.message : 'The upload failed. Try again.');
        } finally {
            setUploading(false);
            onBusyChange?.(false);
        }
    }

    return (
        <div>
            <p className="mb-1.5 text-[15px] font-semibold">{label}</p>

            {value.length > 0 && (
                <ul className="mb-3 flex flex-wrap gap-3">
                    {value.map((url, i) => (
                        <li key={url} className="relative">
                            <img src={thumbUrl(url)} alt={`Photo ${i + 1}`} className="h-20 w-20 rounded-btn object-cover" />
                            <button
                                type="button"
                                aria-label={`Remove photo ${i + 1}`}
                                disabled={disabled || uploading}
                                onClick={() => onChange(value.filter((u) => u !== url))}
                                className="absolute -top-2 -right-2 grid h-7 w-7 place-items-center rounded-full bg-ink text-[16px] leading-none text-white disabled:opacity-50"
                            >
                                ×
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={onPick}
            />
            <div className="grid gap-2">
                <FormError message={error} />
                <div>
                    <Button
                        variant="outline"
                        size="sm"
                        loading={uploading}
                        disabled={disabled || value.length >= max}
                        onClick={() => inputRef.current?.click()}
                    >
                        {uploading ? 'Uploading…' : value.length > 0 ? 'Add more photos' : 'Add photos'}
                    </Button>
                </div>
                {hint && <p className="text-sm text-mute">{hint}</p>}
            </div>
        </div>
    );
}