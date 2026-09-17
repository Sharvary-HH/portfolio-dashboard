import type { MarketState } from '@portfolio/shared';
import { cn } from '@/lib/cn';

const LABELS: Record<MarketState, string> = {
  OPEN: 'Market open',
  CLOSED: 'Market closed',
  PRE: 'Pre-market',
  POST: 'Post-market',
  UNKNOWN: 'Market status unknown',
};

const TONES: Record<MarketState, string> = {
  OPEN: 'text-gain border-gain/40',
  CLOSED: 'text-ink-soft border-rule',
  PRE: 'text-accent border-accent/40',
  POST: 'text-accent border-accent/40',
  UNKNOWN: 'text-ink-faint border-rule',
};

export function MarketStatusBadge({ state }: { state: MarketState }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-1 text-xs font-medium',
        TONES[state],
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {LABELS[state]}
    </span>
  );
}
