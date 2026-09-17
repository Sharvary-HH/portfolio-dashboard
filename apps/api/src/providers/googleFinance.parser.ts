import * as cheerio from 'cheerio';
import type { LatestEarnings } from '@portfolio/shared';

export interface GoogleFinanceQuotePage {
  price: number | null;
  dayChangePercent: number | null;
  currency: string | null;
  peRatio: number | null;
  eps: number | null;
  latestEarnings: LatestEarnings | null;
}

export class ConsentPageError extends Error {
  constructor() {
    super('Google served a cookie-consent page instead of the quote page');
    this.name = 'ConsentPageError';
  }
}

const MULTIPLIERS: Record<string, number> = {
  K: 1e3,
  M: 1e6,
  B: 1e9,
  T: 1e12,
};

const KEY_STAT_LABELS = ['P/E ratio', 'EPS', 'Open', 'High', 'Low'];
const MISSING_MARKERS = new Set(['-', '—', '–', '', 'N/A']);
const STANDALONE_AMOUNT = /^[₹$€£]\s?[\d,]+(?:\.\d+)?$/;
const CHANGE_PERCENT = /([+-]?\d+(?:\.\d+)?)%/;
const CURRENCY_CODE = /·\s*([A-Z]{3})\b/;
const PRICE_BLOCK_LENGTH = 60;
const MAX_DAY_CHANGE_PERCENT = 100;

export function parseCompactNumber(input: string | null | undefined): number | null {
  if (input === null || input === undefined) return null;

  const text = input.replace(/\s|,|₹|\$|%/g, '').trim();
  if (MISSING_MARKERS.has(text)) return null;

  const match = /^(-?\d+(?:\.\d+)?)([KMBT])?$/i.exec(text);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;

  const suffix = match[2]?.toUpperCase();
  return suffix ? value * (MULTIPLIERS[suffix] ?? 1) : value;
}

function collectLabelledValues($: cheerio.CheerioAPI): Map<string, string> {
  const values = new Map<string, string>();

  $('div, span, td, th').each((_, element) => {
    const node = $(element);
    if (node.children().length > 0) return;

    const label = node.text().trim();
    if (label.length === 0 || label.length > 40 || values.has(label)) return;

    const value = node
      .parent()
      .children()
      .filter((_index, sibling) => sibling !== element)
      .first()
      .text()
      .trim();

    if (value.length > 0) values.set(label, value);
  });

  return values;
}

function parseQuote(
  $: cheerio.CheerioAPI,
): Pick<GoogleFinanceQuotePage, 'price' | 'dayChangePercent' | 'currency'> {
  const scope = $('main').length > 0 ? $('main').find('*') : $('body').find('*');
  const priceNode = scope
    .filter((_, element) => {
      const node = $(element);
      if (node.children().length > 0) return false;

      const text = node.text().trim();
      return STANDALONE_AMOUNT.test(text) && node.parent().text().trim() === text;
    })
    .first();

  if (priceNode.length === 0) return { price: null, dayChangePercent: null, currency: null };

  const priceText = priceNode.text().trim();
  const price = parseCompactNumber(priceText);

  let dayChangePercent: number | null = null;
  let currency: string | null = null;
  let container = priceNode.parent();

  for (let depth = 0; depth < 5 && container.length > 0; depth += 1) {
    const text = container.text();
    const start = text.indexOf(priceText);

    if (start !== -1) {
      const block = text.slice(start, start + PRICE_BLOCK_LENGTH);

      if (dayChangePercent === null) {
        const match = CHANGE_PERCENT.exec(block);
        const magnitude = match ? Math.abs(Number(match[1])) : null;

        if (magnitude !== null && magnitude <= MAX_DAY_CHANGE_PERCENT) {
          const falling = block.includes('arrow_downward') || match?.[1]?.startsWith('-') === true;
          dayChangePercent = falling ? -magnitude : magnitude;
        }
      }

      currency ??= CURRENCY_CODE.exec(text)?.[1] ?? null;
      if (dayChangePercent !== null && currency !== null) break;
    }

    container = container.parent();
  }

  return { price, dayChangePercent, currency };
}

function looksLikeConsentPage(html: string): boolean {
  return (
    html.includes('consent.google.com') ||
    html.includes('Before you continue') ||
    html.includes('id="introAgreeButton"')
  );
}

function parseQuarterlyEarnings($: cheerio.CheerioAPI): LatestEarnings | null {
  const table = $('table')
    .filter((_, element) => $(element).text().includes('Net income'))
    .first();

  if (table.length === 0) return null;

  const periods = table
    .find('thead tr')
    .first()
    .find('th, td')
    .map((_, cell) => $(cell).text().trim())
    .get()
    .slice(1);

  if (periods.length === 0) return null;

  const rowValues = (label: string): string[] | null => {
    const row = table
      .find('tbody tr')
      .filter((_, element) => {
        const first = $(element).find('th, td').first().text().trim();
        return first.toLowerCase() === label.toLowerCase();
      })
      .first();

    if (row.length === 0) return null;

    return row
      .find('th, td')
      .map((_, cell) => $(cell).text().trim())
      .get()
      .slice(1);
  };

  const netIncomeCells = rowValues('Net income');
  const epsCells = rowValues('Earnings per share');
  if (!netIncomeCells) return null;

  for (let index = netIncomeCells.length - 1; index >= 0; index -= 1) {
    const netIncome = parseCompactNumber(netIncomeCells[index]);
    if (netIncome === null) continue;

    return {
      period: periods[index] ?? null,
      eps: parseCompactNumber(epsCells?.[index]),
      netIncome,
    };
  }

  return null;
}

export function parseGoogleFinance(html: string): GoogleFinanceQuotePage {
  const $ = cheerio.load(html);
  const stats = collectLabelledValues($);
  const hasKeyStats = KEY_STAT_LABELS.some((label) => stats.has(label));

  if (!hasKeyStats && looksLikeConsentPage(html)) throw new ConsentPageError();

  return {
    ...parseQuote($),
    peRatio: parseCompactNumber(stats.get('P/E ratio')),
    eps: parseCompactNumber(stats.get('EPS')),
    latestEarnings: parseQuarterlyEarnings($),
  };
}
