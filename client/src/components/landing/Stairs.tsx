export default function Stairs({ kind }: { kind: 'check' | 'lock' }) {
    const w = 56;
    const G = 330;
    const x0 = 70;
    const steps = [3, 2, 1, 0].map((i) => {
        const h = 50 + i * 44;
        return { x: x0 + i * w, h, t: G - (i * w) / 2 - h };
    });
    const cx = x0 + 3 * w;
    const b = G - (3 * w) / 2 - 182 + w / 2;
    const L = `L${kind}`;
    const R = `R${kind}`;

    return (
        <svg viewBox="0 0 320 400" className="block h-auto w-full" aria-hidden="true">
            <defs>
                <pattern id={L} width="4" height="4" patternUnits="userSpaceOnUse">
                    <rect width="4" height="4" fill="#A5ECBC" />
                    <rect width="1.2" height="4" fill="#BDF2CD" />
                </pattern>
                <pattern id={R} width="4" height="4" patternUnits="userSpaceOnUse">
                    <rect width="4" height="4" fill="#C4F5D4" />
                    <rect width="1.2" height="4" fill="#DDFAE7" />
                </pattern>
            </defs>

            {steps.map(({ x, h, t }) => (
                <g key={x}>
                    <polygon
                        points={`${x - w},${t + w / 2} ${x},${t + w} ${x},${t + w + h} ${x - w},${t + w / 2 + h}`}
                        fill={`url(#${L})`}
                        stroke="#fff"
                        strokeOpacity=".7"
                    />
                    <polygon
                        points={`${x},${t + w} ${x + w},${t + w / 2} ${x + w},${t + w / 2 + h} ${x},${t + w + h}`}
                        fill={`url(#${R})`}
                        stroke="#fff"
                        strokeOpacity=".7"
                    />
                    <polygon
                        points={`${x},${t} ${x + w},${t + w / 2} ${x},${t + w} ${x - w},${t + w / 2}`}
                        fill="#fff"
                        stroke="#fff"
                    />
                </g>
            ))}

            {kind === 'check' ? (
                <g>
                    <polygon points={`${cx - 32},${b - 44} ${cx},${b - 28} ${cx},${b + 16} ${cx - 32},${b}`} fill="#3FBF69" />
                    <polygon points={`${cx},${b - 28} ${cx + 32},${b - 44} ${cx + 32},${b} ${cx},${b + 16}`} fill="#6BE38A" />
                    <polygon points={`${cx},${b - 60} ${cx + 32},${b - 44} ${cx},${b - 28} ${cx - 32},${b - 44}`} fill="#A8F2BE" />
                    <circle cx={cx + 16} cy={b - 14} r="11" fill="#fff" stroke="#0B1F14" strokeWidth="2.4" />
                    <path
                        d={`M${cx + 11} ${b - 14}l3.6 3.6 6.4-7.2`}
                        fill="none"
                        stroke="#0B1F14"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </g>
            ) : (
                <g>
                    <path
                        d={`M${cx - 13} ${b - 36}v-15a13 13 0 0 1 26 0v15`}
                        fill="none"
                        stroke="#167D44"
                        strokeWidth="8"
                        strokeLinecap="round"
                    />
                    <rect x={cx - 24} y={b - 38} width="48" height="42" rx="12" fill="#167D44" />
                    <circle cx={cx} cy={b - 21} r="5" fill="#D9F8E3" />
                    <rect x={cx - 2} y={b - 19} width="4" height="10" rx="2" fill="#D9F8E3" />
                </g>
            )}
        </svg>
    );
}