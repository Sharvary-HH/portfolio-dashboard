import { Router } from 'express';
import { REFRESH_INTERVAL_MS } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { messageOf } from '../lib/errors.js';
import { getPortfolio } from '../services/portfolio.service.js';

export const portfolioRouter = Router();

portfolioRouter.get('/portfolio', async (_request, response, next) => {
  try {
    const portfolio = await getPortfolio();
    response.set('Cache-Control', 'no-store');
    response.json(portfolio);
  } catch (error) {
    next(error);
  }
});

portfolioRouter.get('/portfolio/stream', async (request, response) => {
  response.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
  });
  response.flushHeaders();

  let closed = false;

  const push = async () => {
    if (closed) return;
    try {
      const portfolio = await getPortfolio();
      response.write(`event: portfolio\ndata: ${JSON.stringify(portfolio)}\n\n`);
    } catch (error) {
      const message = messageOf(error);
      logger.warn({ error: message }, 'stream update failed');
      response.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
    }
  };

  const timer = setInterval(() => void push(), REFRESH_INTERVAL_MS);
  await push();

  request.on('close', () => {
    closed = true;
    clearInterval(timer);
    response.end();
  });
});
