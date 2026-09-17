export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  override readonly cause?: unknown;

  constructor(code: string, message: string, statusCode = 500, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
    this.cause = cause;
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super('CONFIGURATION_ERROR', message, 500, cause);
  }
}

export class ProviderError extends AppError {
  readonly provider: string;
  readonly retryable: boolean;

  constructor(provider: string, message: string, retryable = true, cause?: unknown) {
    super('PROVIDER_ERROR', message, 502, cause);
    this.provider = provider;
    this.retryable = retryable;
  }
}

export class CircuitOpenError extends AppError {
  constructor(provider: string) {
    super('CIRCUIT_OPEN', `${provider} is temporarily unavailable`, 503);
  }
}

export class MarketDataUnavailableError extends AppError {
  constructor(message = 'Market data is currently unavailable') {
    super('MARKET_DATA_UNAVAILABLE', message, 503);
  }
}

export function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
