'use client';

import { memo, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  formatClockTime,
  formatCompactCurrency,
  formatCurrencyWhole,
  formatSignedCurrency,
  formatSignedPercent,
  type HistoryPoint,
} from '@portfolio/shared';
import { CHART_INK } from './palette';
import { useChartMode } from './useChartMode';

interface Point {
  at: string;
  label: string;
  value: number;
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="card px-3 py-2 text-xs">
      <p className="numeric font-semibold">{formatCurrencyWhole(point.value)}</p>
      <p className="numeric text-ink-faint">{point.label}</p>
    </div>
  );
}

function PortfolioTrendChartBase({
  history,
  invested,
}: {
  history: HistoryPoint[];
  invested: number;
}) {
  const mode = useChartMode();
  const ink = CHART_INK[mode];

  const points = useMemo<Point[]>(
    () =>
      history.map((point) => ({
        at: point.at,
        label: formatClockTime(point.at),
        value: point.value,
      })),
    [history],
  );

  const first = points[0]?.value ?? null;
  const last = points.at(-1)?.value ?? null;
  const movement = first !== null && last !== null ? last - first : null;
  const movementPercent = movement !== null && first ? (movement / first) * 100 : null;
  const rising = (movement ?? 0) >= 0;
  const stroke = rising ? ink.gain : ink.loss;

  return (
    <section className="card flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base tracking-wide">Portfolio value today</h2>
          <p className="text-xs text-ink-soft">
            Recorded on every refresh since the service started
          </p>
        </div>

        <div className="text-right">
          <p className="numeric text-lg font-semibold">{formatCurrencyWhole(last)}</p>
          <p
            className="numeric text-xs"
            style={{ color: movement === null ? undefined : rising ? ink.gain : ink.loss }}
          >
            {movement === null
              ? 'Collecting data'
              : `${formatSignedCurrency(movement)} · ${formatSignedPercent(movementPercent)}`}
          </p>
        </div>
      </div>

      <div className="h-52 w-full">
        {points.length < 2 ? (
          <div className="grid h-full place-items-center rounded-xl bg-muted text-xs text-ink-faint">
            The line appears once a few refreshes have been recorded.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.24} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={ink.grid} strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: ink.axis, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={48}
              />
              <YAxis
                domain={['dataMin - 2000', 'dataMax + 2000']}
                tickFormatter={(value: number) => formatCompactCurrency(value)}
                tick={{ fill: ink.axis, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: ink.grid }} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={stroke}
                strokeWidth={2}
                fill="url(#trendFill)"
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="numeric text-xs text-ink-faint">
        Invested {formatCurrencyWhole(invested)} · {points.length} readings
      </p>
    </section>
  );
}

export const PortfolioTrendChart = memo(PortfolioTrendChartBase);
