'use client';

import { memo } from 'react';
import {
  EM_DASH,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatQuantity,
  type HoldingRow,
} from '@portfolio/shared';
import { GainLossCell } from './GainLossCell';
import { PriceCell } from './PriceCell';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[0.7rem] text-ink-faint">{label}</span>
      <span className="numeric text-sm">{value}</span>
    </div>
  );
}

function MobileHoldingCardBase({ holding }: { holding: HoldingRow }) {
  return (
    <article className="card px-4 py-3">
      <header className="flex items-start justify-between gap-3 border-b border-rule pb-2">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{holding.name}</span>
          <span className="numeric text-[0.7rem] text-ink-faint">
            {holding.exchangeCode} · {holding.exchange}
          </span>
        </div>
        <PriceCell
          price={holding.cmp}
          dayChangePercent={holding.dayChangePercent}
          status={holding.status.quote}
        />
      </header>

      <div className="flex items-center justify-between border-b border-rule py-2">
        <div className="flex flex-col">
          <span className="text-[0.7rem] text-ink-faint">Present value</span>
          <span className="numeric text-sm">{formatCurrency(holding.presentValue)}</span>
        </div>
        <GainLossCell value={holding.gainLoss} percent={holding.gainLossPercent} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
        <Field label="Purchase price" value={formatCurrency(holding.purchasePrice)} />
        <Field label="Qty" value={formatQuantity(holding.quantity)} />
        <Field label="Investment" value={formatCurrency(holding.investment)} />
        <Field label="Portfolio" value={formatPercent(holding.portfolioPercent)} />
        <Field label="P/E ratio" value={formatNumber(holding.peRatio)} />
        <Field
          label={`Earnings ${holding.latestEarnings?.period ?? ''}`.trim()}
          value={
            holding.latestEarnings?.eps === null || holding.latestEarnings === null
              ? EM_DASH
              : formatCurrency(holding.latestEarnings.eps)
          }
        />
      </div>
    </article>
  );
}

export const MobileHoldingCard = memo(MobileHoldingCardBase);
