import { format } from 'date-fns';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { WeightUnit } from '@/db/types';
import { usePalette } from '@/hooks/usePalette';
import { fmtInt } from '@/utils/format';
import { TooltipCard, TooltipRow } from './ChartTooltip';
import { tickFormatter } from './axis';

export interface CorrPoint {
  ts: number;
  weight?: number; // rolling avg, display units
  calories?: number; // 7-day avg
}

/** Dual-axis overlay: smoothed weight (line) vs 7-day average calories (area). */
export function CorrelationChart({ data, unit, domain }: { data: CorrPoint[]; unit: WeightUnit; domain: [number, number] }) {
  const c = usePalette();
  const span = (domain[1] - domain[0]) / 86_400_000;
  const ws = data.map((d) => d.weight).filter((x): x is number => x != null);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: -12, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="corr-cal" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={c.food} stopOpacity={0.35} />
            <stop offset="1" stopColor={c.food} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={c.grid} />
        <XAxis dataKey="ts" type="number" scale="time" domain={domain} tickFormatter={tickFormatter(span)} tickLine={false} axisLine={false} minTickGap={28} />
        <YAxis yAxisId="w" domain={ws.length ? [Math.floor(Math.min(...ws) - 1), Math.ceil(Math.max(...ws) + 1)] : ['auto', 'auto']} tickLine={false} axisLine={false} width={44} tick={{ fill: c.weight }} />
        <YAxis yAxisId="c" orientation="right" domain={[0, 'dataMax + 400']} tickLine={false} axisLine={false} width={44} tick={{ fill: c.food }} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`)} />
        <Tooltip
          cursor={{ stroke: c.muted, strokeOpacity: 0.3 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as CorrPoint;
            return (
              <TooltipCard title={format(p.ts, 'EEE, MMM d')}>
                {p.weight != null && <TooltipRow color={c.weight} label="Weight trend" value={`${p.weight.toFixed(1)} ${unit}`} />}
                {p.calories != null && <TooltipRow color={c.food} label="7-day avg cal" value={fmtInt(p.calories)} />}
              </TooltipCard>
            );
          }}
        />
        <Area yAxisId="c" dataKey="calories" type="monotone" stroke={c.food} strokeWidth={1.5} fill="url(#corr-cal)" connectNulls animationDuration={1000} />
        <Line yAxisId="w" dataKey="weight" type="monotone" stroke={c.weight} strokeWidth={3} dot={false} connectNulls animationDuration={1200} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
