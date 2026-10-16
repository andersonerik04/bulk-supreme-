import { useEffect, useId, useState } from 'react';

/** A glass that fills with an animated wave toward `value` (0..1+). */
export function WaterGlass({ value, height = 200 }: { value: number; height?: number }) {
  const id = useId().replace(/:/g, '');
  const [level, setLevel] = useState(0);
  useEffect(() => {
    const r = requestAnimationFrame(() => setLevel(Math.min(value, 1)));
    return () => cancelAnimationFrame(r);
  }, [value]);

  // Glass interior spans y=12..152 in a 120x160 viewBox.
  const top = 12;
  const h = 140;
  const y = top + h * (1 - level) - 6 + (level <= 0 ? 14 : 0); // fully hide the wave when empty
  const wave = (amp: number) => `M0 6 Q 15 ${6 - amp} 30 6 T 60 6 T 90 6 T 120 6 T 150 6 T 180 6 T 210 6 T 240 6 V 200 H 0 Z`;

  return (
    <svg viewBox="0 0 120 160" style={{ height }} className="overflow-visible" role="img" aria-label={`Water ${Math.round(value * 100)}% of goal`}>
      <defs>
        <clipPath id={`g-${id}`}>
          <path d="M14 10 L106 10 L96 150 Q95 156 89 156 L31 156 Q25 156 24 150 Z" />
        </clipPath>
        <linearGradient id={`w-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="rgb(var(--water))" stopOpacity="0.95" />
          <stop offset="1" stopColor="rgb(var(--water))" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#g-${id})`}>
        <rect x="0" y="0" width="120" height="160" fill="rgb(var(--water) / 0.08)" />
        <g style={{ transform: `translateY(${y}px)`, transition: 'transform 1200ms cubic-bezier(.2,.8,.2,1)' }}>
          <path d={wave(5)} fill="rgb(var(--water) / 0.35)" className="animate-wave" style={{ animationDuration: '6s' }} />
          <path d={wave(4)} fill={`url(#w-${id})`} className="animate-wave" transform="translate(0 3)" style={{ animationDuration: '3.6s', animationDirection: 'reverse' }} />
        </g>
        {/* bubbles */}
        {level > 0.08 &&
          [22, 52, 78].map((x, i) => (
            <circle key={x} cx={x + 10} cy="148" r={1.6 + i * 0.4} fill="white" opacity="0.35">
              <animate attributeName="cy" from="150" to={Math.max(y + 12, 20)} dur={`${2.4 + i * 0.9}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;.45;0" dur={`${2.4 + i * 0.9}s`} repeatCount="indefinite" />
            </circle>
          ))}
      </g>
      <path d="M14 10 L106 10 L96 150 Q95 156 89 156 L31 156 Q25 156 24 150 Z" fill="none" stroke="rgb(var(--line) / 0.18)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M22 22 L28 130" stroke="white" strokeOpacity="0.12" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
