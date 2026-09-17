'use client';

import { Button } from '@/components/ui/Button';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-lg flex-col items-start gap-4 px-6 py-24">
      <h1 className="text-lg font-semibold">The dashboard stopped rendering</h1>
      <p className="text-sm text-ink-soft">
        Something went wrong while drawing the page. Reloading usually clears it. If it keeps
        happening, check that the API is running and returning valid data.
      </p>
      <Button onClick={reset}>Reload the dashboard</Button>
    </main>
  );
}
