/**
 * Disk-based cache for OCR results
 *
 * Stores OCR results as JSON files alongside PDFs for persistent caching.
 * Format: {pdf_basename}_ocr.json
 */

import fs from 'node:fs';
import path from 'node:path';
import type { OcrDiskCache, OcrImageResult, OcrPageResult } from '../types/cache.js';
import { createLogger } from './logger.js';

const logger = createLogger('DiskCache');
const LOCK_RETRY_MS = 25;
const LOCK_TIMEOUT_MS = 5_000;

/**
 * Generate cache file path from PDF path
 * Example: /path/to/document.pdf → /path/to/document_ocr.json
 */
export const getCacheFilePath = (pdfPath: string): string => {
  const dir = path.dirname(pdfPath);
  const basename = path.basename(pdfPath, path.extname(pdfPath));
  return path.join(dir, `${basename}_ocr.json`);
};

/**
 * Load OCR cache from disk
 * Returns null if file doesn't exist or is invalid
 */
export const loadOcrCache = (pdfPath: string): OcrDiskCache | null => {
  const cachePath = getCacheFilePath(pdfPath);

  try {
    if (!fs.existsSync(cachePath)) {
      return null;
    }

    const content = fs.readFileSync(cachePath, 'utf-8');
    const cache = JSON.parse(content) as OcrDiskCache;

    // Validate required fields
    if (!cache.fingerprint || !cache.pages || !cache.images) {
      logger.warn('Invalid cache file structure', { cachePath });
      return null;
    }

    logger.debug('Loaded OCR cache from disk', {
      cachePath,
      pageCount: Object.keys(cache.pages).length,
      imageCount: Object.keys(cache.images).length,
    });

    return cache;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Failed to load OCR cache', { cachePath, error: message });
    return null;
  }
};

const sleepSync = (ms: number): void => {
  const array = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(array, 0, 0, ms);
};

const acquireCacheLock = (lockPath: string): number => {
  const start = Date.now();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return fs.openSync(lockPath, 'wx');
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;

      if (err.code === 'EEXIST') {
        if (Date.now() - start > LOCK_TIMEOUT_MS) {
          throw new Error(`Timed out waiting for cache lock at ${lockPath}`);
        }

        sleepSync(LOCK_RETRY_MS);
        continue;
      }

      throw error;
    }
  }
};

const releaseCacheLock = (lockPath: string, fd: number): void => {
  fs.closeSync(fd);
  fs.rmSync(lockPath, { force: true });
};

