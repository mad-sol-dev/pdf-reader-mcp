import { image, text, tool, toolError } from '@sylphx/mcp-server-sdk';
import type * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractImages } from '../pdf/extractor.js';
import { renderPageToPng } from '../pdf/render.js';
import { pdfVisionArgsSchema } from '../schemas/pdfVision.js';
import type { OcrResult } from '../types/pdf.js';
import { buildOcrProviderKey, getCachedOcrText, setCachedOcrText } from '../utils/cache.js';
import {
  getCachedOcrImage,
  getCachedOcrPage,
  setCachedOcrImage,
  setCachedOcrPage,
} from '../utils/diskCache.js';
import { getDocumentFingerprint } from '../utils/fingerprint.js';
import { createLogger } from '../utils/logger.js';
import type { OcrProviderOptions } from '../utils/ocr.js';
import { performOcr } from '../utils/ocr.js';
import { withPdfDocument } from '../utils/pdfLifecycle.js';
import { buildNextStep } from '../utils/workflow.js';

const logger = createLogger('PdfVision');

const DEFAULT_VISION_SCALE = 1.5;

/**
 * Get configured Vision provider (Mistral Vision)
 * Returns undefined if no MISTRAL_API_KEY is available
 */
const getConfiguredVisionProvider = (): OcrProviderOptions | undefined => {
  const mistralKey = process.env.MISTRAL_API_KEY;

  if (mistralKey) {
    return {
      type: 'mistral', // Vision API, NOT mistral-ocr
      api_key: mistralKey,
      name: 'mistral-vision-default',
    };
  }

  return undefined;
};

// Helper to check in-memory cache for Vision results
const checkInMemoryCache = (
  fingerprint: string,
  cacheKey: string,
  useCache: boolean,
  source: string,
  page: number,
  index?: number
): { success: true; result: OcrResult } | undefined => {
  if (!useCache) return undefined;

  const cached = getCachedOcrText(fingerprint, cacheKey);
  if (!cached) return undefined;

  return {
    success: true,
    result: {
      source,
      success: true,
      data: {
        text: cached.text,
        provider: cached.provider ?? 'cache',
        fingerprint,
        from_cache: true,
        ...(index !== undefined ? { image: { page, index } } : { page }),
      },
    },
  };
};

// Helper to check disk cache for page Vision results
const checkDiskCacheForPage = (
  sourcePath: string | undefined,
  fingerprint: string,
  page: number,
  providerKey: string,
  providerName: string,
  cacheKey: string,
  source: string,
  useCache: boolean
): { success: true; result: OcrResult } | undefined => {
  if (!useCache || !sourcePath) return undefined;

  const diskCached = getCachedOcrPage(sourcePath, fingerprint, page, providerKey);
  if (!diskCached) return undefined;

  setCachedOcrText(fingerprint, cacheKey, {
    text: diskCached.text,
    provider: providerName,
  });

  logger.debug('Loaded Vision result from disk cache', { page, path: sourcePath });

  return {
    success: true,
    result: {
      source,
      success: true,
      data: {
        text: diskCached.text,
        provider: providerName,
        fingerprint,
        from_cache: true,
        page,
      },
    },
  };
};

// Helper to check disk cache for image Vision results
const checkDiskCacheForImage = (
  sourcePath: string | undefined,
  fingerprint: string,
  page: number,
  index: number,
  providerKey: string,
  providerName: string,
  cacheKey: string,
  source: string,
  useCache: boolean
): { success: true; result: OcrResult } | undefined => {
  if (!useCache || !sourcePath) return undefined;

  const diskCached = getCachedOcrImage(sourcePath, fingerprint, page, index, providerKey);
  if (!diskCached) return undefined;

  setCachedOcrText(fingerprint, cacheKey, {
    text: diskCached.text,
    provider: providerName,
  });

  logger.debug('Loaded Vision result from disk cache', { page, index, path: sourcePath });

  return {
    success: true,
    result: {
      source,
      success: true,
      data: {
        text: diskCached.text,
        provider: providerName,
        fingerprint,
        from_cache: true,
        image: { page, index },
      },
    },
  };
};

