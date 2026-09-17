'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TooltipProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ label, children, className }: TooltipProps) {
  return (
    <span className={cn('group/tip relative inline-flex', className)} tabIndex={0} title={label}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden w-max max-w-56 -translate-x-1/2 rounded-sm border border-rule bg-surface px-2 py-1 text-left text-xs font-normal whitespace-normal text-ink-soft shadow-sm group-hover/tip:block group-focus/tip:block"
      >
        {label}
      </span>
    </span>
  );
}
