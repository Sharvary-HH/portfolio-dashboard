import { RETRY_ATTEMPTS, RETRY_BASE_DELAY_MS } from '../config/env.js';

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
  sleep?: (ms: number) => Promise<void>;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function statusOf(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null;
  const candidate = error as { status?: unknown; response?: { status?: unknown } };
  if (typeof candidate.status === 'number') return candidate.status;
  if (typeof candidate.response?.status === 'number') return candidate.response.status;
  return null;
}

function retryAfterMs(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null;
  const headers = (error as { response?: { headers?: Record<string, unknown> } }).response?.headers;
  const header = headers?.['retry-after'];
  if (typeof header !== 'string' && typeof header !== 'number') return null;

  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;

  const date = Date.parse(String(header));
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - Date.now());
}

export function isRetryable(error: unknown): boolean {
  const status = statusOf(error);
  if (status === null) return true;
  return RETRYABLE_STATUS.has(status);
}

function delayFor(attempt: number, baseDelayMs: number): number {
  const exponential = baseDelayMs * 2 ** (attempt - 1);
  const jitter = exponential * 0.3 * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(exponential + jitter));
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(task: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? RETRY_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? RETRY_BASE_DELAY_MS;
  const sleep = options.sleep ?? defaultSleep;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isRetryable(error)) break;

      const delayMs = retryAfterMs(error) ?? delayFor(attempt, baseDelayMs);
      options.onRetry?.(attempt, delayMs, error);
      await sleep(delayMs);
    }
  }

  throw lastError;
}
