import { portfolioResponseSchema, type PortfolioResponse } from '@portfolio/shared';

export class PortfolioRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PortfolioRequestError';
    this.status = status;
  }
}

export const PORTFOLIO_ENDPOINT = '/api/portfolio';

export async function fetchPortfolio(signal?: AbortSignal): Promise<PortfolioResponse> {
  const response = await fetch(PORTFOLIO_ENDPOINT, { cache: 'no-store', signal });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      (body as { error?: { message?: string } } | null)?.error?.message ??
      'The portfolio service is not responding.';
    throw new PortfolioRequestError(message, response.status);
  }

  return portfolioResponseSchema.parse(await response.json());
}

export async function fetchInitialPortfolio(): Promise<PortfolioResponse | null> {
  const base = process.env.API_BASE_URL ?? 'http://localhost:4000';

  try {
    const response = await fetch(`${base}${PORTFOLIO_ENDPOINT}`, { cache: 'no-store' });
    if (!response.ok) return null;
    return portfolioResponseSchema.parse(await response.json());
  } catch {
    return null;
  }
}
