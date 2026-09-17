import type { FieldStatus, Fundamentals, Holding, Quote } from '@portfolio/shared';
import { env } from '../config/env.js';
import { StaleWhileErrorCache } from '../lib/cache.js';
import { CircuitBreaker } from '../lib/circuitBreaker.js';
import { messageOf } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { googleQuoteCode } from '../lib/symbols.js';
import { fetchQuotePage } from '../providers/googleFinance.provider.js';
import { fetchEarningsFallback } from '../providers/yahoo.provider.js';
import { mockFundamentals } from '../providers/mock.provider.js';

export interface FundamentalsResult {
  peRatio: number | null;
  latestEarnings: Fundamentals['latestEarnings'];
  status: FieldStatus;
}

const cache = new StaleWhileErrorCache({ staleMaxAgeSeconds: env.STALE_MAX_AGE_SECONDS });
const breaker = new CircuitBreaker('google');

function cacheKey(holding: Holding): string {
  return `fund:${googleQuoteCode(holding)}`;
}

async function fromGoogle(holding: Holding): Promise<Fundamentals> {
  const page = await breaker.run(() => fetchQuotePage(googleQuoteCode(holding)));

  if (page.peRatio === null && page.latestEarnings === null) {
    throw new Error('Google Finance returned no usable fundamentals');
  }

  return {
    symbol: googleQuoteCode(holding),
    peRatio: page.peRatio,
    latestEarnings: page.latestEarnings,
    source: 'google',
    fetchedAt: new Date().toISOString(),
  };
}

async function fromYahoo(quote: Quote | undefined): Promise<Fundamentals | null> {
  if (!quote) return null;

  const earnings = await fetchEarningsFallback(quote.symbol);
  const eps = earnings?.eps ?? quote.trailingEps;

  if (quote.trailingPE === null && eps === null) return null;

  return {
    symbol: quote.symbol,
    peRatio: quote.trailingPE,
    latestEarnings: earnings ?? (eps === null ? null : { period: 'TTM', eps, netIncome: null }),
    source: 'yahoo',
    fetchedAt: new Date().toISOString(),
  };
}

async function load(holding: Holding, quote: Quote | undefined): Promise<Fundamentals> {
  try {
    return await fromGoogle(holding);
  } catch (error) {
    logger.warn({ holding: holding.id, error: messageOf(error) }, 'google fundamentals failed');

    const fallback = await fromYahoo(quote);
    if (fallback) return fallback;

    throw error;
  }
}

function toResult(value: Fundamentals, status: FieldStatus): FundamentalsResult {
  return { peRatio: value.peRatio, latestEarnings: value.latestEarnings, status };
}

async function resolveOne(holding: Holding, quote: Quote | undefined): Promise<FundamentalsResult> {
  const key = cacheKey(holding);
  const cached = cache.peek<Fundamentals>(key);

  if (cached && !cached.stale) {
    return toResult(cached.value, { source: cached.value.source, stale: false });
  }

  if (cached) {
    void cache.revalidate(key, env.FUNDAMENTALS_TTL_SECONDS, () => load(holding, quote));
    return toResult(cached.value, { source: cached.value.source, stale: true });
  }

  try {
    const result = await cache.getOrFetch(key, env.FUNDAMENTALS_TTL_SECONDS, () =>
      load(holding, quote),
    );
    return toResult(result.value, { source: result.value.source, stale: result.stale });
  } catch (error) {
    return {
      peRatio: quote?.trailingPE ?? null,
      latestEarnings:
        quote?.trailingEps === null || quote?.trailingEps === undefined
          ? null
          : { period: 'TTM', eps: quote.trailingEps, netIncome: null },
      status: {
        source: quote?.trailingPE === null ? null : 'yahoo',
        stale: false,
        error: messageOf(error),
      },
    };
  }
}

export async function getFundamentals(
  holdings: readonly Holding[],
  quotes: ReadonlyMap<string, Quote>,
  symbols: ReadonlyMap<string, string>,
): Promise<Map<string, FundamentalsResult>> {
  const results = new Map<string, FundamentalsResult>();

  if (env.DATA_MODE === 'mock') {
    for (const holding of holdings) {
      const value = mockFundamentals(googleQuoteCode(holding), holding.purchasePrice);
      results.set(holding.id, toResult(value, { source: 'mock', stale: false }));
    }
    return results;
  }

  const settled = await Promise.all(
    holdings.map(async (holding) => {
      const symbol = symbols.get(holding.id);
      const quote = symbol ? quotes.get(symbol) : undefined;
      return [holding.id, await resolveOne(holding, quote)] as const;
    }),
  );

  for (const [id, result] of settled) results.set(id, result);
  return results;
}

export function fundamentalsProviderState() {
  return { state: breaker.state, consecutiveFailures: breaker.consecutiveFailures };
}

export function resetFundamentalsService(): void {
  cache.clear();
  breaker.reset();
}
