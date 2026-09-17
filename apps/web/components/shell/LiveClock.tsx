'use client';

import { formatClockTime } from '@portfolio/shared';
import { cn } from '@/lib/cn';

interface LiveClockProps {
  lastUpdated: Date | null;
  secondsUntilNextRefresh: number;
  intervalSeconds: number;
  isRefreshing: boolean;
  isPaused: boolean;
}

export function LiveClock({
  lastUpdated,
  secondsUntilNextRefresh,
  intervalSeconds,
  isRefreshing,
  isPaused,
}: LiveClockProps) {
  const progress = isPaused ? 0 : 1 - secondsUntilNextRefresh / Math.max(intervalSeconds, 1);

  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <div className="hidden text-right leading-none sm:block">
        <p className="text-[0.65rem] tracking-wide text-ink-faint">Last updated</p>
        <p className="numeric mt-1 text-sm font-medium">{formatClockTime(lastUpdated)}</p>
      </div>

      <div className="relative grid size-9 shrink-0 place-items-center">
        <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="18" cy="18" r="16" fill="none" stroke="var(--rule)" strokeWidth="2.5" />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke={isPaused ? 'var(--ink-faint)' : 'var(--gain)'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${Math.max(progress, 0) * 100.5} 100.5`}
          />
        </svg>
        <span
          className={cn(
            'numeric text-[0.7rem] font-medium',
            isPaused ? 'text-ink-faint' : 'text-ink-soft',
          )}
        >
          {isPaused ? '–' : isRefreshing ? '·' : secondsUntilNextRefresh}
        </span>
      </div>

      <span className="sr-only">
        {isPaused ? 'Live updates paused' : `Next refresh in ${secondsUntilNextRefresh} seconds`}
      </span>
    </div>
  );
}
