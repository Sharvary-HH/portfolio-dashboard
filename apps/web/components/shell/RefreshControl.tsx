'use client';

import { Pause, Play, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

interface RefreshControlProps {
  secondsUntilNextRefresh: number;
  intervalSeconds: number;
  isRefreshing: boolean;
  isPaused: boolean;
  onRefresh: () => void;
  onTogglePause: () => void;
}

export function RefreshControl({
  secondsUntilNextRefresh,
  intervalSeconds,
  isRefreshing,
  isPaused,
  onRefresh,
  onTogglePause,
}: RefreshControlProps) {
  const remaining = isPaused ? 0 : secondsUntilNextRefresh / Math.max(intervalSeconds, 1);

  return (
    <div className="flex items-center gap-1 rounded-xl border border-rule bg-surface p-1">
      <Button
        variant="ghost"
        onClick={onTogglePause}
        aria-label={isPaused ? 'Resume live updates' : 'Pause live updates'}
        className="px-2 py-1.5"
      >
        {isPaused ? (
          <Play aria-hidden className="size-3.5" />
        ) : (
          <Pause aria-hidden className="size-3.5" />
        )}
      </Button>

      <Button
        variant="ghost"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="gap-2 px-2 py-1.5"
        aria-label={
          isPaused
            ? 'Refresh prices, live updates paused'
            : `Refresh prices, next automatic refresh in ${secondsUntilNextRefresh} seconds`
        }
      >
        <RotateCw aria-hidden className={cn('size-3.5', isRefreshing && 'animate-spin')} />
        <span className="hidden md:inline">Refresh</span>
        <span aria-hidden className="relative grid size-5 place-items-center">
          <svg viewBox="0 0 24 24" className="absolute inset-0 -rotate-90">
            <circle cx="12" cy="12" r="10" fill="none" stroke="var(--rule)" strokeWidth="3" />
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke={isPaused ? 'var(--ink-faint)' : 'var(--brand)'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(remaining, 0) * 62.8} 62.8`}
            />
          </svg>
          <span className="numeric text-[0.6rem] text-ink-soft">
            {isPaused ? '' : secondsUntilNextRefresh}
          </span>
        </span>
      </Button>
    </div>
  );
}
