import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ConsentPageError,
  parseCompactNumber,
  parseGoogleFinance,
} from '../src/providers/googleFinance.parser.js';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

function fixture(name: string): string {
  return readFileSync(path.join(fixturesDir, `google-finance-${name}.html`), 'utf8');
}

describe('parseCompactNumber', () => {
  it('expands compact suffixes', () => {
    expect(parseCompactNumber('170.62B')).toBe(170.62e9);
    expect(parseCompactNumber('9.32M')).toBe(9.32e6);
    expect(parseCompactNumber('2.72T')).toBe(2.72e12);
    expect(parseCompactNumber('845K')).toBe(845e3);
  });

  it('strips currency symbols and separators', () => {
    expect(parseCompactNumber('₹1,020.50')).toBe(1020.5);
    expect(parseCompactNumber('1.82%')).toBe(1.82);
    expect(parseCompactNumber('-12.5')).toBe(-12.5);
  });

  it('treats dashes and junk as missing', () => {
    expect(parseCompactNumber('—')).toBeNull();
    expect(parseCompactNumber('-')).toBeNull();
    expect(parseCompactNumber('')).toBeNull();
    expect(parseCompactNumber(undefined)).toBeNull();
    expect(parseCompactNumber('Jun 19, 2026')).toBeNull();
  });
});

describe('parseGoogleFinance', () => {
  it('reads the live price, change and currency from an NSE page', () => {
    const result = parseGoogleFinance(fixture('nse'));

    expect(result.price).toBe(714.85);
    expect(result.dayChangePercent).toBe(-0.92);
    expect(result.currency).toBe('INR');
  });

  it('reads the live price from a BSE page', () => {
    const result = parseGoogleFinance(fixture('bse'));

    expect(result.price).toBe(1354.2);
    expect(result.dayChangePercent).toBe(-0.35);
  });

  it('does not mistake a labelled key stat for the live price', () => {
    const result = parseGoogleFinance(fixture('nse'));

    expect(result.price).not.toBe(717.5);
  });

  it('reads the P/E ratio and latest quarter from an NSE page', () => {
    const result = parseGoogleFinance(fixture('nse'));

    expect(result.peRatio).toBeGreaterThan(0);
    expect(result.eps).toBeGreaterThan(0);
    expect(result.latestEarnings?.period).toMatch(/\w{3} \d{4}/);
    expect(result.latestEarnings?.netIncome).toBeGreaterThan(0);
  });

  it('reads the same fields from a BSE page', () => {
    const result = parseGoogleFinance(fixture('bse'));

    expect(result.peRatio).toBeGreaterThan(0);
    expect(result.latestEarnings?.netIncome).toBeGreaterThan(0);
  });

  it('returns nulls when the page shows dashes instead of values', () => {
    const result = parseGoogleFinance(fixture('missing-pe'));

    expect(result.peRatio).toBeNull();
    expect(result.eps).toBeNull();
    expect(result.latestEarnings).toBeNull();
    expect(result.price).toBeNull();
  });

  it('rejects a cookie consent interstitial', () => {
    expect(() => parseGoogleFinance(fixture('consent'))).toThrow(ConsentPageError);
  });
});
