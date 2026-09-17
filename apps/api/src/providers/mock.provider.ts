import type { Fundamentals, Holding, Quote } from '@portfolio/shared';

const prices = new Map<string, number>();

function seededOffset(symbol: string): number {
  let hash = 0;
  for (let index = 0; index < symbol.length; index += 1) {
    hash = (hash * 31 + symbol.charCodeAt(index)) % 1000;
  }
  return (hash / 1000) * 0.4 - 0.2;
}

function nextPrice(symbol: string, purchasePrice: number): number {
  const current = prices.get(symbol);
  if (current === undefined) {
    const start = purchasePrice * (1 + seededOffset(symbol));
    prices.set(symbol, start);
    return start;
  }

  const drift = 1 + (Math.random() * 0.01 - 0.005);
  const next = Math.max(1, current * drift);
  prices.set(symbol, next);
  return next;
}

export function mockQuotes(holdings: readonly Holding[], symbolOf: (holding: Holding) => string) {
  const quotes = new Map<string, Quote>();

  for (const holding of holdings) {
    const symbol = symbolOf(holding);
    const price = nextPrice(symbol, holding.purchasePrice);

    quotes.set(symbol, {
      symbol,
      price: Number(price.toFixed(2)),
      dayChangePercent: Number(((price / holding.purchasePrice - 1) * 100).toFixed(2)),
      currency: 'INR',
      marketState: 'OPEN',
      quotedAt: new Date().toISOString(),
      trailingPE: Number((15 + seededOffset(symbol) * 40).toFixed(2)),
      trailingEps: Number((price / 25).toFixed(2)),
    });
  }

  return quotes;
}

export function mockFundamentals(symbol: string, purchasePrice: number): Fundamentals {
  const eps = Number((purchasePrice / 28).toFixed(2));

  return {
    symbol,
    peRatio: Number((18 + seededOffset(symbol) * 50).toFixed(2)),
    latestEarnings: {
      period: 'Jun 2026',
      eps,
      netIncome: Math.round(eps * 1_000_000 * 12),
    },
    source: 'mock',
    fetchedAt: new Date().toISOString(),
  };
}

export function resetMockPrices(): void {
  prices.clear();
}
