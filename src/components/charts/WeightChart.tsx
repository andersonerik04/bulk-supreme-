import { format } from 'date-fns';
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import type { WeightUnit } from '@/db/types';
import { usePalette } from '@/hooks/usePalette';
import { TooltipCard, TooltipRow } from './ChartTooltip';
import { tickFormatter } from './axis';

export interface WeightPoint {
  ts: number;
  weight: number; // display units
  avg?: number;
}

interface Props {
  data: WeightPoint[];
  unit: WeightUnit;
  goal?: number; // display units
  domain: [number, number]; // x domain (ms)
}

export function WeightChart({ data, unit, goal, domain }: Props) {
  const c = usePalette();
  const span = (domain[1] - domain[0]) / 86_400_000;
  const ys = data.flatMap((d) => [d.weight, d.avg ?? d.weight]);
  if (goal != null) ys.push(goal);
  const lo = Math.floor(Math.min(...ys) - 1);
  const hi = Math.ceil(Math.max(...ys) + 1);
  const dense = data.length > 120;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <CartesianGrid vertical={false} stroke={c.grid} />
        <XAxis dataKey="ts" type="number" scale="time" domain={domain} tickFormatter={tickFormatter(span)} tickLine={false} axisLine={false} minTickGap={28} />
        <YAxis domain={[lo, hi]} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
        {goal != null && (
          <ReferenceLine y={goal} stroke={c.fat} strokeDasharray="5 5" strokeOpacity={0.8} label={{ value: `Goal ${goal}`, position: 'insideBottomRight', fill: c.fat, fontSize: 11 }} />
        )}
        <Tooltip
          cursor={{ stroke: c.muted, strokeOpacity: 0.3 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as WeightPoint;
            return (
              <TooltipCard title={format(p.ts, 'EEE, MMM d')}>
                <TooltipRow color={c.weight} label="Weigh-in" value={`${p.weight.toFixed(1)} ${unit}`} />
                {p.avg != null && <TooltipRow color={c.ink} label="7-day avg" value={`${p.avg.toFixed(1)} ${unit}`} />}
              </TooltipCard>
            );
          }}
        />
        <Scatter dataKey="weight" fill={c.weight} fillOpacity={0.45} shape={(props: { cx?: number; cy?: number }) => <circle cx={props.cx} cy={props.cy} r={dense ? 1.8 : 3} fill={c.weight} fillOpacity={0.5} />} animationDuration={600} />
        <Line dataKey="avg" type="monotone" stroke={c.weight} strokeWidth={3} dot={false} filter="url(#glow)" animationDuration={1200} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
