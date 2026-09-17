import type { HistoryPoint } from '@portfolio/shared';
import { HISTORY_MAX_POINTS, HISTORY_MIN_SPACING_MS } from '../config/env.js';

const points: HistoryPoint[] = [];

export function recordValue(totalPresentValue: number | null, gainLoss: number | null): void {
  if (totalPresentValue === null) return;

  const now = Date.now();
  const last = points.at(-1);

  if (last && now - Date.parse(last.at) < HISTORY_MIN_SPACING_MS) {
    points[points.length - 1] = { at: last.at, value: totalPresentValue, gainLoss };
    return;
  }

  points.push({ at: new Date(now).toISOString(), value: totalPresentValue, gainLoss });
  if (points.length > HISTORY_MAX_POINTS) points.shift();
}

export function valueHistory(): HistoryPoint[] {
  return [...points];
}

export function resetHistory(): void {
  points.length = 0;
}
