import { useEffect, useState, type ReactNode } from 'react';

interface Props {
  value: number; // 0..n (can exceed 1 — overflow is drawn as a second lap)
  size?: number;
  stroke?: number;
  color: string; // CSS color, e.g. 'rgb(var(--food))'
  children?: ReactNode;
  label?: string;
}

/** Apple-style activity ring that animates from 0 on mount and on value change. */
export function ProgressRing({ value, size = 140, stroke = 14, color, children, label }: Props) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const lap1 = Math.min(shown, 1);
  const lap2 = Math.max(0, Math.min(shown - 1, 1));
  const transition = 'stroke-dashoffset 1100ms cubic-bezier(.2,.8,.2,1)';

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity={0.16} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - lap1)}
          style={{ transition }}
        />
        {lap2 > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - lap2)}
            style={{ transition, filter: 'brightness(1.25) drop-shadow(0 0 3px rgb(0 0 0 / .5))' }}
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
