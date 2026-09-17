import { describe, expect, it } from 'vitest';
import {
  buildRows,
  computeTotals,
  gainLossOf,
  investmentOf,
  percentOf,
  presentValueOf,
  summariseSectors,
  type MarketSnapshot,
} from '../src/calculations.js';
import type { Holding } from '../src/types.js';

const ok: Pick<MarketSnapshot, 'quoteStatus' | 'fundamentalsStatus'> = {
  quoteStatus: { source: 'yahoo', stale: false },
  fundamentalsStatus: { source: 'google', stale: false },
};

function holding(overrides: Partial<Holding> & Pick<Holding, 'id'>): Holding {
  return {
    name: 'Test Co',
    sector: 'Financials',
    purchasePrice: 100,
    quantity: 10,
    exchange: 'NSE',
    exchangeCode: 'TEST',
    ...overrides,
  };
}

function snapshot(cmp: number | null, pe: number | null = 20): MarketSnapshot {
  return {
    cmp,
    dayChangePercent: cmp === null ? null : 1.25,
    peRatio: pe,
    latestEarnings: null,
    ...ok,
  };
}

describe('primitive calculations', () => {
  it('multiplies purchase price by quantity', () => {
    expect(investmentOf({ purchasePrice: 1490, quantity: 50 })).toBe(74500);
  });

  it('returns null present value when the price is missing', () => {
    expect(presentValueOf(null, 50)).toBeNull();
    expect(presentValueOf(1700.15, 50)).toBeCloseTo(85007.5, 6);
  });

  it('returns null gain when there is no present value', () => {
    expect(gainLossOf(null, 74500)).toBeNull();
    expect(gainLossOf(85007.5, 74500)).toBeCloseTo(10507.5, 6);
  });

  it('guards against division by zero', () => {
    expect(percentOf(100, 0)).toBeNull();
    expect(percentOf(null, 100)).toBeNull();
    expect(percentOf(25, 200)).toBe(12.5);
  });

  it('keeps floating point noise out of the rounded output', () => {
    const value = percentOf(0.1 + 0.2, 3);
    expect(value).not.toBeNull();
    expect(Number(value?.toFixed(2))).toBe(10);
  });
});

describe('buildRows', () => {
  const holdings: Holding[] = [
    holding({ id: 'a', purchasePrice: 1000, quantity: 10 }),
    holding({ id: 'b', purchasePrice: 500, quantity: 20, sector: 'Technology' }),
  ];

  it('computes every derived field for a healthy portfolio', () => {
    const rows = buildRows(
      holdings,
      new Map([
        ['a', snapshot(1200)],
        ['b', snapshot(400)],
      ]),
    );

    expect(rows[0]?.investment).toBe(10000);
    expect(rows[0]?.portfolioPercent).toBe(50);
    expect(rows[0]?.presentValue).toBe(12000);
    expect(rows[0]?.gainLoss).toBe(2000);
    expect(rows[0]?.gainLossPercent).toBe(20);
    expect(rows[1]?.gainLoss).toBe(-2000);
    expect(rows[1]?.gainLossPercent).toBe(-20);
  });

  it('leaves value fields null when the price is unavailable', () => {
    const rows = buildRows(
      holdings,
      new Map([
        ['a', snapshot(null)],
        ['b', snapshot(400)],
      ]),
    );

    expect(rows[0]?.cmp).toBeNull();
    expect(rows[0]?.presentValue).toBeNull();
    expect(rows[0]?.gainLoss).toBeNull();
    expect(rows[0]?.gainLossPercent).toBeNull();
    expect(rows[0]?.investment).toBe(10000);
  });

  it('falls back to an empty status when a holding has no snapshot', () => {
    const rows = buildRows(holdings, new Map());
    expect(rows[0]?.status.quote).toEqual({ source: null, stale: false });
  });

  it('handles a single holding portfolio', () => {
    const rows = buildRows([holdings[0] as Holding], new Map([['a', snapshot(1000)]]));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.portfolioPercent).toBe(100);
  });
});

describe('summariseSectors', () => {
  it('totals investment and present value per sector', () => {
    const rows = buildRows(
      [
        holding({ id: 'a', purchasePrice: 1000, quantity: 10 }),
        holding({ id: 'b', purchasePrice: 2000, quantity: 5 }),
        holding({ id: 'c', purchasePrice: 500, quantity: 20, sector: 'Technology' }),
      ],
      new Map([
        ['a', snapshot(1200)],
        ['b', snapshot(1800)],
        ['c', snapshot(600)],
      ]),
    );

    const sectors = summariseSectors(rows);
    const financials = sectors.find((sector) => sector.sector === 'Financials');

    expect(financials?.totalInvestment).toBe(20000);
    expect(financials?.totalPresentValue).toBe(21000);
    expect(financials?.gainLoss).toBe(1000);
    expect(financials?.holdingCount).toBe(2);
    expect(financials?.isPartial).toBe(false);
    expect(financials?.weightPercent).toBeCloseTo(66.666, 2);
  });

  it('marks a sector partial and excludes unpriced holdings from the gain', () => {
    const rows = buildRows(
      [
        holding({ id: 'a', purchasePrice: 1000, quantity: 10 }),
        holding({ id: 'b', purchasePrice: 2000, quantity: 5 }),
      ],
      new Map([
        ['a', snapshot(1200)],
        ['b', snapshot(null)],
      ]),
    );

    const [financials] = summariseSectors(rows);
    expect(financials?.isPartial).toBe(true);
    expect(financials?.totalInvestment).toBe(20000);
    expect(financials?.totalPresentValue).toBe(12000);
    expect(financials?.gainLoss).toBe(2000);
    expect(financials?.gainLossPercent).toBe(20);
  });

  it('returns a null present value when no holding in the sector is priced', () => {
    const rows = buildRows(
      [holding({ id: 'a' }), holding({ id: 'b' })],
      new Map([
        ['a', snapshot(null)],
        ['b', snapshot(null)],
      ]),
    );

    const [financials] = summariseSectors(rows);
    expect(financials?.totalPresentValue).toBeNull();
    expect(financials?.gainLoss).toBeNull();
    expect(financials?.gainLossPercent).toBeNull();
  });
});

describe('computeTotals', () => {
  it('aggregates the whole portfolio', () => {
    const rows = buildRows(
      [
        holding({ id: 'a', purchasePrice: 1000, quantity: 10 }),
        holding({ id: 'b', purchasePrice: 500, quantity: 20, sector: 'Technology' }),
      ],
      new Map([
        ['a', snapshot(1100)],
        ['b', snapshot(550)],
      ]),
    );

    expect(computeTotals(rows)).toEqual({
      totalInvestment: 20000,
      totalPresentValue: 22000,
      gainLoss: 2000,
      gainLossPercent: 10,
      isPartial: false,
    });
  });

  it('reports zero totals for an empty portfolio', () => {
    expect(computeTotals([])).toEqual({
      totalInvestment: 0,
      totalPresentValue: null,
      gainLoss: null,
      gainLossPercent: null,
      isPartial: false,
    });
  });
});
