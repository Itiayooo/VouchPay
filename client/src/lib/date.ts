export function formatDate(iso: string): string {
    const d = new Date(iso);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}