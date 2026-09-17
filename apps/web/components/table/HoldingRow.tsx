'use client';

import { memo } from 'react';
import { flexRender, type Row } from '@tanstack/react-table';
import type { HoldingRow as Holding } from '@portfolio/shared';
import { cn } from '@/lib/cn';
import { cellClass } from './cellClass';

function HoldingRowBase({ row }: { row: Row<Holding> }) {
  return (
    <tr className="border-b border-rule/70 last:border-b-0 hover:bg-sunken/60">
      {row.getVisibleCells().map((cell) => (
        <td key={cell.id} className={cn('px-3 py-2.5 align-middle', cellClass(cell.column))}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
}

export const HoldingRow = memo(HoldingRowBase);
