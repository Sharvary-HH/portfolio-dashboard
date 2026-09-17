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
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
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
  query: string;
  selectedId: string | null;
  onSelect: (holdingId: string) => void;
}

function matches(row: Holding, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  return row.name.toLowerCase().includes(needle) || row.exchangeCode.toLowerCase().includes(needle);
}

export function PortfolioTable({ portfolio, query, selectedId, onSelect }: PortfolioTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [collapsed, setCollapsed] = useState<string[]>([]);

  const columns = useMemo(() => portfolioColumns, []);

  const table = useReactTable({
    data: portfolio.rows,
    columns,
    state: { sorting, globalFilter: query },
    onSortingChange: setSorting,
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
        <div>
          <h2 className="font-display text-sm font-bold tracking-tight">Holdings</h2>
          <p className="numeric text-xs text-ink-soft">
            {rows.length} of {portfolio.rows.length} shown, grouped by sector
          </p>
        </div>
        <Button onClick={allCollapsed ? expandAll : collapseAll}>
          {allCollapsed ? 'Expand all' : 'Collapse all'}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="card px-4 py-8 text-center text-sm text-ink-soft">
          Nothing matches that search.
        </p>
      ) : (
        <div className="card hidden overflow-x-auto md:block">
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
                          'px-3 py-3 text-xs font-medium text-ink-soft',
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
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}

            <tfoot className="border-t border-rule bg-muted">
              <tr>
                {leafColumns.map((column) => {
                  const layout = layoutOf(column);
                  const shared = cn(
                    'px-3 py-3.5 text-xs font-semibold',
                    layout.align === 'left' ? 'text-left' : 'text-right numeric',
                    layout.sticky && 'sticky left-0 z-10 bg-muted',
                  );

                  switch (column.id) {
                    case 'name':
                      return (
                        <th key={column.id} scope="row" className={shared}>
                          Portfolio total
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
      )}

      <div className="flex flex-col gap-4 md:hidden">
        {groups.map((group) => (
          <div key={group.summary.sector} className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => toggleSector(group.summary.sector)}
              aria-expanded={!collapsed.includes(group.summary.sector)}
              className="card flex items-center justify-between px-4 py-2.5 text-left"
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
