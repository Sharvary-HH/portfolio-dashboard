import type { MarketState } from '@portfolio/shared';
import { cn } from '@/lib/cn';

const LABELS: Record<MarketState, string> = {
  OPEN: 'Market open',
  CLOSED: 'Market closed',
  PRE: 'Pre-market',
  POST: 'Post-market',
  UNKNOWN: 'Status unknown',
};

const TONES: Record<MarketState, string> = {
  OPEN: 'bg-gain-soft text-gain',
  CLOSED: 'bg-muted text-ink-soft',
  PRE: 'bg-accent-soft text-accent',
  POST: 'bg-accent-soft text-accent',
  UNKNOWN: 'bg-muted text-ink-faint',
};

export function MarketStatusBadge({ state }: { state: MarketState }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium',
        TONES[state],
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {LABELS[state]}
    </span>
  );
}
