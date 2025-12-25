/**
 * Disk-based cache for OCR results
 *
 * Stores OCR results as JSON files alongside PDFs for persistent caching.
 * Format: {pdf_basename}_ocr.json
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import type { OcrDiskCache, OcrImageResult, OcrPageResult } from '../types/cache.js';
import { createLogger } from './logger.js';

const logger = createLogger('DiskCache');
const LOCK_RETRY_MS = 25;
const LOCK_TIMEOUT_MS = 5_000;

/**
 * Get cache directory from environment variable or default to PDF directory
 */
const getCacheDirectory = (): string | null => {
  return process.env.PDF_READER_CACHE_DIR ?? null;
};

/**
 * Generate cache file path from PDF path
 * Example: /path/to/document.pdf → /path/to/document_ocr.json
 * If PDF_READER_CACHE_DIR is set, uses that directory with hash to avoid collisions
 */
export const getCacheFilePath = (pdfPath: string): string => {
  const cacheDir = getCacheDirectory();
  const basename = path.basename(pdfPath, path.extname(pdfPath));

  if (cacheDir) {
    // Use configured cache directory with hash to avoid collisions
    const hash = crypto.createHash('md5').update(pdfPath).digest('hex').slice(0, 8);
    return path.join(cacheDir, `${basename}_${hash}_ocr.json`);
  }

  // Default: alongside the PDF
  const dir = path.dirname(pdfPath);
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

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const LOCK_STALE_MS = 60_000; // Consider lock stale after 60 seconds

/**
 * Check if a lock file is stale (process died or lock too old)
 */
const isLockStale = async (lockPath: string): Promise<boolean> => {
  try {
    const content = await fsPromises.readFile(lockPath, 'utf-8');
    const { pid, timestamp } = JSON.parse(content) as { pid: number; timestamp: number };

    // Check if process is still running
    try {
      process.kill(pid, 0); // Signal 0 checks existence without killing
    } catch {
      logger.debug('Lock process no longer exists', { pid, lockPath });
      return true; // Process doesn't exist, lock is stale
    }

    // Check if lock is too old
    if (Date.now() - timestamp > LOCK_STALE_MS) {
      logger.debug('Lock exceeded max age', { pid, age: Date.now() - timestamp, lockPath });
      return true;
    }

    return false;
  } catch {
    // Can't read lock file, consider it stale
    return true;
  }
};

const acquireCacheLock = async (lockPath: string): Promise<fsPromises.FileHandle | null> => {
  const start = Date.now();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const handle = await fsPromises.open(lockPath, 'wx');
      // Write our PID and timestamp to the lock file
      await handle.write(JSON.stringify({ pid: process.pid, timestamp: Date.now() }));
      return handle;
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;

      if (err.code === 'EEXIST') {
        // Check if lock is stale
        if (await isLockStale(lockPath)) {
          logger.warn('Removing stale cache lock', { lockPath });
          await fsPromises.rm(lockPath, { force: true });
          continue; // Retry acquisition
        }

        if (Date.now() - start > LOCK_TIMEOUT_MS) {
          throw new Error(`Timed out waiting for cache lock at ${lockPath}`);
        }

        await sleep(LOCK_RETRY_MS);
        continue;
      }

      throw error;
    }
  }
};

const releaseCacheLock = async (
  lockPath: string,
  handle: fsPromises.FileHandle | null
): Promise<void> => {
  if (handle) {
    try {
      await handle.close();
    } catch (closeError) {
      logger.warn('Failed to close lock file handle', {
        lockPath,
        error: closeError instanceof Error ? closeError.message : String(closeError),
      });
      // Continue to remove lock file anyway
    }
  }
  await fsPromises.rm(lockPath, { force: true });
};

const writeCacheFile = async (cachePath: string, cache: OcrDiskCache): Promise<void> => {
  cache.updated_at = new Date().toISOString();

  // Ensure directory exists
  const dir = path.dirname(cachePath);
  try {
    await fsPromises.access(dir);
  } catch {
    await fsPromises.mkdir(dir, { recursive: true });
  }

  const tempPath = `${cachePath}.${process.pid}.${Date.now()}.tmp`;
  await fsPromises.writeFile(tempPath, JSON.stringify(cache, null, 2), 'utf-8');
  await fsPromises.rename(tempPath, cachePath);
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
 * Atomic cache update: read-modify-write inside lock
 * Prevents race conditions by ensuring all operations happen atomically
 */
const atomicCacheUpdate = async (
  pdfPath: string,
  fingerprint: string,
  ocrProvider: string,
  updateFn: (cache: OcrDiskCache) => void
): Promise<void> => {
  const cachePath = getCacheFilePath(pdfPath);
  const lockPath = `${cachePath}.lock`;
  const lockHandle = await acquireCacheLock(lockPath);

  try {
    // Load inside lock
    let cache = loadOcrCache(pdfPath);

    // Create or reset if fingerprint changed
    if (!cache || cache.fingerprint !== fingerprint) {
      if (cache && cache.fingerprint !== fingerprint) {
        logger.warn('PDF fingerprint changed, resetting cache', { pdfPath });
      }
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

    // Apply update
    updateFn(cache);

    // Write inside lock
    await writeCacheFile(cachePath, cache);
  } finally {
    await releaseCacheLock(lockPath, lockHandle);
  }
};

/**
 * Save OCR cache to disk
 */
export const saveOcrCache = async (pdfPath: string, cache: OcrDiskCache): Promise<void> => {
  const cachePath = getCacheFilePath(pdfPath);
  const lockPath = `${cachePath}.lock`;
  const lockHandle = await acquireCacheLock(lockPath);

  try {
    const latest = loadOcrCache(pdfPath);
    const merged = mergeCaches(latest, cache);

    await writeCacheFile(cachePath, merged);

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
    await releaseCacheLock(lockPath, lockHandle);
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
export const setCachedOcrPage = async (
  pdfPath: string,
  fingerprint: string,
  page: number,
  providerHash: string,
  ocrProvider: string,
  result: OcrPageResult
): Promise<void> => {
  await atomicCacheUpdate(pdfPath, fingerprint, ocrProvider, (cache) => {
    const pageKey = String(page);
    cache.pages[pageKey] = {
      ...result,
      provider_hash: providerHash,
      cached_at: new Date().toISOString(),
    };
  });

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
export const setCachedOcrImage = async (
  pdfPath: string,
  fingerprint: string,
  page: number,
  imageIndex: number,
  providerHash: string,
  ocrProvider: string,
  result: OcrImageResult
): Promise<void> => {
  await atomicCacheUpdate(pdfPath, fingerprint, ocrProvider, (cache) => {
    const imageKey = `${page}/${imageIndex}`;
    cache.images[imageKey] = {
      ...result,
      provider_hash: providerHash,
      cached_at: new Date().toISOString(),
    };
  });

  logger.debug('Cached OCR result for image', { page, imageIndex });
};
