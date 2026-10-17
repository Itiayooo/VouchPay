export function formatDate(iso: string): string {
    const d = new Date(iso);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

export function formatDateTime(date: string | Date): string {
    return new Date(date).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function timeAgo(iso: string): string {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}