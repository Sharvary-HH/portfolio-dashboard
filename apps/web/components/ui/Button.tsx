'use client';

import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'solid' | 'ghost' | 'brand';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60';

const variants: Record<Variant, string> = {
  solid: 'border border-rule bg-surface text-ink hover:bg-muted',
  ghost: 'text-ink-soft hover:bg-muted hover:text-ink',
  brand: 'bg-brand text-white hover:opacity-90',
};

export function Button({ variant = 'solid', className, type, ...props }: ButtonProps) {
  return (
    <button type={type ?? 'button'} className={cn(base, variants[variant], className)} {...props} />
  );
}
