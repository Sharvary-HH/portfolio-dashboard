'use client';

import { memo, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import {
  formatCompactCurrency,
  formatPercent,
  formatSignedPercent,
  type SectorSummary,
} from '@portfolio/shared';
import { CHART_INK, hueFor } from './palette';
import { useChartMode } from './useChartMode';
import { cn } from '@/lib/cn';

interface Slice {
  sector: string;
  value: number;
  share: number;
  gainLossPercent: number | null;
  color: string;
}

function SectorAllocationChartBase({ sectors }: { sectors: SectorSummary[] }) {
  const mode = useChartMode();
  const [activeSector, setActiveSector] = useState<string | null>(null);

  const slices = useMemo<Slice[]>(() => {
    const values = sectors.map((sector) => ({
      sector: sector.sector,
      value: sector.totalPresentValue ?? sector.totalInvestment,
      gainLossPercent: sector.gainLossPercent,
    }));

    const total = values.reduce((sum, item) => sum + item.value, 0);

    return values.map((item, index) => ({
      ...item,
      share: total === 0 ? 0 : (item.value / total) * 100,
      color: hueFor(mode, index),
    }));
  }, [mode, sectors]);

  const focused =
    slices.find((slice) => slice.sector === activeSector) ??
    [...slices].sort((a, b) => b.value - a.value)[0];

  return (
    <section className="card flex flex-col gap-4 p-4 sm:p-5">
      <div>
        <h2 className="font-display text-sm font-bold tracking-tight">Allocation by sector</h2>
        <p className="text-xs text-ink-soft">Share of present value</p>
      </div>

      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <div className="relative h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="sector"
                innerRadius="66%"
                outerRadius="98%"
                paddingAngle={1}
                stroke={CHART_INK[mode].surface}
                strokeWidth={2}
                isAnimationActive={false}
                onMouseEnter={(_, index) => setActiveSector(slices[index]?.sector ?? null)}
                onMouseLeave={() => setActiveSector(null)}
              >
                {slices.map((slice) => (
                  <Cell key={slice.sector} fill={slice.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="numeric font-display text-base font-bold">
                {formatCompactCurrency(focused?.value ?? null)}
              </p>
              <p className="max-w-24 truncate text-[0.7rem] text-ink-soft">
                {focused?.sector ?? '—'}
              </p>
            </div>
          </div>
        </div>

        <ul className="flex w-full flex-1 flex-col gap-1.5 text-xs">
          {slices.map((slice) => (
            <li
              key={slice.sector}
              onMouseEnter={() => setActiveSector(slice.sector)}
              onMouseLeave={() => setActiveSector(null)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2 py-1 transition-colors',
                activeSector === slice.sector && 'bg-muted',
              )}
            >
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="flex-1 truncate">{slice.sector}</span>
              <span
                className="numeric"
                style={{
                  color:
                    slice.gainLossPercent === null
                      ? undefined
                      : slice.gainLossPercent >= 0
                        ? CHART_INK[mode].gain
                        : CHART_INK[mode].loss,
                }}
              >
                {formatSignedPercent(slice.gainLossPercent)}
              </span>
              <span className="numeric w-12 text-right text-ink-soft">
                {formatPercent(slice.share)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export const SectorAllocationChart = memo(SectorAllocationChartBase);
