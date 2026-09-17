'use client';

import { memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Column, Row } from '@tanstack/react-table';
import {
  formatCurrency,
  formatPercent,
  type HoldingRow as Holding,
  type SectorSummary,
} from '@portfolio/shared';
import { GainLossCell } from './GainLossCell';
import { HoldingRow } from './HoldingRow';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';
import { layoutOf } from './cellClass';

interface SectorGroupProps {
  summary: SectorSummary;
  rows: Row<Holding>[];
  columns: Column<Holding, unknown>[];
  isExpanded: boolean;
  onToggle: (sector: string) => void;
  selectedId: string | null;
  onSelect: (holdingId: string) => void;
}

function headerCell(
  column: Column<Holding, unknown>,
  summary: SectorSummary,
  isExpanded: boolean,
  onToggle: (sector: string) => void,
) {
  const layout = layoutOf(column);
  const shared = cn(
    'px-3 py-2.5 text-xs font-semibold',
    layout.align === 'left' ? 'text-left' : 'text-right numeric',
    layout.sticky && 'sticky left-0 z-10 bg-muted',
  );

  switch (column.id) {
    case 'name':
      return (
        <th key={column.id} scope="row" className={shared}>
          <button
            type="button"
            onClick={() => onToggle(summary.sector)}
            aria-expanded={isExpanded}
            className="flex items-center gap-1.5 text-left whitespace-nowrap"
          >
            {isExpanded ? (
              <ChevronDown aria-hidden className="size-3.5 text-ink-faint" />
            ) : (
              <ChevronRight aria-hidden className="size-3.5 text-ink-faint" />
            )}
            <span className="tracking-wide">{summary.sector}</span>
            <span className="numeric font-normal text-ink-faint">
              {summary.holdingCount} holdings
            </span>
          </button>
        </th>
      );
    case 'investment':
      return (
        <td key={column.id} className={shared}>
          {formatCurrency(summary.totalInvestment)}
        </td>
      );
    case 'portfolioPercent':
      return (
        <td key={column.id} className={shared}>
          {formatPercent(summary.weightPercent)}
        </td>
      );
    case 'presentValue':
      return (
        <td key={column.id} className={shared}>
          {formatCurrency(summary.totalPresentValue)}
          {summary.isPartial ? (
            <Tooltip label="Some holdings in this sector have no live price, so this total covers the rest.">
              <span aria-hidden className="ml-1 text-accent">
                *
              </span>
            </Tooltip>
          ) : null}
        </td>
      );
    case 'gainLoss':
      return (
        <td key={column.id} className={shared}>
          <GainLossCell value={summary.gainLoss} percent={summary.gainLossPercent} />
        </td>
      );
    default:
      return <td key={column.id} className={shared} />;
  }
}

function SectorGroupBase({
  summary,
  rows,
  columns,
  isExpanded,
  onToggle,
  selectedId,
  onSelect,
}: SectorGroupProps) {
  return (
    <tbody className="border-b border-rule">
      <tr className="bg-muted">
        {columns.map((column) => headerCell(column, summary, isExpanded, onToggle))}
      </tr>
      {isExpanded
        ? rows.map((row) => (
            <HoldingRow
              key={row.id}
              row={row}
              isSelected={row.original.id === selectedId}
              onSelect={onSelect}
            />
          ))
        : null}
    </tbody>
  );
}

export const SectorGroup = memo(SectorGroupBase);
