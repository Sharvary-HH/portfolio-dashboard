import YahooFinance from 'yahoo-finance2';
import type { Holding, LatestEarnings, MarketState, Quote } from '@portfolio/shared';
import { YAHOO_BATCH_SIZE } from '../config/env.js';
import { ProviderError, messageOf } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { withRetry } from '../lib/retry.js';

const client = new YahooFinance({
  suppressNotices: ['yahooSurvey', 'ripHistorical'],
  validation: { logErrors: false, logOptionsErrors: false },
});

const MARKET_STATES: Record<string, MarketState> = {
  REGULAR: 'OPEN',
  PRE: 'PRE',
  PREPRE: 'PRE',
  POST: 'POST',
  POSTPOST: 'POST',
  CLOSED: 'CLOSED',
};

interface RawQuote {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: Date | number;
  marketState?: string;
  currency?: string;
  trailingPE?: number;
  epsTrailingTwelveMonths?: number;
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isoOrNull(value: Date | number | undefined): string | null {
  if (value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toQuote(raw: RawQuote): Quote | null {
  if (!raw.symbol) return null;

  return {
    symbol: raw.symbol,
    price: finiteOrNull(raw.regularMarketPrice),
    dayChangePercent: finiteOrNull(raw.regularMarketChangePercent),
    currency: raw.currency ?? null,
    marketState: MARKET_STATES[raw.marketState ?? ''] ?? 'UNKNOWN',
    quotedAt: isoOrNull(raw.regularMarketTime),
    trailingPE: finiteOrNull(raw.trailingPE),
    trailingEps: finiteOrNull(raw.epsTrailingTwelveMonths),
  };
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function fetchQuotes(symbols: readonly string[]): Promise<Map<string, Quote>> {
  const quotes = new Map<string, Quote>();
  if (symbols.length === 0) return quotes;

  for (const batch of chunk(symbols, YAHOO_BATCH_SIZE)) {
    const results = await withRetry(() => client.quote(batch)).catch((error: unknown) => {
      throw new ProviderError('yahoo', `Quote request failed: ${messageOf(error)}`, true, error);
    });

    for (const raw of (results ?? []) as RawQuote[]) {
      const quote = toQuote(raw);
      if (quote) quotes.set(quote.symbol, quote);
    }
  }

  return quotes;
}

export async function resolveSymbol(holding: Holding): Promise<string | null> {
  const results = await withRetry(() =>
    client.search(holding.name, { quotesCount: 8, newsCount: 0 }),
  ).catch((error: unknown) => {
    throw new ProviderError('yahoo', `Symbol search failed: ${messageOf(error)}`, true, error);
  });

  const candidates: { symbol: string; exchange: string }[] = [];

  for (const item of results.quotes) {
    const { symbol, exchange, quoteType } = item as {
      symbol?: unknown;
      exchange?: unknown;
      quoteType?: unknown;
    };

    if (typeof symbol !== 'string' || typeof exchange !== 'string') continue;
    if (quoteType !== 'EQUITY') continue;
    if (exchange !== 'NSI' && exchange !== 'BSE') continue;

    candidates.push({ symbol, exchange });
  }

  const preferred = candidates.find((item) => item.exchange === 'NSI') ?? candidates[0];
  return preferred ? preferred.symbol : null;
}

export async function fetchEarningsFallback(symbol: string): Promise<LatestEarnings | null> {
  const summary = await withRetry(() =>
    client.quoteSummary(symbol, { modules: ['earnings', 'defaultKeyStatistics'] }),
  ).catch((error: unknown) => {
    logger.warn({ symbol, error: messageOf(error) }, 'quoteSummary earnings failed');
    return null;
  });

  const quarterly = summary?.earnings?.earningsChart?.quarterly ?? [];
  const latest = quarterly.at(-1);
  if (!latest) return null;

  return {
    period: latest.date ? String(latest.date) : null,
    eps: finiteOrNull(latest.actual),
    netIncome: null,
  };
}

export function marketStateFrom(quotes: ReadonlyMap<string, Quote>): MarketState {
  for (const quote of quotes.values()) {
    if (quote.marketState !== 'UNKNOWN') return quote.marketState;
  }
  return 'UNKNOWN';
}
