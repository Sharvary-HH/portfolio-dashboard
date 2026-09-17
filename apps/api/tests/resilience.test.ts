import { describe, expect, it, vi } from 'vitest';
import { withRetry } from '../src/lib/retry.js';
import { CircuitBreaker } from '../src/lib/circuitBreaker.js';
import { CircuitOpenError } from '../src/lib/errors.js';

const noSleep = () => Promise.resolve();

describe('withRetry', () => {
  it('returns the first successful result', async () => {
    const task = vi.fn().mockResolvedValue('ok');
    await expect(withRetry(task, { sleep: noSleep })).resolves.toBe('ok');
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('retries network failures up to the attempt limit', async () => {
    const task = vi.fn().mockRejectedValue(new Error('socket hang up'));

    await expect(withRetry(task, { attempts: 3, sleep: noSleep })).rejects.toThrow(
      'socket hang up',
    );
    expect(task).toHaveBeenCalledTimes(3);
  });

  it('retries a 429 and honours retry-after', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const task = vi
      .fn()
      .mockRejectedValueOnce({ response: { status: 429, headers: { 'retry-after': '2' } } })
      .mockResolvedValue('ok');

    await expect(withRetry(task, { sleep })).resolves.toBe('ok');
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it('gives up immediately on a 404', async () => {
    const task = vi.fn().mockRejectedValue({ response: { status: 404 } });

    await expect(withRetry(task, { sleep: noSleep })).rejects.toBeDefined();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('backs off with growing delays', async () => {
    const delays: number[] = [];
    const sleep = vi.fn().mockImplementation((ms: number) => {
      delays.push(ms);
      return Promise.resolve();
    });

    await withRetry(vi.fn().mockRejectedValue(new Error('down')), { attempts: 3, sleep }).catch(
      () => undefined,
    );

    expect(delays).toHaveLength(2);
    expect(delays[1]).toBeGreaterThan((delays[0] ?? 0) * 0.9);
  });
});

describe('CircuitBreaker', () => {
  let clock = 0;
  const options = { failureThreshold: 3, openMs: 60_000, now: () => clock };

  it('opens after the failure threshold and serves nothing while open', async () => {
    clock = 0;
    const breaker = new CircuitBreaker('test', options);
    const failing = () => Promise.reject(new Error('down'));

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await breaker.run(failing).catch(() => undefined);
    }

    expect(breaker.state).toBe('open');
    await expect(breaker.run(() => Promise.resolve('ok'))).rejects.toThrow(CircuitOpenError);
  });

  it('half-opens after the cooldown and closes on a successful trial', async () => {
    clock = 0;
    const breaker = new CircuitBreaker('test', options);
    const failing = () => Promise.reject(new Error('down'));

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await breaker.run(failing).catch(() => undefined);
    }

    clock += 60_000;
    expect(breaker.state).toBe('half-open');

    await expect(breaker.run(() => Promise.resolve('ok'))).resolves.toBe('ok');
    expect(breaker.state).toBe('closed');
    expect(breaker.consecutiveFailures).toBe(0);
  });

  it('reopens when the trial request fails again', async () => {
    clock = 0;
    const breaker = new CircuitBreaker('test', options);
    const failing = () => Promise.reject(new Error('down'));

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await breaker.run(failing).catch(() => undefined);
    }

    clock += 60_000;
    await breaker.run(failing).catch(() => undefined);

    expect(breaker.state).toBe('open');
  });
});
