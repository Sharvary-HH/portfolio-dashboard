'use client';

import { formatClockTime } from '@portfolio/shared';
import { cn } from '@/lib/cn';

interface LiveStatusProps {
  lastUpdated: Date | null;
  secondsUntilNextRefresh: number;
  isRefreshing: boolean;
  isPaused: boolean;
}

export function LiveStatus({
  lastUpdated,
  secondsUntilNextRefresh,
  isRefreshing,
  isPaused,
}: LiveStatusProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-ink-soft" aria-live="polite">
      <span
        aria-hidden
        className={cn(
          'size-1.5 rounded-full',
          isPaused ? 'bg-ink-faint' : isRefreshing ? 'bg-accent' : 'bg-gain',
        )}
      />
      <span className="numeric">
        {isPaused
          ? 'Updates paused'
          : isRefreshing
            ? 'Refreshing'
            : `Next refresh in ${secondsUntilNextRefresh}s`}
      </span>
      <span className="text-ink-faint">·</span>
      <span className="numeric">Updated {formatClockTime(lastUpdated)}</span>
    </div>
  );
}
