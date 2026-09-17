import { describe, expect, it } from 'vitest';
import {
  EM_DASH,
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatQuantity,
  formatSignedCurrency,
  formatSignedPercent,
} from '../src/format.js';

describe('formatters', () => {
  it('renders rupees with Indian digit grouping', () => {
    expect(formatCurrency(1543060)).toContain('15,43,060');
  });

  it('renders a dash for missing values', () => {
    expect(formatCurrency(null)).toBe(EM_DASH);
    expect(formatNumber(undefined)).toBe(EM_DASH);
    expect(formatPercent(Number.NaN)).toBe(EM_DASH);
    expect(formatQuantity(null)).toBe(EM_DASH);
  });

  it('signs gains and losses', () => {
    expect(formatSignedCurrency(2000)).toMatch(/^\+/);
    expect(formatSignedCurrency(-2000)).toMatch(/^−/);
    expect(formatSignedCurrency(0)).not.toMatch(/^[+−]/);
    expect(formatSignedPercent(12.345)).toBe('+12.35%');
    expect(formatSignedPercent(-0.5)).toBe('−0.50%');
  });

  it('compacts large figures into lakh and crore', () => {
    expect(formatCompactCurrency(12345678)).toBe('₹1.23 Cr');
    expect(formatCompactCurrency(250000)).toBe('₹2.50 L');
    expect(formatCompactCurrency(-12345678)).toBe('−₹1.23 Cr');
    expect(formatCompactCurrency(5000)).toContain('5,000');
  });

  it('keeps two decimals on percentages', () => {
    expect(formatPercent(4.828)).toBe('4.83%');
  });
});
