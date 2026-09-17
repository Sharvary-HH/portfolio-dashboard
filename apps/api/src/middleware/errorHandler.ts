import type { NextFunction, Request, Response } from 'express';
import type { ApiErrorBody } from '@portfolio/shared';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(_request: Request, response: Response): void {
  const body: ApiErrorBody = {
    error: { code: 'NOT_FOUND', message: 'This endpoint does not exist' },
  };
  response.status(404).json(body);
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  const isAppError = error instanceof AppError;
  const status = isAppError ? error.statusCode : 500;

  if (status >= 500) {
    logger.error({ err: error }, 'request failed');
  }

  const body: ApiErrorBody = {
    error: {
      code: isAppError ? error.code : 'INTERNAL_ERROR',
      message:
        isAppError || env.NODE_ENV !== 'production'
          ? (error as Error).message
          : 'Something went wrong on our side',
    },
  };

  response.status(status).json(body);
}
