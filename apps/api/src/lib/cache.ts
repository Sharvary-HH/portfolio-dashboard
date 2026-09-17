export interface CacheResult<T> {
  value: T;
  stale: boolean;
  storedAt: number;
}

interface Entry<T> {
  value: T;
  storedAt: number;
  expiresAt: number;
}

export interface CacheOptions {
  staleMaxAgeSeconds: number;
  now?: () => number;
}

export class StaleWhileErrorCache {
  private readonly entries = new Map<string, Entry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly staleMaxAgeMs: number;
  private readonly now: () => number;

  constructor(options: CacheOptions) {
    this.staleMaxAgeMs = options.staleMaxAgeSeconds * 1000;
    this.now = options.now ?? Date.now;
  }

  peek<T>(key: string): CacheResult<T> | null {
    const entry = this.entries.get(key) as Entry<T> | undefined;
    if (!entry) return null;

    const age = this.now() - entry.storedAt;
    if (age > this.staleMaxAgeMs) {
      this.entries.delete(key);
      return null;
    }

    return { value: entry.value, stale: this.now() >= entry.expiresAt, storedAt: entry.storedAt };
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    const storedAt = this.now();
    this.entries.set(key, { value, storedAt, expiresAt: storedAt + ttlSeconds * 1000 });
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
    this.inFlight.clear();
  }

  async getOrFetch<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
  ): Promise<CacheResult<T>> {
    const cached = this.peek<T>(key);
    if (cached && !cached.stale) return cached;

    const pending = this.inFlight.get(key) as Promise<T> | undefined;
    if (pending) {
      const value = await pending;
      return { value, stale: false, storedAt: this.now() };
    }

    const request = fetcher()
      .then((value) => {
        this.set(key, value, ttlSeconds);
        return value;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, request);

    try {
      const value = await request;
      return { value, stale: false, storedAt: this.now() };
    } catch (error) {
      if (cached) return { ...cached, stale: true };
      throw error;
    }
  }

  async revalidate<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<void> {
    if (this.inFlight.has(key)) return;
    await this.getOrFetch(key, ttlSeconds, fetcher).catch(() => undefined);
  }
}
