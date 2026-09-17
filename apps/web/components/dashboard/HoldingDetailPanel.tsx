'use client';

import { X } from 'lucide-react';
import {
  EM_DASH,
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatQuantity,
  formatSignedCurrency,
  formatSignedPercent,
  type HoldingRow as Holding,
} from '@portfolio/shared';
import { Button } from '@/components/ui/Button';
import { TickerAvatar } from '@/components/table/TickerAvatar';
import { statusLabel } from '@/components/ui/StaleBadge';
import { cn } from '@/lib/cn';

const SOURCE_LABEL: Record<string, string> = {
  yahoo: 'Yahoo Finance',
  google: 'Google Finance',
  mock: 'Demo data',
  cache: 'Cache',
};

function Row({ label, value, tone }: { label: string; value: string; tone?: 'gain' | 'loss' }) {
  return (
    <div className="flex items-center justify-between border-b border-rule py-2 last:border-b-0">
      <span className="text-xs text-ink-soft">{label}</span>
      <span
        className={cn(
          'numeric text-sm font-medium',
          tone === 'gain' && 'text-gain',
          tone === 'loss' && 'text-loss',
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function HoldingDetailPanel({
  holding,
  onClose,
}: {
  holding: Holding | null;
  onClose: () => void;
}) {
  if (!holding) {
    return (
      <aside className="card hidden h-fit flex-col gap-2 p-5 xl:sticky xl:top-20 xl:flex">
        <h2 className="font-display text-base tracking-wide">Details</h2>
        <p className="text-xs text-ink-soft">
          Pick a holding from the table or the movers list to see its full breakdown here.
        </p>
      </aside>
    );
  }

  const isUp = (holding.gainLoss ?? 0) >= 0;
  const quoteNote = statusLabel(holding.status.quote);
  const fundamentalsNote = statusLabel(holding.status.fundamentals);

  return (
    <aside className="card flex h-fit flex-col gap-4 p-5 xl:sticky xl:top-20">
      <div className="flex items-start gap-3">
        <TickerAvatar name={holding.name} className="size-10 text-xs" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base tracking-wide">{holding.name}</h2>
          <p className="numeric text-xs text-ink-faint">
            {holding.exchangeCode} · {holding.exchange} · {holding.sector}
          </p>
        </div>
        <Button variant="ghost" onClick={onClose} aria-label="Close details">
          <X aria-hidden className="size-3.5" />
        </Button>
      </div>

      <div className="rounded-xl bg-muted px-3 py-3">
        <p className="numeric text-2xl font-semibold">{formatCurrency(holding.cmp)}</p>
        <p className={cn('numeric text-xs', isUp ? 'text-gain' : 'text-loss')}>
          {formatSignedPercent(holding.dayChangePercent)} today
        </p>
      </div>

      <div>
        <Row label="Quantity" value={formatQuantity(holding.quantity)} />
        <Row label="Purchase price" value={formatCurrency(holding.purchasePrice)} />
        <Row label="Invested" value={formatCurrency(holding.investment)} />
        <Row label="Present value" value={formatCurrency(holding.presentValue)} />
        <Row
          label="Gain / loss"
          value={formatSignedCurrency(holding.gainLoss)}
          tone={isUp ? 'gain' : 'loss'}
        />
        <Row
          label="Return"
          value={formatSignedPercent(holding.gainLossPercent)}
          tone={isUp ? 'gain' : 'loss'}
        />
        <Row label="Share of portfolio" value={formatPercent(holding.portfolioPercent)} />
        <Row label="P/E ratio" value={formatNumber(holding.peRatio)} />
        <Row
          label="Earnings per share"
          value={
            holding.latestEarnings?.eps === null || holding.latestEarnings === null
              ? EM_DASH
              : formatCurrency(holding.latestEarnings.eps)
          }
        />
        <Row label="Earnings period" value={holding.latestEarnings?.period ?? EM_DASH} />
        <Row
          label="Net income"
          value={formatCompactCurrency(holding.latestEarnings?.netIncome ?? null)}
        />
      </div>

      <div className="flex flex-col gap-1 text-[0.7rem] text-ink-faint">
        <p>
          Price: {SOURCE_LABEL[holding.status.quote.source ?? ''] ?? 'unavailable'}
          {quoteNote ? ` · ${quoteNote}` : ''}
        </p>
        <p>
          Fundamentals: {SOURCE_LABEL[holding.status.fundamentals.source ?? ''] ?? 'unavailable'}
          {fundamentalsNote ? ` · ${fundamentalsNote}` : ''}
        </p>
      </div>
    </aside>
  );
}
