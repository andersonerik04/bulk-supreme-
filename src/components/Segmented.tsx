interface Props<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  accent?: string; // tailwind bg class for the active pill
  size?: 'sm' | 'md';
}

/** iOS-style segmented control with a sliding active pill. */
export function Segmented<T extends string>({ options, value, onChange, accent = 'bg-surface', size = 'md' }: Props<T>) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className="relative grid rounded-2xl bg-elevated p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }} role="tablist">
      <div
        className={`absolute bottom-1 top-1 rounded-xl shadow-sm transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] ${accent}`}
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${idx * 100}%)`, left: 4 }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`relative z-10 rounded-xl font-semibold transition-colors ${size === 'sm' ? 'py-1.5 text-xs' : 'py-2.5 text-sm'} ${o.value === value ? 'text-ink' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
