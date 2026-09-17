'use client';

import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function Warnings({ warnings }: { warnings: string[] }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || warnings.length === 0) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
      <ul className="flex flex-1 flex-col gap-1">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
      <Button variant="ghost" onClick={() => setDismissed(true)} aria-label="Dismiss these notices">
        <X aria-hidden className="size-3.5" />
      </Button>
    </div>
  );
}
