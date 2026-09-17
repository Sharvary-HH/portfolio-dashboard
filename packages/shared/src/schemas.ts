import { z } from 'zod';

export const exchangeSchema = z.enum(['NSE', 'BSE']);

export const holdingSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sector: z.string().min(1),
  purchasePrice: z.number().positive(),
  quantity: z.number().int().positive(),
  exchange: exchangeSchema,
  exchangeCode: z.string().min(1),
});

export const holdingsFileSchema = z.array(holdingSchema);

export const dataSourceSchema = z.enum(['yahoo', 'google', 'mock', 'cache']);

export const fieldStatusSchema = z.object({
  source: dataSourceSchema.nullable(),
  stale: z.boolean(),
  error: z.string().optional(),
});

export const latestEarningsSchema = z.object({
  period: z.string().nullable(),
  eps: z.number().nullable(),
  netIncome: z.number().nullable(),
});

export const marketStateSchema = z.enum(['OPEN', 'CLOSED', 'PRE', 'POST', 'UNKNOWN']);

export const quoteSchema = z.object({
  symbol: z.string().min(1),
  price: z.number().finite().nullable(),
  dayChangePercent: z.number().finite().nullable(),
  currency: z.string().nullable(),
  marketState: marketStateSchema,
  quotedAt: z.string().nullable(),
  trailingPE: z.number().finite().nullable(),
  trailingEps: z.number().finite().nullable(),
  source: dataSourceSchema,
});

export const fundamentalsSchema = z.object({
  symbol: z.string().min(1),
  peRatio: z.number().finite().nullable(),
  latestEarnings: latestEarningsSchema.nullable(),
  source: dataSourceSchema,
  fetchedAt: z.string(),
});

export const holdingRowSchema = holdingSchema.extend({
  investment: z.number(),
  portfolioPercent: z.number(),
  cmp: z.number().nullable(),
  dayChangePercent: z.number().nullable(),
  presentValue: z.number().nullable(),
  gainLoss: z.number().nullable(),
  gainLossPercent: z.number().nullable(),
  peRatio: z.number().nullable(),
  latestEarnings: latestEarningsSchema.nullable(),
  status: z.object({
    quote: fieldStatusSchema,
    fundamentals: fieldStatusSchema,
  }),
});

export const sectorSummarySchema = z.object({
  sector: z.string(),
  totalInvestment: z.number(),
  totalPresentValue: z.number().nullable(),
  gainLoss: z.number().nullable(),
  gainLossPercent: z.number().nullable(),
  weightPercent: z.number(),
  holdingCount: z.number().int(),
  isPartial: z.boolean(),
});

export const portfolioResponseSchema = z.object({
  rows: z.array(holdingRowSchema),
  sectors: z.array(sectorSummarySchema),
  totals: z.object({
    totalInvestment: z.number(),
    totalPresentValue: z.number().nullable(),
    gainLoss: z.number().nullable(),
    gainLossPercent: z.number().nullable(),
    isPartial: z.boolean(),
  }),
  meta: z.object({
    generatedAt: z.string(),
    lastQuoteUpdate: z.string().nullable(),
    marketState: marketStateSchema,
    dataMode: z.enum(['live', 'mock']),
    refreshIntervalMs: z.number().int().positive(),
    warnings: z.array(z.string()),
  }),
});
