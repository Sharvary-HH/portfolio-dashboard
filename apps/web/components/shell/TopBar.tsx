'use client';

import { Search } from 'lucide-react';
import type { PortfolioResponse } from '@portfolio/shared';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { MarketStatusBadge } from '@/components/dashboard/MarketStatusBadge';
import { LiveClock } from './LiveClock';
import { RefreshControl } from './RefreshControl';

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
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-rule bg-surface px-3 py-2 sm:max-w-xs">
        <Search aria-hidden className="size-4 shrink-0 text-ink-faint" />
        <span className="sr-only">Search holdings by name or code</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search name or code"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-faint"
        />
      </label>

      <MarketStatusBadge state={meta?.marketState ?? 'UNKNOWN'} />

      {meta?.dataMode === 'mock' ? (
        <span className="rounded-lg bg-accent-soft px-2.5 py-1.5 text-xs font-medium text-accent">
          Demo data
        </span>
      ) : null}

      <div className="ml-auto flex items-center gap-3">
        <RefreshControl
          secondsUntilNextRefresh={secondsUntilNextRefresh}
          intervalSeconds={Math.round((meta?.refreshIntervalMs ?? 15000) / 1000)}
          isRefreshing={isRefreshing}
          isPaused={isPaused}
          onRefresh={onRefresh}
          onTogglePause={onTogglePause}
        />

        <ThemeToggle />

        <span aria-hidden className="hidden h-8 w-px bg-rule sm:block" />

        <LiveClock lastUpdated={lastUpdated} />
      </div>
    </header>
  );
}
