import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { messageOf } from './lib/errors.js';
import { loadHoldings, warmUp } from './services/portfolio.service.js';

async function start() {
  await loadHoldings();

  const server = createApp().listen(env.PORT, () => {
    logger.info({ port: env.PORT, mode: env.DATA_MODE }, 'api listening');
    if (env.WARM_UP_ON_START) void warmUp();
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error: unknown) => {
  logger.fatal({ error: messageOf(error) }, 'failed to start');
  process.exit(1);
});
