import type { Holding, MarketState, Quote } from '@portfolio/shared';
import { PRICE_SANITY_FACTOR, env } from '../config/env.js';
import { StaleWhileErrorCache } from '../lib/cache.js';
import { CircuitBreaker } from '../lib/circuitBreaker.js';
import { messageOf } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { yahooSymbol } from '../lib/symbols.js';
import { fetchQuotes, marketStateFrom, resolveSymbol } from '../providers/yahoo.provider.js';
import { mockQuotes } from '../providers/mock.provider.js';

const QUOTES_KEY = 'quotes:all';

export interface QuoteSnapshot {
  quotes: Map<string, Quote>;
  symbols: Map<string, string>;
  marketState: MarketState;
  updatedAt: string | null;
  stale: boolean;
  error?: string;
}

const cache = new StaleWhileErrorCache({ staleMaxAgeSeconds: env.STALE_MAX_AGE_SECONDS });
const breaker = new CircuitBreaker('yahoo');

type SymbolMiss = 'keep' | 'drop';

function symbolKey(holdingId: string): string {
  return `symbol:${holdingId}`;
}

function missKey(holdingId: string): string {
  return `symbol-miss:${holdingId}`;
}

function currentSymbols(holdings: readonly Holding[]): Map<string, string> {
  const symbols = new Map<string, string>();

  for (const holding of holdings) {
    const resolved = cache.peek<string>(symbolKey(holding.id));
    if (resolved) {
      symbols.set(holding.id, resolved.value);
      continue;
    }

    if (cache.peek<SymbolMiss>(missKey(holding.id))?.value === 'drop') continue;
    symbols.set(holding.id, yahooSymbol(holding));
  }

  return symbols;
}

function isPlausible(price: number | null | undefined, purchasePrice: number): boolean {
  if (price === null || price === undefined) return false;
  const ratio = price / purchasePrice;
  return ratio > 1 / PRICE_SANITY_FACTOR && ratio < PRICE_SANITY_FACTOR;
}

function noteMiss(holdingId: string, miss: SymbolMiss): void {
  const ttl = miss === 'drop' ? env.SYMBOL_TTL_SECONDS : env.SYMBOL_RETRY_SECONDS;
  cache.set(missKey(holdingId), miss, ttl);
}

async function resolveMissing(
  holdings: readonly Holding[],
  symbols: Map<string, string>,
  quotes: Map<string, Quote>,
): Promise<{ holding: Holding; symbol: string }[]> {
  const pending: { holding: Holding; symbol: string }[] = [];

  for (const holding of holdings) {
    const symbol = symbols.get(holding.id);
    if (symbol && isPlausible(quotes.get(symbol)?.price, holding.purchasePrice)) continue;
    if (symbol) quotes.delete(symbol);
    if (cache.peek<SymbolMiss>(missKey(holding.id))) continue;

    let resolved: string | null;
    try {
      resolved = await resolveSymbol(holding);
    } catch (error) {
      logger.warn({ holding: holding.id, error: messageOf(error) }, 'symbol search failed');
      continue;
    }

    if (resolved === null || resolved === symbol) {
      noteMiss(holding.id, 'keep');
      logger.warn({ holding: holding.id }, 'no better Yahoo symbol found');
      continue;
    }

    pending.push({ holding, symbol: resolved });
  }

  return pending;
}

async function loadLiveQuotes(holdings: readonly Holding[]): Promise<Map<string, Quote>> {
  const symbols = currentSymbols(holdings);
  const quotes = await breaker.run(() => fetchQuotes([...new Set(symbols.values())]));

  const pending = await resolveMissing(holdings, symbols, quotes);
  if (pending.length === 0) return quotes;

  const extra = await breaker.run(() =>
    fetchQuotes([...new Set(pending.map((item) => item.symbol))]),
  );

  for (const { holding, symbol } of pending) {
    const quote = extra.get(symbol);

    if (quote && isPlausible(quote.price, holding.purchasePrice)) {
      cache.set(symbolKey(holding.id), symbol, env.SYMBOL_TTL_SECONDS);
      symbols.set(holding.id, symbol);
      quotes.set(symbol, quote);
      continue;
    }

    noteMiss(holding.id, 'drop');
    symbols.delete(holding.id);
    logger.warn({ holding: holding.id, symbol }, 'no usable price for this holding');
  }

  return quotes;
}

export async function getQuotes(holdings: readonly Holding[]): Promise<QuoteSnapshot> {
  if (env.DATA_MODE === 'mock') {
    const quotes = mockQuotes(holdings, yahooSymbol);
    return {
      quotes,
      symbols: new Map(holdings.map((holding) => [holding.id, yahooSymbol(holding)])),
      marketState: 'OPEN',
      updatedAt: new Date().toISOString(),
      stale: false,
    };
  }

  try {
    const result = await cache.getOrFetch(QUOTES_KEY, env.QUOTE_TTL_SECONDS, () =>
      loadLiveQuotes(holdings),
    );

    return {
      quotes: result.value,
      symbols: currentSymbols(holdings),
      marketState: marketStateFrom(result.value),
      updatedAt: new Date(result.storedAt).toISOString(),
      stale: result.stale,
    };
  } catch (error) {
    logger.error({ error: messageOf(error) }, 'quote refresh failed with no cached data');

    return {
      quotes: new Map(),
      symbols: currentSymbols(holdings),
      marketState: 'UNKNOWN',
      updatedAt: null,
      stale: true,
      error: messageOf(error),
    };
  }
}

export function quoteProviderState() {
  return { state: breaker.state, consecutiveFailures: breaker.consecutiveFailures };
}

export function resetQuoteService(): void {
  cache.clear();
  breaker.reset();
}
