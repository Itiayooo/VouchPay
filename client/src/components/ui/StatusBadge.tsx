import { STATUS } from '../../lib/status';
import Chip from './Chip';

export default function StatusBadge({ status }: { status: string }) {
    const s = STATUS[status] ?? { label: status, tone: 'muted' as const };
    return <Chip tone={s.tone}>{s.label}</Chip>;
}