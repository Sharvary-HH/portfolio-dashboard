import type { z } from 'zod';
import type {
  exchangeSchema,
  holdingSchema,
  dataSourceSchema,
  fieldStatusSchema,
  latestEarningsSchema,
  holdingRowSchema,
  sectorSummarySchema,
  portfolioResponseSchema,
  marketStateSchema,
  quoteSchema,
  fundamentalsSchema,
} from './schemas.js';

export type Exchange = z.infer<typeof exchangeSchema>;
export type Holding = z.infer<typeof holdingSchema>;
export type DataSource = z.infer<typeof dataSourceSchema>;
export type FieldStatus = z.infer<typeof fieldStatusSchema>;
export type LatestEarnings = z.infer<typeof latestEarningsSchema>;
export type HoldingRow = z.infer<typeof holdingRowSchema>;
export type SectorSummary = z.infer<typeof sectorSummarySchema>;
export type PortfolioResponse = z.infer<typeof portfolioResponseSchema>;
export type MarketState = z.infer<typeof marketStateSchema>;
export type Quote = z.infer<typeof quoteSchema>;
export type Fundamentals = z.infer<typeof fundamentalsSchema>;

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
