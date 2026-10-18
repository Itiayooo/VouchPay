import { thumbUrl } from '../../lib/image';

export default function EvidenceGallery({ urls }: { urls?: string[] }) {
    if (!urls || urls.length === 0) return null;
    return (
        <ul className="mt-3 flex flex-wrap gap-2">
            {urls.map((url, i) => (
                <li key={url}>
                    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open photo ${i + 1} full size`}>
                        <img src={thumbUrl(url)} alt={`Evidence photo ${i + 1}`} loading="lazy" className="h-24 w-24 rounded-btn object-cover" />
                    </a>
                </li>
            ))}
        </ul>
    );
}