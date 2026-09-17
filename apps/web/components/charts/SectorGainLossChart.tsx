'use client';

import { memo, useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCompactCurrency, formatSignedPercent, type SectorSummary } from '@portfolio/shared';
import { CHART_INK } from './palette';
import { useChartMode } from './useChartMode';

interface Bucket {
  sector: string;
  gainLoss: number;
  gainLossPercent: number | null;
}

function BarTooltip({ active, payload }: { active?: boolean; payload?: { payload: Bucket }[] }) {
  const bucket = payload?.[0]?.payload;
  if (!active || !bucket) return null;

  return (
    <div className="border border-rule bg-surface px-2 py-1 text-xs shadow-sm">
      <p className="font-medium">{bucket.sector}</p>
      <p className="numeric text-ink-soft">
        {formatCompactCurrency(bucket.gainLoss)} · {formatSignedPercent(bucket.gainLossPercent)}
      </p>
    </div>
  );
}

function SectorGainLossChartBase({ sectors }: { sectors: SectorSummary[] }) {
  const mode = useChartMode();
  const ink = CHART_INK[mode];

  const buckets = useMemo<Bucket[]>(
    () =>
      sectors
        .filter(
          (sector): sector is SectorSummary & { gainLoss: number } => sector.gainLoss !== null,
        )
        .map((sector) => ({
          sector: sector.sector,
          gainLoss: sector.gainLoss,
          gainLossPercent: sector.gainLossPercent,
        })),
    [sectors],
  );

  return (
    <figure className="flex flex-col gap-3 border border-rule bg-surface p-4">
      <figcaption className="text-xs font-medium tracking-wide text-ink-soft">
        Gain and loss by sector
      </figcaption>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets} layout="vertical" margin={{ left: 8, right: 16 }} barSize={14}>
            <XAxis
              type="number"
              tickFormatter={(value: number) => formatCompactCurrency(value)}
              tick={{ fill: ink.axis, fontSize: 11 }}
              axisLine={{ stroke: ink.grid }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="sector"
              width={78}
              tick={{ fill: ink.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine x={0} stroke={ink.grid} />
            <Tooltip content={<BarTooltip />} cursor={{ fill: ink.grid, fillOpacity: 0.3 }} />
            <Bar dataKey="gainLoss" radius={4} isAnimationActive={false}>
              {buckets.map((bucket) => (
                <Cell
                  key={bucket.sector}
                  fill={bucket.gainLoss >= 0 ? ink.gain : ink.loss}
                  stroke={ink.surface}
                  strokeWidth={2}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export const SectorGainLossChart = memo(SectorGainLossChartBase);
