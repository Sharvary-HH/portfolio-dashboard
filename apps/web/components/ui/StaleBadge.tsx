'use client';

import { CircleAlert, History } from 'lucide-react';
import type { FieldStatus } from '@portfolio/shared';
import { Tooltip } from './Tooltip';

const SOURCE_LABEL: Record<string, string> = {
  yahoo: 'Yahoo Finance',
  google: 'Google Finance',
  mock: 'demo data',
  cache: 'cache',
};

export function statusLabel(status: FieldStatus): string | null {
  if (status.error) return status.error;
  if (status.stale) {
    return `Showing the last value from ${SOURCE_LABEL[status.source ?? ''] ?? 'the provider'} while it refreshes.`;
  }
  return null;
}

export function StaleBadge({ status }: { status: FieldStatus }) {
  const label = statusLabel(status);
  if (!label) return null;

  const Icon = status.error ? CircleAlert : History;

  return (
    <Tooltip label={label} className="align-middle">
      <Icon aria-hidden className="ml-1 size-3 text-accent" />
      <span className="sr-only">{label}</span>
    </Tooltip>
  );
}
