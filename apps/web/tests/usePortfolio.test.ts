import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PortfolioResponse } from '@portfolio/shared';
import { usePortfolio } from '@/hooks/usePortfolio';

const fetchPortfolio = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({ fetchPortfolio }));

function snapshot(totalPresentValue: number): PortfolioResponse {
  return {
    rows: [],
    sectors: [],
    history: [],
    totals: {
      totalInvestment: 1000,
      totalPresentValue,
      gainLoss: totalPresentValue - 1000,
      gainLossPercent: (totalPresentValue / 1000 - 1) * 100,
      isPartial: false,
    },
    meta: {
      generatedAt: new Date().toISOString(),
      lastQuoteUpdate: new Date().toISOString(),
      marketState: 'OPEN',
      dataMode: 'live',
      refreshIntervalMs: 15_000,
      warnings: [],
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePortfolio', () => {
  it('loads on mount and exposes the snapshot', async () => {
    fetchPortfolio.mockResolvedValue(snapshot(1200));

    const { result } = renderHook(() => usePortfolio());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.data?.totals.totalPresentValue).toBe(1200);
    expect(result.current.error).toBeNull();
  });

  it('keeps the previous data when a refresh fails', async () => {
    fetchPortfolio.mockResolvedValueOnce(snapshot(1200));
    const { result } = renderHook(() => usePortfolio());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    fetchPortfolio.mockRejectedValueOnce(new Error('Service unavailable'));
    await act(async () => {
      result.current.refresh();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.error).toBe('Service unavailable');
    expect(result.current.data?.totals.totalPresentValue).toBe(1200);
  });

  it('polls on the interval the server asks for', async () => {
    fetchPortfolio.mockResolvedValue(snapshot(1200));

    renderHook(() => usePortfolio());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(fetchPortfolio).toHaveBeenCalledTimes(2);
  });

  it('stops polling while updates are paused', async () => {
    fetchPortfolio.mockResolvedValue(snapshot(1200));

    const { result } = renderHook(() => usePortfolio());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    act(() => {
      result.current.togglePause();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(45_000);
    });

    expect(fetchPortfolio).toHaveBeenCalledTimes(1);
    expect(result.current.isPaused).toBe(true);
  });
});
