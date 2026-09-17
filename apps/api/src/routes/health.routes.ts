import { Router } from 'express';
import { env } from '../config/env.js';
import { quoteProviderState } from '../services/quote.service.js';
import { fundamentalsProviderState } from '../services/fundamentals.service.js';

export const healthRouter = Router();

healthRouter.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    dataMode: env.DATA_MODE,
    providers: {
      yahoo: quoteProviderState(),
      google: fundamentalsProviderState(),
    },
  });
});
