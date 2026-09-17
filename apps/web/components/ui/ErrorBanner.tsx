'use client';

import { RotateCw, TriangleAlert, X } from 'lucide-react';
import { Button } from './Button';

interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 border border-loss/40 bg-loss/5 px-3 py-2 text-sm text-ink"
    >
      <TriangleAlert aria-hidden className="size-4 shrink-0 text-loss" />
      <p className="flex-1 min-w-48">{message}</p>
      <Button onClick={onRetry}>
        <RotateCw aria-hidden className="size-3.5" />
        Try again
      </Button>
      {onDismiss ? (
        <Button variant="ghost" onClick={onDismiss} aria-label="Dismiss this message">
          <X aria-hidden className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
