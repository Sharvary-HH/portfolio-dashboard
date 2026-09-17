import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATA_MODE: z.enum(['live', 'mock']).default('live'),
  QUOTE_TTL_SECONDS: z.coerce.number().int().positive().default(15),
  FUNDAMENTALS_TTL_SECONDS: z.coerce.number().int().positive().default(21600),
  GOOGLE_PRICE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  STALE_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(86400),
  SYMBOL_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
  SYMBOL_RETRY_SECONDS: z.coerce.number().int().positive().default(900),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  GOOGLE_FINANCE_BASE_URL: z.string().url().default('https://www.google.com/finance/quote'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  HOLDINGS_FILE: z.string().default('data/holdings.json'),
  WARM_UP_ON_START: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n  ');
  throw new Error(`Invalid environment configuration:\n  ${details}`);
}

export const env = parsed.data;

export const REFRESH_INTERVAL_MS = 15_000;
export const GOOGLE_CONCURRENCY = 2;
export const GOOGLE_MIN_DELAY_MS = 250;
export const GOOGLE_MAX_DELAY_MS = 750;
export const GOOGLE_TIMEOUT_MS = 8_000;
export const YAHOO_BATCH_SIZE = 50;
export const CIRCUIT_FAILURE_THRESHOLD = 5;
export const CIRCUIT_OPEN_MS = 60_000;
export const RETRY_ATTEMPTS = 3;
export const RETRY_BASE_DELAY_MS = 500;
export const PRICE_SANITY_FACTOR = 25;
