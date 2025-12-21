import { afterEach, describe, expect, it } from 'vitest';
import { buildOcrProviderKey, clearCache, getCachedOcrText, setCachedOcrText } from '../../src/utils/cache.js';

const fingerprint = 'fingerprint-123';
const targetBase = 'image-1-0';

describe('OCR cache provider awareness', () => {
  afterEach(() => {
    clearCache('ocr');
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
});
