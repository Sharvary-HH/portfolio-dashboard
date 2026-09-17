const EM_DASH = '—';
const LAKH = 100_000;
const CRORE = 10_000_000;

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyWhole = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const integer = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

const decimal = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const time = new Intl.DateTimeFormat('en-IN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function isMissing(value: number | null | undefined): value is null | undefined {
  return value === null || value === undefined || Number.isNaN(value);
}

export function formatCurrency(value: number | null | undefined): string {
  if (isMissing(value)) return EM_DASH;
  return currency.format(value);
}

export function formatCurrencyWhole(value: number | null | undefined): string {
  if (isMissing(value)) return EM_DASH;
  return currencyWhole.format(value);
}

export function formatSignedCurrency(value: number | null | undefined): string {
  if (isMissing(value)) return EM_DASH;
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${currency.format(Math.abs(value))}`;
}

export function formatQuantity(value: number | null | undefined): string {
  if (isMissing(value)) return EM_DASH;
  return integer.format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (isMissing(value)) return EM_DASH;
  return decimal.format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (isMissing(value)) return EM_DASH;
  return `${decimal.format(value)}%`;
}

export function formatSignedPercent(value: number | null | undefined): string {
  if (isMissing(value)) return EM_DASH;
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${decimal.format(Math.abs(value))}%`;
}

export function formatCompactCurrency(value: number | null | undefined): string {
  if (isMissing(value)) return EM_DASH;

  const absolute = Math.abs(value);
  const sign = value < 0 ? '−' : '';

  if (absolute >= CRORE) return `${sign}₹${decimal.format(absolute / CRORE)} Cr`;
  if (absolute >= LAKH) return `${sign}₹${decimal.format(absolute / LAKH)} L`;
  return `${sign}${currency.format(absolute)}`;
}

export function formatClockTime(value: string | Date | null | undefined): string {
  if (value === null || value === undefined) return EM_DASH;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return EM_DASH;
  return time.format(date);
}

export { EM_DASH };
