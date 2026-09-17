'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { EM_DASH, formatCurrency, formatSignedPercent, type FieldStatus } from '@portfolio/shared';
import { StaleBadge } from '@/components/ui/StaleBadge';
import { directionOf } from './GainLossCell';
import { cn } from '@/lib/cn';

const FLASH_MS = 800;

const CHANGE_TONE = {
  up: 'text-gain',
  down: 'text-loss',
  flat: 'text-ink-faint',
  unknown: 'text-ink-faint',
} as const;

interface PriceCellProps {
  price: number | null;
  dayChangePercent: number | null;
  status: FieldStatus;
}

function PriceCellBase({ price, dayChangePercent, status }: PriceCellProps) {
  const previous = useRef(price);
  const [flash, setFlash] = useState<'flash-up' | 'flash-down' | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = price;

    if (before === null || price === null || before === price) return undefined;

    setFlash(price > before ? 'flash-up' : 'flash-down');
    const timer = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(timer);
  }, [price]);

  return (
    <span className={cn('numeric inline-flex flex-col items-end leading-tight px-1', flash)}>
      <span>
        {price === null ? EM_DASH : formatCurrency(price)}
        <StaleBadge status={status} />
      </span>
      <span className={cn('text-[0.7rem]', CHANGE_TONE[directionOf(dayChangePercent)])}>
        {dayChangePercent === null ? EM_DASH : formatSignedPercent(dayChangePercent)}
      </span>
    </span>
  );
}

export const PriceCell = memo(PriceCellBase);
