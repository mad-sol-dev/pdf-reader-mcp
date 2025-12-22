import type { PdfPageText } from '../types/pdf.js';
import type { OcrProviderOptions } from './ocr.js';

interface PageCacheOptions {
  includeImageIndexes: boolean;
  maxCharsPerPage?: number;
  preserveWhitespace: boolean;
  trimLines: boolean;
}

interface CachedOcrResult {
  text: string;
  provider?: string;
}

interface CacheEntry<T> {
  value: T;
  createdAt: number;
}

interface CacheOptions {
  maxEntries: number;
  ttlMs?: number;
}

class LruCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private evictions = 0;

  constructor(private readonly options: CacheOptions) {}

  get size(): number {
    return this.store.size;
  }

  get evictionCount(): number {
    return this.evictions;
  }

  getKeys(): string[] {
    return Array.from(this.store.keys());
  }

  clear(): void {
    this.store.clear();
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    if (!this.options.ttlMs) return false;
    return Date.now() - entry.createdAt > this.options.ttlMs;
  }

  private markRecentlyUsed(key: string, entry: CacheEntry<T>): void {
    this.store.delete(key);
    this.store.set(key, entry);
  }

  private trimToMaxEntries(): void {
    while (this.store.size > this.options.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (!oldestKey) return;
      this.store.delete(oldestKey);
      this.evictions += 1;
    }
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (this.isExpired(entry)) {
      this.store.delete(key);
      this.evictions += 1;
      return undefined;
    }

    this.markRecentlyUsed(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    const entry: CacheEntry<T> = { value, createdAt: Date.now() };
    if (this.store.has(key)) {
      this.store.delete(key);
    }

    this.store.set(key, entry);
    this.trimToMaxEntries();
  }
}

type CacheScope = 'text' | 'ocr';

const DEFAULT_CACHE_OPTIONS: Record<CacheScope, CacheOptions> = {
  text: { maxEntries: 500 },
  ocr: { maxEntries: 500 },
};

let cacheOptions: Record<CacheScope, CacheOptions> = {
  text: { ...DEFAULT_CACHE_OPTIONS.text },
  ocr: { ...DEFAULT_CACHE_OPTIONS.ocr },
};

const buildCache = <T>(scope: CacheScope): LruCache<T> => new LruCache<T>(cacheOptions[scope]);

let textCache = buildCache<PdfPageText>('text');
let ocrCache = buildCache<CachedOcrResult>('ocr');

const buildPageKey = (fingerprint: string, page: number, options: PageCacheOptions): string => {
  const serializedOptions = JSON.stringify({
    includeImageIndexes: options.includeImageIndexes,
    preserveWhitespace: options.preserveWhitespace,
    trimLines: options.trimLines,
    maxCharsPerPage: options.maxCharsPerPage ?? null,
  });

  return `${fingerprint}#page#${page}#${serializedOptions}`;
};

export const buildOcrProviderKey = (provider?: OcrProviderOptions): string =>
  provider
    ? JSON.stringify({
        name: provider.name,
        type: provider.type,
        endpoint: provider.endpoint,
        model: provider.model,
        language: provider.language,
        extras: provider.extras,
      })
    : 'default';

const buildOcrKey = (fingerprint: string, target: string): string => `${fingerprint}#${target}`;

export const getCachedPageText = (
  fingerprint: string | undefined,
  page: number,
  options: PageCacheOptions
): PdfPageText | undefined => {
  if (!fingerprint) return undefined;
  return textCache.get(buildPageKey(fingerprint, page, options));
};

export const setCachedPageText = (
  fingerprint: string | undefined,
  page: number,
  options: PageCacheOptions,
  value: PdfPageText
): void => {
  if (!fingerprint) return;
  textCache.set(buildPageKey(fingerprint, page, options), value);
};

export const getCachedOcrText = (
  fingerprint: string | undefined,
  target: string
): CachedOcrResult | undefined => {
  if (!fingerprint) return undefined;
  return ocrCache.get(buildOcrKey(fingerprint, target));
};

export const setCachedOcrText = (
  fingerprint: string | undefined,
  target: string,
  value: CachedOcrResult
): void => {
  if (!fingerprint) return;
  ocrCache.set(buildOcrKey(fingerprint, target), value);
};

export const getCacheStats = (): {
  text_entries: number;
  ocr_entries: number;
  text_keys: string[];
  ocr_keys: string[];
  text_evictions: number;
  ocr_evictions: number;
  config: typeof cacheOptions;
} => ({
  text_entries: textCache.size,
  ocr_entries: ocrCache.size,
  text_keys: textCache.getKeys(),
  ocr_keys: ocrCache.getKeys(),
  text_evictions: textCache.evictionCount,
  ocr_evictions: ocrCache.evictionCount,
  config: {
    text: { ...cacheOptions.text },
    ocr: { ...cacheOptions.ocr },
  },
});

export const clearCache = (
  scope: 'text' | 'ocr' | 'all'
): { cleared_text: boolean; cleared_ocr: boolean } => {
  const clearText = scope === 'text' || scope === 'all';
  const clearOcr = scope === 'ocr' || scope === 'all';

  if (clearText) {
    textCache.clear();
  }

  if (clearOcr) {
    ocrCache.clear();
  }

  return { cleared_text: clearText, cleared_ocr: clearOcr };
};

export const configureCache = (scope: CacheScope, options: Partial<CacheOptions>): void => {
  cacheOptions = { ...cacheOptions, [scope]: { ...cacheOptions[scope], ...options } } as Record<
    CacheScope,
    CacheOptions
  >;

  if (scope === 'text') {
    textCache = buildCache<PdfPageText>('text');
  } else {
    ocrCache = buildCache<CachedOcrResult>('ocr');
  }
};

export const resetCacheConfig = (): void => {
  cacheOptions = {
    text: { ...DEFAULT_CACHE_OPTIONS.text },
    ocr: { ...DEFAULT_CACHE_OPTIONS.ocr },
  };

  textCache = buildCache<PdfPageText>('text');
  ocrCache = buildCache<CachedOcrResult>('ocr');
};

export const getCacheConfig = (): Record<CacheScope, CacheOptions> => cacheOptions;
