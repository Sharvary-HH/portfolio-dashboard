import type { Column } from '@tanstack/react-table';
import type { HoldingRow } from '@portfolio/shared';

export interface ColumnLayout {
  align?: 'left' | 'right';
  sticky?: boolean;
  width?: string;
}

export function layoutOf(column: Column<HoldingRow, unknown>): ColumnLayout {
  return (column.columnDef.meta ?? {}) as ColumnLayout;
}

export function cellClass(column: Column<HoldingRow, unknown>): string {
  const layout = layoutOf(column);
  const classes = [layout.align === 'left' ? 'text-left' : 'text-right numeric'];

  if (layout.sticky) classes.push('sticky left-0 z-10 bg-surface group-hover:bg-muted');

  return classes.join(' ');
}
