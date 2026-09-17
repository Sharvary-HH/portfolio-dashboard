import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  buildRows,
  computeTotals,
  formatClockTime,
  holdingsFileSchema,
  summariseSectors,
  type Holding,
  type MarketSnapshot,
  type PortfolioResponse,
} from '@portfolio/shared';
import { REFRESH_INTERVAL_MS, env } from '../config/env.js';
import { ConfigurationError, MarketDataUnavailableError, messageOf } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { getQuotes } from './quote.service.js';
import { getFundamentals } from './fundamentals.service.js';

let holdingsCache: Holding[] | null = null;

export async function loadHoldings(): Promise<Holding[]> {
  if (holdingsCache) return holdingsCache;

  const file = path.resolve(process.cwd(), env.HOLDINGS_FILE);

  let raw: string;
  try {
    raw = await readFile(file, 'utf8');
  } catch (error) {
    throw new ConfigurationError(
      `Could not read holdings file at ${file}. Run "npm run import:excel" to generate it.`,
      error,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new ConfigurationError(`Holdings file at ${file} is not valid JSON`, error);
  }

  const result = holdingsFileSchema.safeParse(parsed);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new ConfigurationError(`Holdings file at ${file} failed validation: ${details}`);
  }

  const holdings = result.data;
  holdingsCache = holdings;
  logger.info({ count: holdings.length }, 'holdings loaded');
  return holdings;
}

export function clearHoldingsCache(): void {
  holdingsCache = null;
}

export async function getPortfolio(): Promise<PortfolioResponse> {
  const holdings = await loadHoldings();
  const warnings: string[] = [];

  const quoteSnapshot = await getQuotes(holdings);

  if (quoteSnapshot.error) {
    warnings.push('Live prices are unavailable right now. Showing what we have.');
  } else if (quoteSnapshot.stale) {
    warnings.push(
      `Yahoo Finance did not respond. Prices are from ${formatClockTime(quoteSnapshot.updatedAt)}.`,
    );
  }

  const fundamentals = await getFundamentals(holdings, quoteSnapshot.quotes, quoteSnapshot.symbols);

  const snapshots = new Map<string, MarketSnapshot>();
  let missingPrices = 0;
  let staleFundamentals = 0;
  let fallbackFundamentals = 0;
  let failedFundamentals = 0;

  for (const holding of holdings) {
    const symbol = quoteSnapshot.symbols.get(holding.id);
    const quote = symbol ? quoteSnapshot.quotes.get(symbol) : undefined;
    const fundamental = fundamentals.get(holding.id);

    if (!quote || quote.price === null) missingPrices += 1;
    if (fundamental?.status.stale) staleFundamentals += 1;
    if (fundamental?.status.source === 'yahoo') fallbackFundamentals += 1;
    if (fundamental?.peRatio === null && fundamental.latestEarnings === null) {
      failedFundamentals += 1;
    }

    snapshots.set(holding.id, {
      cmp: quote?.price ?? null,
      dayChangePercent: quote?.dayChangePercent ?? null,
      peRatio: fundamental?.peRatio ?? null,
      latestEarnings: fundamental?.latestEarnings ?? null,
      quoteStatus: {
        source: quote ? (env.DATA_MODE === 'mock' ? 'mock' : 'yahoo') : null,
        stale: quoteSnapshot.stale,
        ...(quote ? {} : { error: 'No price available for this symbol' }),
      },
      fundamentalsStatus: fundamental?.status ?? { source: null, stale: false },
    });
  }

  const rows = buildRows(holdings, snapshots);
  const totals = computeTotals(rows);

  if (missingPrices > 0 && missingPrices < holdings.length) {
    warnings.push(
      `${missingPrices} of ${holdings.length} holdings have no live price. Totals exclude them.`,
    );
  }

  if (staleFundamentals > 0) {
    warnings.push(`P/E and earnings for ${staleFundamentals} holdings are being refreshed.`);
  }

  if (fallbackFundamentals > 0) {
    warnings.push(
      `Google Finance did not answer for ${fallbackFundamentals} holdings. Showing Yahoo Finance fundamentals instead.`,
    );
  }

  if (failedFundamentals > 0) {
    warnings.push(`P/E and earnings are unavailable for ${failedFundamentals} holdings.`);
  }

  if (holdings.length > 0 && totals.totalPresentValue === null) {
    throw new MarketDataUnavailableError(
      `No market data is available. ${quoteSnapshot.error ?? 'Every price lookup failed.'}`,
    );
  }

  return {
    rows,
    sectors: summariseSectors(rows),
    totals,
    meta: {
      generatedAt: new Date().toISOString(),
      lastQuoteUpdate: quoteSnapshot.updatedAt,
      marketState: quoteSnapshot.marketState,
      dataMode: env.DATA_MODE,
      refreshIntervalMs: REFRESH_INTERVAL_MS,
      warnings,
    },
  };
}

export async function warmUp(): Promise<void> {
  try {
    await getPortfolio();
    logger.info('warm-up complete');
  } catch (error) {
    logger.warn({ error: messageOf(error) }, 'warm-up failed');
  }
}
