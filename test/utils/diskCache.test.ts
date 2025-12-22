import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { OcrDiskCache } from '../../src/types/cache.js';
import { loadOcrCache, saveOcrCache } from '../../src/utils/diskCache.js';

const fingerprint = 'disk-cache-fingerprint';
const provider = 'test-provider';

const createBaseCache = (pdfPath: string): OcrDiskCache => ({
  fingerprint,
  pdf_path: pdfPath,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ocr_provider: provider,
  pages: {},
  images: {},
});

const scheduleWrite = (fn: () => void): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(() => {
      fn();
      resolve();
    }, 0);
  });

const createdDirs: string[] = [];

afterEach(() => {
  for (const dir of createdDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  createdDirs.length = 0;
});

describe('disk cache writes', () => {
  it('merges parallel page writes so no entries are lost', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'disk-cache-'));
    createdDirs.push(tempDir);

    const pdfPath = path.join(tempDir, 'test.pdf');
    const baseCache = createBaseCache(pdfPath);

    const cacheA: OcrDiskCache = {
      ...baseCache,
      pages: {
        '1': {
          text: 'page-one',
          provider_hash: 'provider-hash',
          cached_at: new Date().toISOString(),
        },
      },
    };

    const cacheB: OcrDiskCache = {
      ...baseCache,
      pages: {
        '2': {
          text: 'page-two',
          provider_hash: 'provider-hash',
          cached_at: new Date().toISOString(),
        },
      },
    };

    await Promise.all([
      scheduleWrite(() => saveOcrCache(pdfPath, cacheA)),
      scheduleWrite(() => saveOcrCache(pdfPath, cacheB)),
    ]);

    const cache = loadOcrCache(pdfPath);

    expect(cache?.pages['1']?.text).toBe('page-one');
    expect(cache?.pages['2']?.text).toBe('page-two');
    expect(Object.keys(cache?.pages ?? {})).toHaveLength(2);
  });

  it('merges page and image entries from overlapping writes', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'disk-cache-'));
    createdDirs.push(tempDir);

    const pdfPath = path.join(tempDir, 'test.pdf');
    const baseCache = createBaseCache(pdfPath);

    const pageCache: OcrDiskCache = {
      ...baseCache,
      pages: {
        '3': {
          text: 'page-three',
          provider_hash: 'provider-hash',
          cached_at: new Date().toISOString(),
        },
      },
    };

    const imageCache: OcrDiskCache = {
      ...baseCache,
      images: {
        '3/0': {
          text: 'image-text',
          provider_hash: 'provider-hash',
          cached_at: new Date().toISOString(),
        },
      },
    };

    await Promise.all([
      scheduleWrite(() => saveOcrCache(pdfPath, pageCache)),
      scheduleWrite(() => saveOcrCache(pdfPath, imageCache)),
    ]);

    const cache = loadOcrCache(pdfPath);

    expect(cache?.pages['3']?.text).toBe('page-three');
    expect(cache?.images['3/0']?.text).toBe('image-text');
    expect(Object.keys(cache?.pages ?? {})).toHaveLength(1);
    expect(Object.keys(cache?.images ?? {})).toHaveLength(1);
  });
});
