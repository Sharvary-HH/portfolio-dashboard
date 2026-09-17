'use client';

import dynamic from 'next/dynamic';
import type { PortfolioResponse } from '@portfolio/shared';
import { usePortfolio } from '@/hooks/usePortfolio';
import { PortfolioTable } from '@/components/table/PortfolioTable';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Header } from './Header';
import { SummaryStrip } from './SummaryStrip';
import { Warnings } from './Warnings';
import { Disclaimer } from './Disclaimer';

const ChartPlaceholder = () => <div className="h-56 border border-rule bg-surface" />;

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

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
      <Header
        meta={data?.meta ?? null}
        lastUpdated={lastUpdated}
        secondsUntilNextRefresh={secondsUntilNextRefresh}
        isRefreshing={isRefreshing}
        isPaused={isPaused}
        onRefresh={refresh}
        onTogglePause={togglePause}
      />

      {data ? <SummaryStrip totals={data.totals} holdingCount={data.rows.length} /> : null}

      {error ? (
        <ErrorBanner
          message={
            data
              ? `${error} Showing the last values received.`
              : `${error} Check that the API is running on port 4000.`
          }
          onRetry={refresh}
          onDismiss={data ? dismissError : undefined}
        />
      ) : null}

      {data ? <Warnings warnings={data.meta.warnings} /> : null}

      {isLoading ? <TableSkeleton /> : null}

      {data && data.rows.length === 0 ? (
        <p className="border border-rule bg-surface px-4 py-6 text-sm text-ink-soft">
          No holdings yet. Put the sheet at <code>data/portfolio.xlsx</code> and run{' '}
          <code>npm run import:excel</code>.
        </p>
      ) : null}

      {data && data.rows.length > 0 ? (
        <>
          <PortfolioTable portfolio={data} />
          <div className="grid gap-4 lg:grid-cols-2">
            <SectorAllocationChart sectors={data.sectors} />
            <SectorGainLossChart sectors={data.sectors} />
          </div>
        </>
      ) : null}

      <Disclaimer />
    </main>
  );
}
