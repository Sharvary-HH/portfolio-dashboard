'use client';

import { Pause, Play, RotateCw } from 'lucide-react';
import type { PortfolioResponse } from '@portfolio/shared';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LiveStatus } from './LiveStatus';
import { MarketStatusBadge } from './MarketStatusBadge';

interface HeaderProps {
  meta: PortfolioResponse['meta'] | null;
  lastUpdated: Date | null;
  secondsUntilNextRefresh: number;
  isRefreshing: boolean;
  isPaused: boolean;
  onRefresh: () => void;
  onTogglePause: () => void;
}

export function Header({
  meta,
  lastUpdated,
  secondsUntilNextRefresh,
  isRefreshing,
  isPaused,
  onRefresh,
  onTogglePause,
}: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Portfolio dashboard</h1>
        <LiveStatus
          lastUpdated={lastUpdated}
          secondsUntilNextRefresh={secondsUntilNextRefresh}
          isRefreshing={isRefreshing}
          isPaused={isPaused}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {meta?.dataMode === 'mock' ? (
          <span className="border border-accent/40 px-2 py-1 text-xs font-medium text-accent">
            Demo data
          </span>
        ) : null}
        <MarketStatusBadge state={meta?.marketState ?? 'UNKNOWN'} />
        <Button onClick={onTogglePause}>
          {isPaused ? (
            <Play aria-hidden className="size-3.5" />
          ) : (
            <Pause aria-hidden className="size-3.5" />
          )}
          {isPaused ? 'Resume live updates' : 'Pause live updates'}
        </Button>
        <Button onClick={onRefresh} disabled={isRefreshing}>
          <RotateCw aria-hidden className="size-3.5" />
          Refresh prices
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
