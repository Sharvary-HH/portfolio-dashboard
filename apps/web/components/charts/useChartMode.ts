'use client';

import { useTheme } from 'next-themes';
import { useMounted } from '@/hooks/useMounted';
import type { ChartMode } from './palette';

export function useChartMode(): ChartMode {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();

  return mounted && resolvedTheme === 'dark' ? 'dark' : 'light';
}
