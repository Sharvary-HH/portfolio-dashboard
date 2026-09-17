import type { FieldStatus, Holding, HoldingRow, LatestEarnings, SectorSummary } from './types.js';

export interface MarketSnapshot {
  cmp: number | null;
  dayChangePercent: number | null;
  peRatio: number | null;
  latestEarnings: LatestEarnings | null;
  quoteStatus: FieldStatus;
  fundamentalsStatus: FieldStatus;
}

export interface PortfolioTotals {
  totalInvestment: number;
  totalPresentValue: number | null;
  gainLoss: number | null;
  gainLossPercent: number | null;
  isPartial: boolean;
}

const emptyStatus: FieldStatus = { source: null, stale: false };

export function investmentOf(holding: Pick<Holding, 'purchasePrice' | 'quantity'>): number {
  return holding.purchasePrice * holding.quantity;
}

export function presentValueOf(cmp: number | null, quantity: number): number | null {
  if (cmp === null || !Number.isFinite(cmp)) return null;
  return cmp * quantity;
}

export function gainLossOf(presentValue: number | null, investment: number): number | null {
  if (presentValue === null) return null;
  return presentValue - investment;
}

export function percentOf(part: number | null, whole: number): number | null {
  if (part === null || whole === 0 || !Number.isFinite(whole)) return null;
  return (part / whole) * 100;
}

export function totalInvestmentOf(holdings: readonly Holding[]): number {
  return holdings.reduce((sum, holding) => sum + investmentOf(holding), 0);
}

export function buildRows(
  holdings: readonly Holding[],
  snapshots: ReadonlyMap<string, MarketSnapshot>,
): HoldingRow[] {
  const totalInvestment = totalInvestmentOf(holdings);

  return holdings.map((holding) => {
    const snapshot = snapshots.get(holding.id);
    const investment = investmentOf(holding);
    const cmp = snapshot?.cmp ?? null;
    const presentValue = presentValueOf(cmp, holding.quantity);
    const gainLoss = gainLossOf(presentValue, investment);

    return {
      ...holding,
      investment,
      portfolioPercent: percentOf(investment, totalInvestment) ?? 0,
      cmp,
      dayChangePercent: snapshot?.dayChangePercent ?? null,
      presentValue,
      gainLoss,
      gainLossPercent: percentOf(gainLoss, investment),
      peRatio: snapshot?.peRatio ?? null,
      latestEarnings: snapshot?.latestEarnings ?? null,
      status: {
        quote: snapshot?.quoteStatus ?? emptyStatus,
        fundamentals: snapshot?.fundamentalsStatus ?? emptyStatus,
      },
    };
  });
}

export function summariseSectors(rows: readonly HoldingRow[]): SectorSummary[] {
  const totalInvestment = rows.reduce((sum, row) => sum + row.investment, 0);
  const bySector = new Map<string, HoldingRow[]>();

  for (const row of rows) {
    const bucket = bySector.get(row.sector);
    if (bucket) bucket.push(row);
    else bySector.set(row.sector, [row]);
  }

  return [...bySector.entries()].map(([sector, sectorRows]) => {
    const sectorInvestment = sectorRows.reduce((sum, row) => sum + row.investment, 0);
    const priced = sectorRows.filter((row) => row.presentValue !== null);
    const isPartial = priced.length !== sectorRows.length;

    const totalPresentValue =
      priced.length === 0 ? null : priced.reduce((sum, row) => sum + (row.presentValue ?? 0), 0);

    const pricedInvestment = priced.reduce((sum, row) => sum + row.investment, 0);
    const gainLoss = totalPresentValue === null ? null : totalPresentValue - pricedInvestment;

    return {
      sector,
      totalInvestment: sectorInvestment,
      totalPresentValue,
      gainLoss,
      gainLossPercent: percentOf(gainLoss, pricedInvestment),
      weightPercent: percentOf(sectorInvestment, totalInvestment) ?? 0,
      holdingCount: sectorRows.length,
      isPartial,
    };
  });
}

export function computeTotals(rows: readonly HoldingRow[]): PortfolioTotals {
  const totalInvestment = rows.reduce((sum, row) => sum + row.investment, 0);
  const priced = rows.filter((row) => row.presentValue !== null);
  const isPartial = priced.length !== rows.length;

  const totalPresentValue =
    priced.length === 0 ? null : priced.reduce((sum, row) => sum + (row.presentValue ?? 0), 0);

  const pricedInvestment = priced.reduce((sum, row) => sum + row.investment, 0);
  const gainLoss = totalPresentValue === null ? null : totalPresentValue - pricedInvestment;

  return {
    totalInvestment,
    totalPresentValue,
    gainLoss,
    gainLossPercent: percentOf(gainLoss, pricedInvestment),
    isPartial,
  };
}