// Helper to execute Vision and save to caches for pages
const executePageVisionAndCache = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  page: number,
  provider: OcrProviderOptions,
  fingerprint: string,
  cacheKey: string,
  providerKey: string,
  sourcePath: string | undefined,
  source: string
): Promise<{ success: true; result: OcrResult }> => {
  const { data: imageData } = await renderPageToPng(pdfDocument, page, DEFAULT_VISION_SCALE);
  const visionResult = await performOcr(imageData, provider);

  // Save to caches
  setCachedOcrText(fingerprint, cacheKey, {
    text: visionResult.text,
    provider: visionResult.provider,
  });

  if (sourcePath) {
    try {
      await setCachedOcrPage(
        sourcePath,
        fingerprint,
        page,
        providerKey,
        provider.name ?? 'unknown',
        {
          text: visionResult.text,
          provider_hash: providerKey,
          cached_at: new Date().toISOString(),
        }
      );
      logger.debug('Saved Vision result to disk cache', { page, path: sourcePath });
    } catch (cacheError) {
      logger.warn('Failed to persist Vision cache (continuing without cache)', {
        page,
        path: sourcePath,
        error: cacheError instanceof Error ? cacheError.message : String(cacheError),
      });
      // Don't throw - return the successful Vision result anyway
    }
  }

  return {
    success: true,
    result: {
      source,
      success: true,
      data: {
        ...visionResult,
        fingerprint,
        from_cache: false,
        page,
      },
    },
  };
};

// Page Vision implementation
const performPageVision = async (
  source: { path?: string; url?: string },
  sourceDescription: string,
  page: number,
  provider: OcrProviderOptions | undefined,
  useCache: boolean,
  pdfDocument: pdfjsLib.PDFDocumentProxy
): Promise<
  { success: true; result: OcrResult } | { success: false; imageData: string; metadata: object }
> => {
  const fingerprint = getDocumentFingerprint(pdfDocument, sourceDescription);
  const providerKey = buildOcrProviderKey(provider);
  const cacheKey = `page-${page}#vision#provider-${providerKey}`;

  // Check if provider is available
  if (!provider) {
    logger.info('No Vision provider configured, returning rendered page image', { page });
    const { data: imageData } = await renderPageToPng(pdfDocument, page, DEFAULT_VISION_SCALE);

    return {
      success: false,
      imageData,
      metadata: {
        page,
        scale: DEFAULT_VISION_SCALE,
        message: 'No Vision provider configured. Returning rendered page image for analysis.',
        recommendation:
          'Configure MISTRAL_API_KEY environment variable to enable Mistral Vision API, or analyze this image with Claude Vision.',
      },
    };
  }

  // Layer 1: In-memory cache
  const memoryCached = checkInMemoryCache(fingerprint, cacheKey, useCache, sourceDescription, page);
  if (memoryCached) return memoryCached;

  // Layer 2: Disk cache
  const diskCached = checkDiskCacheForPage(
    source.path,
    fingerprint,
    page,
    providerKey,
    provider.name ?? 'unknown',
    cacheKey,
    sourceDescription,
    useCache
  );
  if (diskCached) return diskCached;

  // Layer 3: Perform Vision
  return executePageVisionAndCache(
    pdfDocument,
    page,
    provider,
    fingerprint,
    cacheKey,
    providerKey,
    source.path,
    sourceDescription
  );
};

// Image Vision implementation
const performImageVision = async (
  source: { path?: string; url?: string },
  sourceDescription: string,
  page: number,
  index: number,
  provider: OcrProviderOptions | undefined,
  useCache: boolean,
  pdfDocument: pdfjsLib.PDFDocumentProxy
): Promise<
  { success: true; result: OcrResult } | { success: false; imageData: string; metadata: object }
