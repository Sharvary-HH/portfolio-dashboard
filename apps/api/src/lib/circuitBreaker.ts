import { CIRCUIT_FAILURE_THRESHOLD, CIRCUIT_OPEN_MS } from '../config/env.js';
import { CircuitOpenError } from './errors.js';

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  openMs?: number;
  now?: () => number;
}

export class CircuitBreaker {
  readonly name: string;

  private failures = 0;
  private openedAt = 0;
  private trialInFlight = false;

  private readonly failureThreshold: number;
  private readonly openMs: number;
  private readonly now: () => number;

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold ?? CIRCUIT_FAILURE_THRESHOLD;
    this.openMs = options.openMs ?? CIRCUIT_OPEN_MS;
    this.now = options.now ?? Date.now;
  }

  get state(): CircuitState {
    if (this.failures < this.failureThreshold) return 'closed';
    if (this.now() - this.openedAt >= this.openMs) return 'half-open';
    return 'open';
  }

  get consecutiveFailures(): number {
    return this.failures;
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    const state = this.state;

    if (state === 'open') throw new CircuitOpenError(this.name);
    if (state === 'half-open') {
      if (this.trialInFlight) throw new CircuitOpenError(this.name);
      this.trialInFlight = true;
    }

    try {
      const result = await task();
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures += 1;
      if (this.failures >= this.failureThreshold) this.openedAt = this.now();
      throw error;
    } finally {
      this.trialInFlight = false;
    }
  }

  reset(): void {
    this.failures = 0;
    this.openedAt = 0;
    this.trialInFlight = false;
  }
}
