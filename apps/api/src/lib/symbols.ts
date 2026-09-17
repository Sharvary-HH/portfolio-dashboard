import type { Exchange, Holding } from '@portfolio/shared';

const YAHOO_SUFFIX: Record<Exchange, string> = { NSE: '.NS', BSE: '.BO' };
const GOOGLE_SUFFIX: Record<Exchange, string> = { NSE: 'NSE', BSE: 'BOM' };

export function yahooSymbol(holding: Pick<Holding, 'exchange' | 'exchangeCode'>): string {
  return `${holding.exchangeCode.trim().toUpperCase()}${YAHOO_SUFFIX[holding.exchange]}`;
}

export function googleQuoteCode(holding: Pick<Holding, 'exchange' | 'exchangeCode'>): string {
  return `${holding.exchangeCode.trim().toUpperCase()}:${GOOGLE_SUFFIX[holding.exchange]}`;
}

export function exchangeForCode(code: string): Exchange {
  return /^\d+$/.test(code.trim()) ? 'BSE' : 'NSE';
}

export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