const writeCacheFile = (cachePath: string, cache: OcrDiskCache): void => {
  cache.updated_at = new Date().toISOString();

  // Ensure directory exists
  const dir = path.dirname(cachePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tempPath = `${cachePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(cache, null, 2), 'utf-8');
  fs.renameSync(tempPath, cachePath);
};

const mergeCaches = (existing: OcrDiskCache | null, incoming: OcrDiskCache): OcrDiskCache => {
  const now = new Date().toISOString();

  if (existing && existing.fingerprint === incoming.fingerprint) {
    return {
      ...existing,
      ...incoming,
      created_at: existing.created_at,
      updated_at: now,
      pages: { ...existing.pages, ...incoming.pages },
      images: { ...existing.images, ...incoming.images },
    } satisfies OcrDiskCache;
  }

  return {
    ...incoming,
    created_at: incoming.created_at ?? existing?.created_at ?? now,
    updated_at: now,
    pages: incoming.pages ?? {},
    images: incoming.images ?? {},
  } satisfies OcrDiskCache;
};

/**
 * Save OCR cache to disk
 */
export const saveOcrCache = (pdfPath: string, cache: OcrDiskCache): void => {
  const cachePath = getCacheFilePath(pdfPath);
  const lockPath = `${cachePath}.lock`;
  const lockFd = acquireCacheLock(lockPath);

  try {
    const latest = loadOcrCache(pdfPath);
    const merged = mergeCaches(latest, cache);

    writeCacheFile(cachePath, merged);

    logger.debug('Saved OCR cache to disk', {
      cachePath,
      pageCount: Object.keys(merged.pages).length,
      imageCount: Object.keys(merged.images).length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to save OCR cache', { cachePath, error: message });
    throw new Error(`Failed to save OCR cache: ${message}`);
  } finally {
    releaseCacheLock(lockPath, lockFd);
  }
};

/**
 * Get cached OCR result for a page
 * Returns null if not found or fingerprint mismatch
 */
export const getCachedOcrPage = (
  pdfPath: string,
  fingerprint: string,
  page: number,
  providerHash: string
): OcrPageResult | null => {
  const cache = loadOcrCache(pdfPath);
  if (!cache) {
    return null;
  }

  // Validate fingerprint
  if (cache.fingerprint !== fingerprint) {
    logger.warn('PDF fingerprint mismatch, cache invalidated', {
      pdfPath,
      cached: cache.fingerprint,
      current: fingerprint,
    });
    return null;
  }

  const pageKey = String(page);
  const result = cache.pages[pageKey];

  if (!result) {
    return null;
  }

  // Validate provider hash
  if (result.provider_hash !== providerHash) {
    logger.debug('Provider hash mismatch for page', { page, pageKey });
    return null;
  }

  logger.debug('Cache hit for page', { page });
  return result;
};

/**
 * Set cached OCR result for a page
 */
export const setCachedOcrPage = (
  pdfPath: string,
  fingerprint: string,
  page: number,
  providerHash: string,
  ocrProvider: string,
  result: OcrPageResult
): void => {
  let cache = loadOcrCache(pdfPath);

  // Create new cache if doesn't exist
  if (!cache) {
    cache = {
      fingerprint,
      pdf_path: pdfPath,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ocr_provider: ocrProvider,
      pages: {},
      images: {},
    };
  }

  // Update fingerprint if changed
  if (cache.fingerprint !== fingerprint) {
    logger.warn('PDF fingerprint changed, resetting cache', { pdfPath });
    cache = {
      fingerprint,
      pdf_path: pdfPath,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ocr_provider: ocrProvider,
      pages: {},
      images: {},
    };
  }

  // Add result
  const pageKey = String(page);
  cache.pages[pageKey] = {
    ...result,
    provider_hash: providerHash,
    cached_at: new Date().toISOString(),
  };

  saveOcrCache(pdfPath, cache);
  logger.debug('Cached OCR result for page', { page });
};

/**
 * Get cached OCR result for an image
 * Returns null if not found or fingerprint mismatch
 */
export const getCachedOcrImage = (
  pdfPath: string,
  fingerprint: string,
  page: number,
  imageIndex: number,
  providerHash: string
): OcrImageResult | null => {
  const cache = loadOcrCache(pdfPath);
  if (!cache) {
    return null;
  }

  // Validate fingerprint
  if (cache.fingerprint !== fingerprint) {
    logger.warn('PDF fingerprint mismatch, cache invalidated', {
      pdfPath,
      cached: cache.fingerprint,
      current: fingerprint,
    });
    return null;
  }

  const imageKey = `${page}/${imageIndex}`;
  const result = cache.images[imageKey];

  if (!result) {
    return null;
  }

  // Validate provider hash
  if (result.provider_hash !== providerHash) {
    logger.debug('Provider hash mismatch for image', { page, imageIndex });
    return null;
  }

  logger.debug('Cache hit for image', { page, imageIndex });
  return result;
};

/**
 * Set cached OCR result for an image
 */
export const setCachedOcrImage = (
  pdfPath: string,
  fingerprint: string,
  page: number,
  imageIndex: number,
  providerHash: string,
  ocrProvider: string,
  result: OcrImageResult
): void => {
  let cache = loadOcrCache(pdfPath);

  // Create new cache if doesn't exist
  if (!cache) {
    cache = {
      fingerprint,
      pdf_path: pdfPath,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ocr_provider: ocrProvider,
      pages: {},
      images: {},
    };
  }

  // Update fingerprint if changed
  if (cache.fingerprint !== fingerprint) {
    logger.warn('PDF fingerprint changed, resetting cache', { pdfPath });
    cache = {
      fingerprint,
      pdf_path: pdfPath,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ocr_provider: ocrProvider,
      pages: {},
      images: {},
    };
  }

  // Add result
  const imageKey = `${page}/${imageIndex}`;
  cache.images[imageKey] = {
    ...result,
    provider_hash: providerHash,
    cached_at: new Date().toISOString(),
  };

  saveOcrCache(pdfPath, cache);
  logger.debug('Cached OCR result for image', { page, imageIndex });
};