> => {
  const fingerprint = getDocumentFingerprint(pdfDocument, sourceDescription);
  const providerKey = buildOcrProviderKey(provider);
  const cacheKey = `image-${page}-${index}#vision#provider-${providerKey}`;

  // Extract the image first (needed for both Vision and fallback)
  const { images } = await extractImages(pdfDocument, [page]);
  const target = images.find((img) => img.page === page && img.index === index);

  if (!target) {
    throw new Error(`Image with index ${index} not found on page ${page}.`);
  }

  // Check if provider is available
  if (!provider) {
    logger.info('No Vision provider configured, returning extracted image', { page, index });

    return {
      success: false,
      imageData: target.data,
      metadata: {
        page,
        index,
        width: target.width,
        height: target.height,
        format: target.format,
        message: 'No Vision provider configured. Returning extracted image for analysis.',
        recommendation:
          'Configure MISTRAL_API_KEY environment variable to enable Mistral Vision API, or analyze this image with Claude Vision.',
      },
    };
  }

  // Layer 1: In-memory cache
  const memoryCached = checkInMemoryCache(
    fingerprint,
    cacheKey,
    useCache,
    sourceDescription,
    page,
    index
  );
  if (memoryCached) return memoryCached;

  // Layer 2: Disk cache
  const diskCached = checkDiskCacheForImage(
    source.path,
    fingerprint,
    page,
    index,
    providerKey,
    provider.name ?? 'unknown',
    cacheKey,
    sourceDescription,
    useCache
  );
  if (diskCached) return diskCached;

  // Layer 3: Perform Vision
  const visionResult = await performOcr(target.data, provider);

  // Save to caches
  setCachedOcrText(fingerprint, cacheKey, {
    text: visionResult.text,
    provider: visionResult.provider,
  });

  if (source.path) {
    try {
      await setCachedOcrImage(
        source.path,
        fingerprint,
        page,
        index,
        providerKey,
        provider.name ?? 'unknown',
        {
          text: visionResult.text,
          provider_hash: providerKey,
          cached_at: new Date().toISOString(),
        }
      );
      logger.debug('Saved Vision result to disk cache', { page, index, path: source.path });
    } catch (cacheError) {
      logger.warn('Failed to persist Vision cache (continuing without cache)', {
        page,
        index,
        path: source.path,
        error: cacheError instanceof Error ? cacheError.message : String(cacheError),
      });
      // Don't throw - return the successful Vision result anyway
    }
  }

  return {
    success: true,
    result: {
      source: sourceDescription,
      success: true,
      data: {
        ...visionResult,
        fingerprint,
        from_cache: false,
        image: { page, index },
      },
    },
  };
};

export const pdfVision = tool()
  .description(
    'Analyze diagrams, charts, and technical illustrations using Mistral Vision API\n\n' +
      'Use this for:\n' +
      '- Technical diagrams (timing diagrams, circuit diagrams, flowcharts)\n' +
      '- Charts and graphs\n' +
      '- Illustrations and visual content\n\n' +
      'AUTO-FALLBACK: If no MISTRAL_API_KEY is configured, returns base64 image for Claude Vision analysis.\n\n' +
      'Two modes:\n' +
      '1. Page Vision: Omit "index" to analyze entire rendered page\n' +
      '2. Image Vision: Provide "index" to analyze specific image from page\n\n' +
      'Configuration: Set MISTRAL_API_KEY environment variable to enable Mistral Vision.\n\n' +
      'Example:\n' +
      '  pdf_vision({source: {path: "doc.pdf"}, page: 5})  // Full page\n' +
      '  pdf_vision({source: {path: "doc.pdf"}, page: 5, index: 0})  // Specific image'
  )
  .input(pdfVisionArgsSchema)
  .handler(async ({ input }) => {
    const { source, page, index, cache } = input;
    const sourceDescription = source.path ?? source.url ?? 'unknown source';

    const sourceArgs = {
      ...(source.path ? { path: source.path } : {}),
      ...(source.url ? { url: source.url } : {}),
    };

    try {
      // Get Vision provider from environment
      const configuredProvider = getConfiguredVisionProvider();

      const result = await withPdfDocument(sourceArgs, sourceDescription, async (pdfDocument) => {
        const totalPages = pdfDocument.numPages;

        if (page < 1 || page > totalPages) {
          throw new Error(`Requested page ${page} is out of bounds (1-${totalPages}).`);
        }

        // Determine if this is image Vision or page Vision
        if (index !== undefined) {
          // Image Vision
          return performImageVision(
            sourceArgs,
            sourceDescription,
            page,
            index,
            configuredProvider,
            cache !== false,
            pdfDocument
          );
        }

        // Page Vision
        return performPageVision(
          sourceArgs,
          sourceDescription,
          page,
          configuredProvider,
          cache !== false,
          pdfDocument
        );
      });

      // Handle fallback case (no provider configured)
      if (!result.success) {
        const nextStep = buildNextStep({ stage: 'vision' });
        return [
          text(JSON.stringify({ ...result.metadata, next_step: nextStep }, null, 2)),
          image(result.imageData, 'image/png'),
        ];
      }

      // Return Vision result
      const nextStep = buildNextStep({ stage: 'vision' });
      return [text(JSON.stringify({ ...result.result, next_step: nextStep }, null, 2))];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to perform Vision analysis', {
        sourceDescription,
        page,
        index,
        error: message,
      });
      return toolError(
        `Failed to perform Vision analysis on ${sourceDescription}. Reason: ${message}`
      );
    }
  });
