'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from 'lucide-react';
import {
  formatCurrency,
  formatPercent,
  type PortfolioResponse,
  type HoldingRow as Holding,
} from '@portfolio/shared';
import { portfolioColumns } from './columns';
import { SectorGroup } from './SectorGroup';
import { GainLossCell } from './GainLossCell';
import { MobileHoldingCard } from './MobileHoldingCard';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { layoutOf } from './cellClass';

interface PortfolioTableProps {
  portfolio: PortfolioResponse;
}

function matches(row: Holding, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  return row.name.toLowerCase().includes(needle) || row.exchangeCode.toLowerCase().includes(needle);
}

export function PortfolioTable({ portfolio }: PortfolioTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<string[]>([]);

  const columns = useMemo(() => portfolioColumns, []);

  const table = useReactTable({
    data: portfolio.rows,
    columns,
    state: { sorting, globalFilter: query },
    onSortingChange: setSorting,
    onGlobalFilterChange: setQuery,
    globalFilterFn: (row, _columnId, value: string) => matches(row.original, value),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;
  const leafColumns = table.getVisibleLeafColumns();

  const groups = useMemo(() => {
    const bySector = new Map<string, typeof rows>();

    for (const row of rows) {
      const bucket = bySector.get(row.original.sector);
      if (bucket) bucket.push(row);
      else bySector.set(row.original.sector, [row]);
    }

    return portfolio.sectors
      .filter((sector) => bySector.has(sector.sector))
      .map((sector) => ({ summary: sector, rows: bySector.get(sector.sector) ?? [] }));
  }, [portfolio.sectors, rows]);

  const toggleSector = useCallback((sector: string) => {
    setCollapsed((current) =>
      current.includes(sector) ? current.filter((name) => name !== sector) : [...current, sector],
    );
  }, []);

  const expandAll = useCallback(() => setCollapsed([]), []);
  const collapseAll = useCallback(
    () => setCollapsed(portfolio.sectors.map((sector) => sector.sector)),
    [portfolio.sectors],
  );

  const allCollapsed = collapsed.length === portfolio.sectors.length;

  return (
    <section aria-label="Holdings" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 border border-rule bg-surface px-2.5 py-1.5 text-sm">
          <Search aria-hidden className="size-3.5 text-ink-faint" />
          <span className="sr-only">Filter holdings by name or code</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by name or code"
            className="w-48 bg-transparent text-sm outline-none placeholder:text-ink-faint"
          />
        </label>

        <div className="flex items-center gap-2">
          <span className="numeric text-xs text-ink-faint">
            {rows.length} of {portfolio.rows.length} holdings
          </span>
          <Button onClick={allCollapsed ? expandAll : collapseAll}>
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </Button>
        </div>
      </div>

      <div className="hidden overflow-x-auto border border-rule bg-surface md:block">
        <table className="w-full min-w-5xl border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-surface">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-rule">
                {headerGroup.headers.map((header) => {
                  const layout = layoutOf(header.column);
                  const sorted = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
                      }
                      className={cn(
                        'px-3 py-2.5 text-xs font-medium tracking-wide text-ink-soft',
                        layout.align === 'left' ? 'text-left' : 'text-right',
                        layout.sticky && 'sticky left-0 z-10 bg-surface',
                        layout.width,
                      )}
                    >
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          'inline-flex items-center gap-1 hover:text-ink',
                          layout.align === 'left' ? '' : 'flex-row-reverse',
                        )}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === 'asc' ? (
                          <ArrowUp aria-hidden className="size-3" />
                        ) : sorted === 'desc' ? (
                          <ArrowDown aria-hidden className="size-3" />
                        ) : (
                          <ChevronsUpDown aria-hidden className="size-3 opacity-40" />
                        )}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          {groups.map((group) => (
            <SectorGroup
              key={group.summary.sector}
              summary={group.summary}
              rows={group.rows}
              columns={leafColumns}
              isExpanded={!collapsed.includes(group.summary.sector)}
              onToggle={toggleSector}
            />
          ))}

          <tfoot className="border-t-2 border-rule bg-sunken">
            <tr>
              {leafColumns.map((column) => {
                const layout = layoutOf(column);
                const shared = cn(
                  'px-3 py-3 text-xs font-semibold',
                  layout.align === 'left' ? 'text-left' : 'text-right numeric',
                  layout.sticky && 'sticky left-0 z-10 bg-sunken',
                );

                switch (column.id) {
                  case 'name':
                    return (
                      <th key={column.id} scope="row" className={shared}>
                        Total
                      </th>
                    );
                  case 'investment':
                    return (
                      <td key={column.id} className={shared}>
                        {formatCurrency(portfolio.totals.totalInvestment)}
                      </td>
                    );
                  case 'portfolioPercent':
                    return (
                      <td key={column.id} className={shared}>
                        {formatPercent(100)}
                      </td>
                    );
                  case 'presentValue':
                    return (
                      <td key={column.id} className={shared}>
                        {formatCurrency(portfolio.totals.totalPresentValue)}
                      </td>
                    );
                  case 'gainLoss':
                    return (
                      <td key={column.id} className={shared}>
                        <GainLossCell
                          value={portfolio.totals.gainLoss}
                          percent={portfolio.totals.gainLossPercent}
                        />
                      </td>
                    );
                  default:
                    return <td key={column.id} className={shared} />;
                }
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-col gap-4 md:hidden">
        {groups.map((group) => (
          <div key={group.summary.sector} className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => toggleSector(group.summary.sector)}
              aria-expanded={!collapsed.includes(group.summary.sector)}
              className="flex items-center justify-between border border-rule bg-sunken px-3 py-2 text-left"
            >
              <span className="text-sm font-semibold">{group.summary.sector}</span>
              <GainLossCell
                value={group.summary.gainLoss}
                percent={group.summary.gainLossPercent}
              />
            </button>

            {collapsed.includes(group.summary.sector)
              ? null
              : group.rows.map((row) => <MobileHoldingCard key={row.id} holding={row.original} />)}
          </div>
        ))}
      </div>
    </section>
  );
}
