'use client';

import { Pause, Play, RotateCw, Search } from 'lucide-react';
import { formatClockTime, type PortfolioResponse } from '@portfolio/shared';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { MarketStatusBadge } from '@/components/dashboard/MarketStatusBadge';
import { cn } from '@/lib/cn';

interface TopBarProps {
  meta: PortfolioResponse['meta'] | null;
  query: string;
  onQueryChange: (value: string) => void;
  lastUpdated: Date | null;
  secondsUntilNextRefresh: number;
  isRefreshing: boolean;
  isPaused: boolean;
  onRefresh: () => void;
  onTogglePause: () => void;
}

export function TopBar({
  meta,
  query,
  onQueryChange,
  lastUpdated,
  secondsUntilNextRefresh,
  isRefreshing,
  isPaused,
  onRefresh,
  onTogglePause,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-rule bg-canvas/85 px-4 py-3 backdrop-blur sm:px-6">
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-rule bg-surface px-3 py-2 sm:max-w-sm">
        <Search aria-hidden className="size-4 shrink-0 text-ink-faint" />
        <span className="sr-only">Search holdings by name or code</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search name or code"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-faint"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        {meta?.dataMode === 'mock' ? (
          <span className="rounded-lg bg-accent-soft px-2.5 py-1.5 text-xs font-medium text-accent">
            Demo data
          </span>
        ) : null}

        <MarketStatusBadge state={meta?.marketState ?? 'UNKNOWN'} />

        <span
          aria-live="polite"
          className="numeric hidden items-center gap-1.5 rounded-lg border border-rule bg-surface px-2.5 py-1.5 text-xs text-ink-soft md:inline-flex"
        >
          <span
            aria-hidden
            className={cn(
              'size-1.5 rounded-full',
              isPaused ? 'bg-ink-faint' : isRefreshing ? 'bg-accent' : 'bg-gain',
            )}
          />
          {isPaused
            ? 'Paused'
            : isRefreshing
              ? 'Refreshing'
              : `Next in ${secondsUntilNextRefresh}s`}
          <span className="text-ink-faint">·</span>
          {formatClockTime(lastUpdated)}
        </span>

        <Button
          onClick={onTogglePause}
          aria-label={isPaused ? 'Resume live updates' : 'Pause live updates'}
        >
          {isPaused ? (
            <Play aria-hidden className="size-3.5" />
          ) : (
            <Pause aria-hidden className="size-3.5" />
          )}
          <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
        </Button>

        <Button variant="brand" onClick={onRefresh} disabled={isRefreshing}>
          <RotateCw aria-hidden className={cn('size-3.5', isRefreshing && 'animate-spin')} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>

        <ThemeToggle />
      </div>
    </header>
  );
}
