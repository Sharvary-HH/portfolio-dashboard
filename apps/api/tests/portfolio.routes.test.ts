import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Quote } from '@portfolio/shared';

const providers = vi.hoisted(() => ({
  fetchQuotes: vi.fn(),
  resolveSymbol: vi.fn(),
  fetchEarningsFallback: vi.fn(),
  fetchQuotePage: vi.fn(),
}));

vi.mock('../src/providers/yahoo.provider.js', () => ({
  fetchQuotes: providers.fetchQuotes,
  resolveSymbol: providers.resolveSymbol,
  fetchEarningsFallback: providers.fetchEarningsFallback,
  marketStateFrom: () => 'OPEN',
}));

vi.mock('../src/providers/googleFinance.provider.js', () => ({
  fetchQuotePage: providers.fetchQuotePage,
}));

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

function quote(symbol: string, price: number): Quote {
  return {
    symbol,
    price,
    dayChangePercent: 0.5,
    currency: 'INR',
    marketState: 'OPEN',
    quotedAt: new Date().toISOString(),
    trailingPE: 21.5,
    trailingEps: 44.2,
  };
}

const healthyQuotes = () =>
  new Map([
    ['HDFCBANK.NS', quote('HDFCBANK.NS', 1700)],
    ['ICICIBANK.NS', quote('ICICIBANK.NS', 1215.5)],
    ['INFY.NS', quote('INFY.NS', 1725.3)],
  ]);

let app: Express;
let resetQuotes: () => void;
let resetFundamentals: () => void;
let clearHoldings: () => void;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATA_MODE = 'live';
  process.env.HOLDINGS_FILE = path.join(fixturesDir, 'holdings.json');
  process.env.WARM_UP_ON_START = 'false';
  process.env.LOG_LEVEL = 'silent';
  process.env.QUOTE_TTL_SECONDS = '1';

  const [{ createApp }, quoteService, fundamentalsService, portfolioService] = await Promise.all([
    import('../src/app.js'),
    import('../src/services/quote.service.js'),
    import('../src/services/fundamentals.service.js'),
    import('../src/services/portfolio.service.js'),
  ]);

  app = createApp();
  resetQuotes = quoteService.resetQuoteService;
  resetFundamentals = fundamentalsService.resetFundamentalsService;
  clearHoldings = portfolioService.clearHoldingsCache;
});

beforeEach(() => {
  vi.clearAllMocks();
  resetQuotes();
  resetFundamentals();
  clearHoldings();

  providers.resolveSymbol.mockResolvedValue('ICICIBANK.NS');
  providers.fetchEarningsFallback.mockResolvedValue(null);
  providers.fetchQuotePage.mockResolvedValue({
    peRatio: 18.69,
    eps: 91.02,
    latestEarnings: { period: 'Jun 2026', eps: 12.09, netIncome: 170_620_000_000 },
  });
});

describe('GET /api/health', () => {
  it('reports the provider circuit states', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.providers.yahoo.state).toBe('closed');
    expect(response.body.providers.google.state).toBe('closed');
  });
});

describe('GET /api/portfolio', () => {
  it('returns computed rows, sectors and totals when every provider is healthy', async () => {
    providers.fetchQuotes.mockResolvedValue(healthyQuotes());

    const response = await request(app).get('/api/portfolio').expect(200);
    const body = response.body;

    expect(response.headers['cache-control']).toBe('no-store');
    expect(body.rows).toHaveLength(3);
    expect(body.sectors.map((sector: { sector: string }) => sector.sector)).toEqual([
      'Financial',
      'Tech',
    ]);

    const hdfc = body.rows.find((row: { id: string }) => row.id === 'hdfc-bank');
    expect(hdfc.investment).toBe(74500);
    expect(hdfc.presentValue).toBe(85000);
    expect(hdfc.gainLoss).toBe(10500);
    expect(hdfc.peRatio).toBe(18.69);
    expect(hdfc.status.fundamentals.source).toBe('google');

    expect(body.totals.totalInvestment).toBe(74500 + 65520 + 59292);
    expect(body.meta.refreshIntervalMs).toBe(15000);
    expect(body.meta.warnings).toEqual([]);
  });

  it('resolves a symbol by search when the exchange code returns no quote', async () => {
    providers.fetchQuotes
      .mockResolvedValueOnce(
        new Map([
          ['HDFCBANK.NS', quote('HDFCBANK.NS', 1700)],
          ['INFY.NS', quote('INFY.NS', 1725.3)],
        ]),
      )
      .mockResolvedValueOnce(new Map([['ICICIBANK.NS', quote('ICICIBANK.NS', 1215.5)]]));

    const response = await request(app).get('/api/portfolio').expect(200);
    const icici = response.body.rows.find((row: { id: string }) => row.id === 'icici-bank');

    expect(providers.resolveSymbol).toHaveBeenCalledOnce();
    expect(icici.cmp).toBe(1215.5);
  });

  it('falls back to Yahoo fundamentals and warns when Google is down', async () => {
    providers.fetchQuotes.mockResolvedValue(healthyQuotes());
    providers.fetchQuotePage.mockRejectedValue(new Error('403 Forbidden'));

    const response = await request(app).get('/api/portfolio').expect(200);
    const hdfc = response.body.rows.find((row: { id: string }) => row.id === 'hdfc-bank');

    expect(hdfc.peRatio).toBe(21.5);
    expect(hdfc.status.fundamentals.source).toBe('yahoo');
    expect(response.body.meta.warnings.join(' ')).toContain('Google Finance');
  });

  it('serves stale prices with a warning when a later refresh fails', async () => {
    providers.fetchQuotes.mockResolvedValueOnce(healthyQuotes());
    await request(app).get('/api/portfolio').expect(200);

    providers.fetchQuotes.mockRejectedValue(new Error('Yahoo unreachable'));
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const response = await request(app).get('/api/portfolio').expect(200);

    expect(response.body.totals.totalPresentValue).toBeGreaterThan(0);
    expect(response.body.rows[0].status.quote.stale).toBe(true);
    expect(response.body.meta.warnings.join(' ')).toContain('Yahoo Finance did not respond');
  });

  it('returns 503 when nothing is cached and every provider fails', async () => {
    providers.fetchQuotes.mockRejectedValue(new Error('Yahoo unreachable'));
    providers.fetchQuotePage.mockRejectedValue(new Error('403 Forbidden'));

    const response = await request(app).get('/api/portfolio').expect(503);

    expect(response.body.error.code).toBe('MARKET_DATA_UNAVAILABLE');
  });
});

describe('unknown routes', () => {
  it('answers with the shared error envelope', async () => {
    const response = await request(app).get('/api/nope').expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
