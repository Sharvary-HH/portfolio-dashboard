'use client';

import { memo } from 'react';
import { flexRender, type Row } from '@tanstack/react-table';
import type { HoldingRow as Holding } from '@portfolio/shared';
import { cn } from '@/lib/cn';
import { cellClass } from './cellClass';

interface HoldingRowProps {
  row: Row<Holding>;
  isSelected: boolean;
  onSelect: (holdingId: string) => void;
}

function HoldingRowBase({ row, isSelected, onSelect }: HoldingRowProps) {
  return (
    <tr
      onClick={() => onSelect(row.original.id)}
      className={cn(
        'group cursor-pointer border-b border-rule/60 last:border-b-0 hover:bg-muted',
        isSelected && 'bg-brand-soft/60',
      )}
    >
      {row.getVisibleCells().map((cell) => (
        <td key={cell.id} className={cn('px-3 py-3 align-middle', cellClass(cell.column))}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
}

export const HoldingRow = memo(HoldingRowBase);
