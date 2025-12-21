import type { PdfPageText } from '../types/pdf.js';

interface CacheEntry<T> {
  value: T;
  createdAt: number;
}

const textCache = new Map<string, CacheEntry<PdfPageText>>();
const ocrCache = new Map<string, CacheEntry<string>>();

const buildPageKey = (fingerprint: string, page: number): string => `${fingerprint}#page#${page}`;

const buildOcrKey = (fingerprint: string, target: string): string => `${fingerprint}#${target}`;

export const getCachedPageText = (
  fingerprint: string | undefined,
  page: number
): PdfPageText | undefined => {
  if (!fingerprint) return undefined;
  return textCache.get(buildPageKey(fingerprint, page))?.value;
};

export const setCachedPageText = (
  fingerprint: string | undefined,
  page: number,
  value: PdfPageText
): void => {
  if (!fingerprint) return;
  textCache.set(buildPageKey(fingerprint, page), { value, createdAt: Date.now() });
};

export const getCachedOcrText = (
  fingerprint: string | undefined,
  target: string
): string | undefined => {
  if (!fingerprint) return undefined;
  return ocrCache.get(buildOcrKey(fingerprint, target))?.value;
};

export const setCachedOcrText = (
  fingerprint: string | undefined,
  target: string,
  text: string
): void => {
  if (!fingerprint) return;
  ocrCache.set(buildOcrKey(fingerprint, target), { value: text, createdAt: Date.now() });
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
