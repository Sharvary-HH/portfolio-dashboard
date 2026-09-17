'use client';

import { memo } from 'react';
import { EM_DASH, formatSignedCurrency, formatSignedPercent } from '@portfolio/shared';
import { cn } from '@/lib/cn';

export type GainDirection = 'up' | 'down' | 'flat' | 'unknown';

export function directionOf(value: number | null | undefined): GainDirection {
  if (value === null || value === undefined || Number.isNaN(value)) return 'unknown';
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'flat';
}

const TONE: Record<GainDirection, string> = {
  up: 'text-gain',
  down: 'text-loss',
  flat: 'text-ink-soft',
  unknown: 'text-ink-faint',
};

const MARK: Record<GainDirection, string> = {
  up: '▲',
  down: '▼',
  flat: '',
  unknown: '',
};

interface GainLossCellProps {
  value: number | null;
  percent: number | null;
  compact?: boolean;
}

function GainLossCellBase({ value, percent, compact = false }: GainLossCellProps) {
  const direction = directionOf(value);

  if (direction === 'unknown') {
    return <span className="numeric text-ink-faint">{EM_DASH}</span>;
  }

  return (
    <span className={cn('numeric inline-flex flex-col items-end leading-tight', TONE[direction])}>
      <span className="flex items-center gap-1">
        {MARK[direction] ? (
          <span aria-hidden className="text-[0.6rem]">
            {MARK[direction]}
          </span>
        ) : null}
        {formatSignedCurrency(value)}
      </span>
      {compact ? null : (
        <span className="text-[0.7rem] opacity-80">{formatSignedPercent(percent)}</span>
      )}
    </span>
  );
}

export const GainLossCell = memo(GainLossCellBase);
