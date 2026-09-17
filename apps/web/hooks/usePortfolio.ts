'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PortfolioResponse } from '@portfolio/shared';
import { fetchPortfolio } from '@/lib/api';

const FALLBACK_INTERVAL_MS = 15_000;

export interface UsePortfolioResult {
  data: PortfolioResponse | null;
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isPaused: boolean;
  lastUpdated: Date | null;
  secondsUntilNextRefresh: number;
  refresh: () => void;
  togglePause: () => void;
  dismissError: () => void;
}

export function usePortfolio(initialData: PortfolioResponse | null = null): UsePortfolioResult {
  const [data, setData] = useState<PortfolioResponse | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(initialData === null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    initialData ? new Date(initialData.meta.generatedAt) : null,
  );
  const [secondsUntilNextRefresh, setSecondsUntilNextRefresh] = useState(
    Math.round((initialData?.meta.refreshIntervalMs ?? FALLBACK_INTERVAL_MS) / 1000),
  );

  const inFlight = useRef<AbortController | null>(null);
  const intervalMs = data?.meta.refreshIntervalMs ?? FALLBACK_INTERVAL_MS;

  const load = useCallback(() => {
    if (inFlight.current) return Promise.resolve();

    const controller = new AbortController();
    inFlight.current = controller;

    return Promise.resolve()
      .then(() => {
        setIsRefreshing(true);
        return fetchPortfolio(controller.signal);
      })
      .then((portfolio) => {
        setData(portfolio);
        setLastUpdated(new Date());
        setError(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : 'Could not reach the portfolio service.');
      })
      .finally(() => {
        if (inFlight.current === controller) inFlight.current = null;
        setIsRefreshing(false);
        setIsLoading(false);
        setSecondsUntilNextRefresh(Math.round(intervalMs / 1000));
      });
  }, [intervalMs]);

  useEffect(() => {
    if (initialData === null) void load();

    return () => {
      inFlight.current?.abort();
      inFlight.current = null;
    };
  }, [initialData, load]);

  useEffect(() => {
    if (isPaused) return undefined;

    const timer = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void load();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs, isPaused, load]);

  useEffect(() => {
    if (isPaused) return undefined;

    const timer = setInterval(() => {
      setSecondsUntilNextRefresh((seconds) =>
        seconds <= 1 ? Math.round(intervalMs / 1000) : seconds - 1,
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [intervalMs, isPaused]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isPaused) void load();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [isPaused, load]);

  const refresh = useCallback(() => void load(), [load]);
  const togglePause = useCallback(() => setIsPaused((paused) => !paused), []);
  const dismissError = useCallback(() => setError(null), []);

  return {
    data,
    error,
    isLoading,
    isRefreshing,
    isPaused,
    lastUpdated,
    secondsUntilNextRefresh,
    refresh,
    togglePause,
    dismissError,
  };
}
