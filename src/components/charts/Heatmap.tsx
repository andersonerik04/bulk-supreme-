import { useEffect, useRef } from 'react';
import { format, startOfWeek } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { DayKey } from '@/db/types';
import { dayRange, fromDayKey, toDayKey, todayKey } from '@/utils/date';

/**
 * GitHub-style consistency grid. Intensity = how many of weight / food / water
 * were logged that day (0–3). Tap a cell to open that day.
 */
export function Heatmap({ from, levels }: { from: DayKey; levels: Map<DayKey, number> }) {
  const navigate = useNavigate();
  const scroller = useRef<HTMLDivElement>(null);
  const start = toDayKey(startOfWeek(fromDayKey(from), { weekStartsOn: 1 }));
  const days = dayRange(start, todayKey());
  const weeks: DayKey[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  useEffect(() => {
    scroller.current?.scrollTo({ left: scroller.current.scrollWidth });
  }, [weeks.length]);

  const shade = ['bg-line/[0.07]', 'bg-fat/30', 'bg-fat/60', 'bg-fat'];
  const today = todayKey();

  return (
    <div>
      <div className="flex gap-2">
        <div className="grid shrink-0 grid-rows-7 gap-[3px] pt-5 text-[9px] leading-[14px] text-muted">
          {['M', '', 'W', '', 'F', '', 'S'].map((d, i) => <span key={i} className="h-[14px]">{d}</span>)}
        </div>
        <div ref={scroller} className="scrollbar-none flex-1 overflow-x-auto">
          <div className="inline-flex gap-[3px]">
            {weeks.map((w, wi) => {
              const first = fromDayKey(w[0]);
              const showMonth = wi === 0 || first.getDate() <= 7;
              return (
                <div key={w[0]} className="flex flex-col gap-[3px]">
                  <span className="h-[17px] whitespace-nowrap text-[9px] text-muted">{showMonth ? format(first, 'MMM') : ''}</span>
                  {w.map((d) => {
                    const lvl = levels.get(d) ?? 0;
                    const future = d > today;
                    const before = d < from;
                    return (
                      <button
                        key={d}
                        disabled={future || before}
                        onClick={() => navigate(`/history/${d}`)}
                        title={`${format(fromDayKey(d), 'MMM d')}: ${lvl}/3 logged`}
                        className={`h-[14px] w-[14px] rounded-[4px] transition-transform active:scale-75 ${future || before ? 'bg-transparent' : shade[lvl]} ${d === today ? 'ring-1 ring-ink/60' : ''}`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted">
        Less {shade.map((s) => <span key={s} className={`h-2.5 w-2.5 rounded-[3px] ${s}`} />)} More
      </div>
    </div>
  );
}
