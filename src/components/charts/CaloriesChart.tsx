import { format } from 'date-fns';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { usePalette } from '@/hooks/usePalette';
import { fmtInt } from '@/utils/format';
import { TooltipCard, TooltipRow } from './ChartTooltip';
import { tickFormatter } from './axis';

export interface CaloriePoint {
  ts: number;
  calories: number;
  label: string;
}

export function CaloriesChart({ data, target, weekly, domain }: { data: CaloriePoint[]; target: number; weekly: boolean; domain: [number, number] }) {
  const c = usePalette();
  const span = (domain[1] - domain[0]) / 86_400_000;
  const max = Math.max(target * 1.15, ...data.map((d) => d.calories));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke={c.grid} />
        <XAxis dataKey="ts" type="number" scale="time" domain={domain} tickFormatter={tickFormatter(span)} tickLine={false} axisLine={false} minTickGap={28} padding={{ left: 8, right: 8 }} />
        <YAxis domain={[0, Math.ceil(max / 500) * 500]} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : `${v}`)} />
        <Tooltip
          cursor={{ fill: c.track }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as CaloriePoint;
            return (
              <TooltipCard title={p.label}>
                <TooltipRow color={c.food} label={weekly ? 'Avg / day' : 'Calories'} value={fmtInt(p.calories)} />
                <TooltipRow color={c.muted} label="vs target" value={`${p.calories >= target ? '+' : '−'}${fmtInt(Math.abs(p.calories - target))}`} />
              </TooltipCard>
            );
          }}
        />
        <Bar dataKey="calories" radius={[6, 6, 2, 2]} maxBarSize={weekly ? 22 : 18} animationDuration={900}>
          {data.map((d) => (
            <Cell key={d.ts} fill={d.calories > target * 1.05 ? c.protein : c.food} fillOpacity={d.calories > target * 1.05 ? 0.85 : 1} />
          ))}
        </Bar>
        <ReferenceLine y={target} stroke={c.ink} strokeOpacity={0.6} strokeDasharray="4 4" label={{ value: `Target ${fmtInt(target)}`, position: 'insideTopRight', fill: c.muted, fontSize: 11 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export const weekLabel = (ts: number) => `Week of ${format(ts, 'MMM d')}`;
