import axios from 'axios';
import pLimit from 'p-limit';
import {
  GOOGLE_CONCURRENCY,
  GOOGLE_MAX_DELAY_MS,
  GOOGLE_MIN_DELAY_MS,
  GOOGLE_TIMEOUT_MS,
  env,
} from '../config/env.js';
import { ProviderError, messageOf } from '../lib/errors.js';
import { withRetry } from '../lib/retry.js';
import { parseGoogleFinance, type GoogleFinanceQuotePage } from './googleFinance.parser.js';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const limit = pLimit(GOOGLE_CONCURRENCY);

function politeDelay(): Promise<void> {
  const span = GOOGLE_MAX_DELAY_MS - GOOGLE_MIN_DELAY_MS;
  const wait = GOOGLE_MIN_DELAY_MS + Math.random() * span;
  return new Promise((resolve) => setTimeout(resolve, wait));
}

export async function fetchQuotePage(quoteCode: string): Promise<GoogleFinanceQuotePage> {
  return limit(async () => {
    await politeDelay();

    const response = await withRetry(() =>
      axios.get<string>(`${env.GOOGLE_FINANCE_BASE_URL}/${quoteCode}`, {
        params: { hl: 'en' },
        timeout: GOOGLE_TIMEOUT_MS,
        responseType: 'text',
        headers: {
          'User-Agent': USER_AGENT,
          'Accept-Language': 'en-US,en;q=0.9',
          Accept: 'text/html,application/xhtml+xml',
        },
      }),
    ).catch((error: unknown) => {
      throw new ProviderError('google', `Request failed: ${messageOf(error)}`, true, error);
    });

    try {
      return parseGoogleFinance(response.data);
    } catch (error) {
      throw new ProviderError('google', messageOf(error), false, error);
    }
  });
}
