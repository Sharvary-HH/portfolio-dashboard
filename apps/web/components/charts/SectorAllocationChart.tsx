'use client';

import { memo, useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCompactCurrency, formatPercent, type SectorSummary } from '@portfolio/shared';
import { CHART_INK, hueFor } from './palette';
import { useChartMode } from './useChartMode';

interface Slice {
  sector: string;
  value: number;
  share: number;
  color: string;
}

function SliceTooltip({ active, payload }: { active?: boolean; payload?: { payload: Slice }[] }) {
  const slice = payload?.[0]?.payload;
  if (!active || !slice) return null;

  return (
    <div className="border border-rule bg-surface px-2 py-1 text-xs shadow-sm">
      <p className="font-medium">{slice.sector}</p>
      <p className="numeric text-ink-soft">
        {formatCompactCurrency(slice.value)} · {formatPercent(slice.share)}
      </p>
    </div>
  );
}

function SectorAllocationChartBase({ sectors }: { sectors: SectorSummary[] }) {
  const mode = useChartMode();

  const slices = useMemo<Slice[]>(() => {
    const values = sectors.map((sector) => ({
      sector: sector.sector,
      value: sector.totalPresentValue ?? sector.totalInvestment,
    }));

    const total = values.reduce((sum, item) => sum + item.value, 0);

    return values.map((item, index) => ({
      ...item,
      share: total === 0 ? 0 : (item.value / total) * 100,
      color: hueFor(mode, index),
    }));
  }, [mode, sectors]);

  return (
    <figure className="flex flex-col gap-3 border border-rule bg-surface p-4">
      <figcaption className="text-xs font-medium tracking-wide text-ink-soft">
        Allocation by sector, at present value
      </figcaption>

      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="h-44 w-full max-w-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="sector"
                innerRadius="58%"
                outerRadius="92%"
                stroke={CHART_INK[mode].surface}
                strokeWidth={2}
                isAnimationActive={false}
              >
                {slices.map((slice) => (
                  <Cell key={slice.sector} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip content={<SliceTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="flex w-full flex-1 flex-col gap-1.5 text-xs">
          {slices.map((slice) => (
            <li key={slice.sector} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-[1px]"
                style={{ backgroundColor: slice.color }}
              />
              <span className="flex-1 truncate">{slice.sector}</span>
              <span className="numeric text-ink-soft">{formatPercent(slice.share)}</span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}

export const SectorAllocationChart = memo(SectorAllocationChartBase);
