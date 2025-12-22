import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildOcrProviderKey,
  clearCache,
  configureCache,
  getCachedOcrText,
  getCachedPageText,
  getCacheStats,
  resetCacheConfig,
  setCachedOcrText,
  setCachedPageText,
} from '../../src/utils/cache.js';

const fingerprint = 'fingerprint-123';
const targetBase = 'image-1-0';

describe('OCR cache provider awareness', () => {
  afterEach(() => {
    clearCache('all');
    resetCacheConfig();
    vi.useRealTimers();
  });

  it('creates distinct cache entries for different providers', () => {
    const providerA = { type: 'http', model: 'model-a', name: 'provider-a' };
    const providerB = { type: 'http', model: 'model-b', name: 'provider-b' };

    const keyA = `${targetBase}#provider-${buildOcrProviderKey(providerA)}`;
    const keyB = `${targetBase}#provider-${buildOcrProviderKey(providerB)}`;

    setCachedOcrText(fingerprint, keyA, { text: 'text-a', provider: providerA.name });
    setCachedOcrText(fingerprint, keyB, { text: 'text-b', provider: providerB.name });

    expect(getCachedOcrText(fingerprint, keyA)?.text).toBe('text-a');
    expect(getCachedOcrText(fingerprint, keyB)?.text).toBe('text-b');
  });

  it('honors model or option differences in provider keys', () => {
    const provider = { type: 'http', model: 'shared-model', extras: { scale: '2.0' } };
    const providerVariant = { ...provider, extras: { scale: '1.5' } };

    const keyWithScale = `${targetBase}#provider-${buildOcrProviderKey(provider)}`;
    const keyWithDifferentScale = `${targetBase}#provider-${buildOcrProviderKey(providerVariant)}`;

    setCachedOcrText(fingerprint, keyWithScale, { text: 'scaled', provider: 'scale-2' });

    expect(getCachedOcrText(fingerprint, keyWithDifferentScale)).toBeUndefined();
    expect(getCachedOcrText(fingerprint, keyWithScale)?.text).toBe('scaled');
  });

  it('evicts least recently used entries when exceeding max size', () => {
    configureCache('ocr', { maxEntries: 2 });

    const firstKey = `${targetBase}-a`;
    const secondKey = `${targetBase}-b`;
    const thirdKey = `${targetBase}-c`;

    setCachedOcrText(fingerprint, firstKey, { text: 'first' });
    setCachedOcrText(fingerprint, secondKey, { text: 'second' });

    // Access the first key to make it most recently used
    expect(getCachedOcrText(fingerprint, firstKey)?.text).toBe('first');

    setCachedOcrText(fingerprint, thirdKey, { text: 'third' });

    expect(getCachedOcrText(fingerprint, secondKey)).toBeUndefined();
    expect(getCachedOcrText(fingerprint, firstKey)?.text).toBe('first');
    expect(getCachedOcrText(fingerprint, thirdKey)?.text).toBe('third');

    const stats = getCacheStats();
    expect(stats.ocr_entries).toBe(2);
    expect(stats.ocr_evictions).toBe(1);
  });

  it('expires entries after TTL duration', () => {
    vi.useFakeTimers();
    configureCache('text', { maxEntries: 3, ttlMs: 1000 });

    const pageOptions = {
      includeImageIndexes: false,
      preserveWhitespace: false,
      trimLines: true,
    } as const;

    setCachedPageText(fingerprint, 1, pageOptions, {
      page_number: 1,
      page_index: 0,
      page_label: null,
      lines: [],
      text: 'temporary',
    });

    vi.advanceTimersByTime(1500);

    expect(getCachedPageText(fingerprint, 1, pageOptions)).toBeUndefined();
    expect(getCacheStats().text_evictions).toBe(1);
  });
});
