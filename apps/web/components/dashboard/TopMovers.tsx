'use client';

import { memo, useMemo } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency, formatSignedPercent, type HoldingRow as Holding } from '@portfolio/shared';
import { CompanyLogo } from '@/components/table/CompanyLogo';
import { cn } from '@/lib/cn';

interface TopMoversProps {
  rows: Holding[];
  onSelect: (holdingId: string) => void;
}

function MoverList({
  title,
  icon: Icon,
  rows,
  tone,
  onSelect,
}: {
  title: string;
  icon: typeof TrendingUp;
  rows: Holding[];
  tone: 'gain' | 'loss';
  onSelect: (holdingId: string) => void;
}) {
  return (
    <div className="card flex flex-col gap-3 p-4">
      <h3 className="flex items-center gap-1.5 font-display text-base tracking-wide">
        <span
          className={cn(
            'grid size-6 place-items-center rounded-lg',
            tone === 'gain' ? 'bg-gain-soft text-gain' : 'bg-loss-soft text-loss',
          )}
        >
          <Icon aria-hidden className="size-3.5" />
        </span>
        {title}
      </h3>

      {rows.length === 0 ? (
        <p className="text-xs text-ink-faint">Nothing to show yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onSelect(row.id)}
                className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-muted"
              >
                <CompanyLogo holdingId={row.id} name={row.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{row.name}</span>
                  <span className="numeric block text-[0.7rem] text-ink-faint">
                    {formatCurrency(row.cmp)}
                  </span>
                </span>
                <span
                  className={cn(
                    'numeric text-sm font-medium',
                    tone === 'gain' ? 'text-gain' : 'text-loss',
                  )}
                >
                  {formatSignedPercent(row.gainLossPercent)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TopMoversBase({ rows, onSelect }: TopMoversProps) {
  const { winners, losers } = useMemo(() => {
    const ranked = rows
      .filter((row) => row.gainLossPercent !== null)
      .sort((a, b) => (b.gainLossPercent ?? 0) - (a.gainLossPercent ?? 0));

    return {
      winners: ranked.slice(0, 4),
      losers: [...ranked].reverse().slice(0, 4),
    };
  }, [rows]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <MoverList
        title="Best performers"
        icon={TrendingUp}
        rows={winners}
        tone="gain"
        onSelect={onSelect}
      />
      <MoverList
        title="Worst performers"
        icon={TrendingDown}
        rows={losers}
        tone="loss"
        onSelect={onSelect}
      />
    </div>
  );
}

export const TopMovers = memo(TopMoversBase);
