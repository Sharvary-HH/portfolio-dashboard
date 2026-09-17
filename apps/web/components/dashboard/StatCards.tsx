'use client';

import { memo } from 'react';
import { ArrowDownRight, ArrowUpRight, Layers, PiggyBank, Wallet } from 'lucide-react';
import {
  formatCurrencyWhole,
  formatQuantity,
  formatSignedCurrency,
  formatSignedPercent,
  type HistoryPoint,
  type PortfolioResponse,
} from '@portfolio/shared';
import { Sparkline } from '@/components/charts/Sparkline';
import { cn } from '@/lib/cn';

interface StatCardsProps {
  totals: PortfolioResponse['totals'];
  history: HistoryPoint[];
  holdingCount: number;
  sectorCount: number;
}

function Card({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Wallet;
  tone?: 'gain' | 'loss' | 'neutral';
  children?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-soft">{label}</span>
        <span
          className={cn(
            'grid size-7 place-items-center rounded-lg',
            tone === 'gain' && 'bg-gain-soft text-gain',
            tone === 'loss' && 'bg-loss-soft text-loss',
            tone === 'neutral' && 'bg-brand-soft text-brand',
          )}
        >
          <Icon aria-hidden className="size-3.5" />
        </span>
      </div>

      <div>
        <p
          className={cn(
            'numeric text-xl font-semibold tracking-tight',
            tone === 'gain' && 'text-gain',
            tone === 'loss' && 'text-loss',
          )}
        >
          {value}
        </p>
        {hint ? <p className="numeric mt-0.5 text-xs text-ink-faint">{hint}</p> : null}
      </div>

      {children}
    </div>
  );
}

function StatCardsBase({ totals, history, holdingCount, sectorCount }: StatCardsProps) {
  const isUp = (totals.gainLoss ?? 0) >= 0;
  const values = history.map((point) => point.value);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        label="Present value"
        value={formatCurrencyWhole(totals.totalPresentValue)}
        hint={totals.isPartial ? 'Excludes holdings without a price' : 'Across every holding'}
        icon={Wallet}
      >
        <Sparkline values={values} tone={isUp ? 'gain' : 'loss'} className="h-8 w-full" />
      </Card>

      <Card
        label="Total invested"
        value={formatCurrencyWhole(totals.totalInvestment)}
        hint={`${formatQuantity(holdingCount)} holdings · ${sectorCount} sectors`}
        icon={PiggyBank}
      />

      <Card
        label="Unrealised gain / loss"
        value={formatSignedCurrency(totals.gainLoss)}
        hint={formatSignedPercent(totals.gainLossPercent)}
        icon={isUp ? ArrowUpRight : ArrowDownRight}
        tone={isUp ? 'gain' : 'loss'}
      />

      <Card
        label="Return on investment"
        value={formatSignedPercent(totals.gainLossPercent)}
        hint="Against total invested"
        icon={Layers}
        tone={isUp ? 'gain' : 'loss'}
      />
    </div>
  );
}

export const StatCards = memo(StatCardsBase);
