import { useId } from 'react';

/** Minimal smoothed area sparkline (avoids pulling the charting library into the main bundle). */
export function Sparkline({ values, color, height = 64 }: { values: number[]; color: string; height?: number }) {
  const id = useId().replace(/:/g, '');
  const w = 300;
  const pad = 4;
  const lo = Math.min(...values) - 0.5;
  const hi = Math.max(...values) + 0.5;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, pad + (1 - (v - lo) / (hi - lo)) * (height - pad * 2)] as const);
  // Catmull-Rom → cubic Bézier for a smooth line
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1] ?? pts[i], pts[i], pts[i + 1], pts[i + 2] ?? pts[i + 1]];
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  const area = `${d} L${w},${height} L0,${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={0.35} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp-${id})`} className="animate-fade-in" />
      <path d={d} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" pathLength={1} strokeDasharray={1} className="spark-draw" />
      <circle cx={last[0]} cy={last[1]} r={3.5} fill={color} />
    </svg>
  );
}
