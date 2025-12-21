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

const textCache = new Map<string, CacheEntry<PdfPageText>>();
const ocrCache = new Map<string, CacheEntry<CachedOcrResult>>();

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
  return textCache.get(buildPageKey(fingerprint, page, options))?.value;
};

export const setCachedPageText = (
  fingerprint: string | undefined,
  page: number,
  options: PageCacheOptions,
  value: PdfPageText
): void => {
  if (!fingerprint) return;
  textCache.set(buildPageKey(fingerprint, page, options), { value, createdAt: Date.now() });
};

export const getCachedOcrText = (
  fingerprint: string | undefined,
  target: string
): CachedOcrResult | undefined => {
  if (!fingerprint) return undefined;
  return ocrCache.get(buildOcrKey(fingerprint, target))?.value;
};

export const setCachedOcrText = (
  fingerprint: string | undefined,
  target: string,
  value: CachedOcrResult
): void => {
  if (!fingerprint) return;
  ocrCache.set(buildOcrKey(fingerprint, target), { value, createdAt: Date.now() });
};

export const getCacheStats = (): {
  text_entries: number;
  ocr_entries: number;
  text_keys: string[];
  ocr_keys: string[];
} => ({
  text_entries: textCache.size,
  ocr_entries: ocrCache.size,
  text_keys: Array.from(textCache.keys()),
  ocr_keys: Array.from(ocrCache.keys()),
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
