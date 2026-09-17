'use client';

import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'solid' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<Variant, string> = {
  solid: 'border-rule bg-surface text-ink hover:bg-sunken',
  ghost: 'border-transparent text-ink-soft hover:border-rule hover:text-ink',
};

export function Button({ variant = 'solid', className, type, ...props }: ButtonProps) {
  return (
    <button type={type ?? 'button'} className={cn(base, variants[variant], className)} {...props} />
  );
}
