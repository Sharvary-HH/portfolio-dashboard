'use client';

import { useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { PortfolioResponse } from '@portfolio/shared';
import { usePortfolio } from '@/hooks/usePortfolio';
import { PortfolioTable } from '@/components/table/PortfolioTable';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Sidebar, type SectionId } from '@/components/shell/Sidebar';
import { TopBar } from '@/components/shell/TopBar';
import { StatCards } from './StatCards';
import { TopMovers } from './TopMovers';
import { HoldingDetailPanel } from './HoldingDetailPanel';
import { Warnings } from './Warnings';
import { Disclaimer } from './Disclaimer';

const ChartPlaceholder = () => <div className="card h-64 animate-pulse" />;

const PortfolioTrendChart = dynamic(
  () => import('@/components/charts/PortfolioTrendChart').then((mod) => mod.PortfolioTrendChart),
  { ssr: false, loading: ChartPlaceholder },
);

const SectorAllocationChart = dynamic(
  () =>
    import('@/components/charts/SectorAllocationChart').then((mod) => mod.SectorAllocationChart),
  { ssr: false, loading: ChartPlaceholder },
);

const SectorGainLossChart = dynamic(
  () => import('@/components/charts/SectorGainLossChart').then((mod) => mod.SectorGainLossChart),
  { ssr: false, loading: ChartPlaceholder },
);

export function Dashboard({ initialData }: { initialData: PortfolioResponse | null }) {
  const {
    data,
    error,
    isLoading,
    isRefreshing,
    isPaused,
    lastUpdated,
    secondsUntilNextRefresh,
    refresh,
    togglePause,
    dismissError,
  } = usePortfolio(initialData);

  const [section, setSection] = useState<SectionId>('overview');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => data?.rows.find((row) => row.id === selectedId) ?? null,
    [data?.rows, selectedId],
  );

  const select = useCallback((holdingId: string) => {
    setSelectedId((current) => (current === holdingId ? null : holdingId));
  }, []);

  const clearSelection = useCallback(() => setSelectedId(null), []);

  const showOverview = section === 'overview';
  const showHoldings = section === 'overview' || section === 'holdings';
  const showSectors = section === 'overview' || section === 'sectors';
  const showMovers = section === 'overview' || section === 'movers';

  return (
    <div className="flex min-h-screen">
      <Sidebar
        active={section}
        onSelect={setSection}
        totalValue={data?.totals.totalPresentValue ?? null}
        holdingCount={data?.rows.length ?? 0}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          meta={data?.meta ?? null}
          query={query}
          onQueryChange={setQuery}
          lastUpdated={lastUpdated}
          secondsUntilNextRefresh={secondsUntilNextRefresh}
          isRefreshing={isRefreshing}
          isPaused={isPaused}
          onRefresh={refresh}
          onTogglePause={togglePause}
        />

        <main className="flex flex-1 flex-col gap-4 px-4 py-5 sm:px-6">
          {error ? (
            <ErrorBanner
              message={
                data
                  ? `${error} Showing the last values received.`
                  : `${error} Check that the API is reachable.`
              }
              onRetry={refresh}
              onDismiss={data ? dismissError : undefined}
            />
          ) : null}

          {data ? <Warnings warnings={data.meta.warnings} /> : null}

          {isLoading ? <TableSkeleton /> : null}

          {data && data.rows.length === 0 ? (
            <p className="card px-4 py-8 text-sm text-ink-soft">
              No holdings yet. Put the sheet at <code>data/portfolio.xlsx</code> and run{' '}
              <code>npm run import:excel</code>.
            </p>
          ) : null}

          {data && data.rows.length > 0 ? (
            <>
              {showOverview ? (
                <StatCards
                  totals={data.totals}
                  history={data.history}
                  holdingCount={data.rows.length}
                  sectorCount={data.sectors.length}
                />
              ) : null}

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="flex min-w-0 flex-col gap-4">
                  {showOverview ? (
                    <PortfolioTrendChart
                      history={data.history}
                      invested={data.totals.totalInvestment}
                    />
                  ) : null}

                  {showMovers ? <TopMovers rows={data.rows} onSelect={select} /> : null}

                  {showSectors ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <SectorAllocationChart sectors={data.sectors} />
                      <SectorGainLossChart sectors={data.sectors} />
                    </div>
                  ) : null}
                </div>

                <HoldingDetailPanel holding={selected} onClose={clearSelection} />
              </div>

              {showHoldings ? (
                <PortfolioTable
                  portfolio={data}
                  query={query}
                  selectedId={selectedId}
                  onSelect={select}
                />
              ) : null}
            </>
          ) : null}

          <Disclaimer />
        </main>
      </div>
    </div>
  );
}
