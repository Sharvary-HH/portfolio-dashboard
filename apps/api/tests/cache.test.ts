import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StaleWhileErrorCache } from '../src/lib/cache.js';

describe('StaleWhileErrorCache', () => {
  let clock = 0;
  const now = () => clock;

  function makeCache(staleMaxAgeSeconds = 3600) {
    return new StaleWhileErrorCache({ staleMaxAgeSeconds, now });
  }

  beforeEach(() => {
    clock = 1_000_000;
  });

  it('serves a fresh value without calling the fetcher again', async () => {
    const cache = makeCache();
    const fetcher = vi.fn().mockResolvedValue('first');

    await cache.getOrFetch('key', 15, fetcher);
    const second = await cache.getOrFetch('key', 15, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(second.value).toBe('first');
    expect(second.stale).toBe(false);
  });

  it('refetches once the ttl has passed', async () => {
    const cache = makeCache();
    const fetcher = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');

    await cache.getOrFetch('key', 15, fetcher);
    clock += 16_000;
    const result = await cache.getOrFetch('key', 15, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.value).toBe('second');
  });

  it('shares one promise between concurrent callers', async () => {
    const cache = makeCache();
    let resolve: (value: string) => void = () => undefined;
    const fetcher = vi.fn().mockImplementation(
      () =>
        new Promise<string>((done) => {
          resolve = done;
        }),
    );

    const calls = Promise.all([
      cache.getOrFetch('key', 15, fetcher),
      cache.getOrFetch('key', 15, fetcher),
      cache.getOrFetch('key', 15, fetcher),
    ]);

    resolve('value');
    const results = await calls;

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(results.map((result) => result.value)).toEqual(['value', 'value', 'value']);
  });

  it('falls back to the last good value when a refresh fails', async () => {
    const cache = makeCache();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce('good')
      .mockRejectedValue(new Error('provider down'));

    await cache.getOrFetch('key', 15, fetcher);
    clock += 16_000;
    const result = await cache.getOrFetch('key', 15, fetcher);

    expect(result.value).toBe('good');
    expect(result.stale).toBe(true);
  });

  it('throws when a fetch fails and nothing is cached', async () => {
    const cache = makeCache();
    const fetcher = vi.fn().mockRejectedValue(new Error('provider down'));

    await expect(cache.getOrFetch('key', 15, fetcher)).rejects.toThrow('provider down');
  });

  it('drops values that are older than the stale ceiling', async () => {
    const cache = makeCache(60);
    const fetcher = vi.fn().mockResolvedValueOnce('good').mockRejectedValue(new Error('down'));

    await cache.getOrFetch('key', 15, fetcher);
    clock += 61_000;

    expect(cache.peek('key')).toBeNull();
    await expect(cache.getOrFetch('key', 15, fetcher)).rejects.toThrow('down');
  });
});
