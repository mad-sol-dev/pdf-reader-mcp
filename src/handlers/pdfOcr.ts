import { image, text, tool, toolError } from '@sylphx/mcp-server-sdk';
import type * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractImages } from '../pdf/extractor.js';
import { renderPageToPng } from '../pdf/render.js';
import { pdfOcrArgsSchema } from '../schemas/pdfOcr.js';
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
import { getConfiguredProvider, performOcr } from '../utils/ocr.js';
import { withPdfDocument } from '../utils/pdfLifecycle.js';

const logger = createLogger('PdfOcr');

const SMART_OCR_MIN_TEXT_LENGTH = 50;
const SMART_OCR_MAX_TEXT_LENGTH = 1000;
const SMART_OCR_NON_ASCII_RATIO = 0.3;
const SMART_OCR_NON_ASCII_MIN_COUNT = 10;
const SMART_OCR_IMAGE_TEXT_RATIO = 0.02;
const DECISION_CACHE_MAX_ENTRIES = 500;

type OcrDecision = { needsOcr: boolean; reason: string };

const decisionCache = new Map<string, OcrDecision>();

const buildDecisionCacheKey = (fingerprint: string, page: number): string =>
  `${fingerprint}#ocr-decision#page-${page}`;

const getCachedDecision = (fingerprint: string, page: number): OcrDecision | undefined =>
  decisionCache.get(buildDecisionCacheKey(fingerprint, page));

const setCachedDecision = (fingerprint: string, page: number, decision: OcrDecision): void => {
  const key = buildDecisionCacheKey(fingerprint, page);
  if (decisionCache.has(key)) {
    decisionCache.delete(key);
  }
  decisionCache.set(key, decision);
  if (decisionCache.size > DECISION_CACHE_MAX_ENTRIES) {
    const oldestKey = decisionCache.keys().next().value;
    if (oldestKey) {
      decisionCache.delete(oldestKey);
    }
  }
};

const extractTextFromPage = async (page: pdfjsLib.PDFPageProxy): Promise<string> => {
  const textContent = await page.getTextContent();
  const items = textContent.items as Array<{ str?: string }>;
  return items.map((item) => item.str ?? '').join('');
};

const countImagesOnPage = async (page: pdfjsLib.PDFPageProxy): Promise<number> => {
  const operatorList = await page.getOperatorList();
  const fnArray = operatorList.fnArray ?? [];
  let imageCount = 0;
  for (const op of fnArray) {
    if (op === OPS.paintImageXObject || op === OPS.paintXObject) {
      imageCount += 1;
    }
  }
  return imageCount;
};

const decideNeedsOcr = async (
  page: pdfjsLib.PDFPageProxy,
  extractedText: string
): Promise<OcrDecision> => {
  const trimmedText = extractedText.trim();
  const textLength = trimmedText.length;

  if (textLength < SMART_OCR_MIN_TEXT_LENGTH) {
    return { needsOcr: true, reason: 'text_too_short' };
  }

  if (textLength > SMART_OCR_MAX_TEXT_LENGTH) {
    return { needsOcr: false, reason: 'text_too_long' };
  }

  const imageCount = await countImagesOnPage(page);

  if (imageCount > 0) {
    const imageTextRatio = textLength / imageCount;
    if (imageTextRatio < SMART_OCR_IMAGE_TEXT_RATIO) {
      return { needsOcr: true, reason: 'high_image_low_text_ratio' };
    }
  }

  // biome-ignore lint/suspicious/noControlCharactersInRegex: Standard pattern for non-ASCII detection
  const nonAsciiCount = (trimmedText.match(/[^\u0000-\u007F]/gu) || []).length;

  if (nonAsciiCount >= SMART_OCR_NON_ASCII_MIN_COUNT) {
    const nonAsciiRatio = nonAsciiCount / textLength;
    if (nonAsciiRatio >= SMART_OCR_NON_ASCII_RATIO) {
      return { needsOcr: true, reason: 'high_non_ascii_ratio' };
    }
  }

  return { needsOcr: false, reason: 'text_extraction_sufficient' };
};

// Helper to check in-memory cache for OCR results
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

// Helper to check disk cache for page OCR results
const checkDiskCacheForPage = (
  sourcePath: string | undefined,
  fingerprint: string,
  page: number,
  scale: number,
  providerKey: string,
  providerName: string,
  cacheKey: string,
  source: string,
  useCache: boolean
): { success: true; result: OcrResult } | undefined => {
  if (!useCache || !sourcePath) return undefined;

  const diskCached = getCachedOcrPage(sourcePath, fingerprint, page, scale, providerKey);
  if (!diskCached) return undefined;

  setCachedOcrText(fingerprint, cacheKey, {
    text: diskCached.text,
    provider: providerName,
  });

  logger.debug('Loaded OCR result from disk cache', { page, path: sourcePath });

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

// Helper to check disk cache for image OCR results
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

  logger.debug('Loaded OCR result from disk cache', { page, index, path: sourcePath });

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

// Helper to handle smart OCR decision
const handleSmartOcrDecision = async (
  smartOcr: boolean,
  fingerprint: string,
  page: number,
  source: string,
  pdfDocument: pdfjsLib.PDFDocumentProxy
): Promise<{ success: true; result: OcrResult } | undefined> => {
  if (!smartOcr) return undefined;

  const cached = getCachedDecision(fingerprint, page);
  let decision = cached;

  if (!decision) {
    const pdfPage = await pdfDocument.getPage(page);
    const pageText = await extractTextFromPage(pdfPage);
    decision = await decideNeedsOcr(pdfPage, pageText);
    setCachedDecision(fingerprint, page, decision);
  }

  if (!decision.needsOcr) {
    return {
      success: true,
      result: {
        source,
        success: true,
        data: {
          text: '',
          provider: 'smart_ocr_skip',
          fingerprint,
          from_cache: false,
          page,
          decision: decision.reason,
          message: 'Smart OCR determined that text extraction is sufficient.',
        },
      },
    };
  }

  return undefined;
};

// Helper to execute OCR and save to caches for pages
const executePageOcrAndCache = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  page: number,
  scale: number | undefined,
  provider: OcrProviderOptions,
  fingerprint: string,
  cacheKey: string,
  providerKey: string,
  sourcePath: string | undefined,
  source: string
): Promise<{ success: true; result: OcrResult }> => {
  const pdfPage = await pdfDocument.getPage(page);
  const { imageData } = await renderPageToPng(pdfPage, scale);
  const ocr = await performOcr(imageData, provider);

  // Save to caches
  setCachedOcrText(fingerprint, cacheKey, { text: ocr.text, provider: ocr.provider });

  if (sourcePath) {
    setCachedOcrPage(
      sourcePath,
      fingerprint,
      page,
      scale ?? 1,
      providerKey,
      provider.name ?? 'unknown',
      {
        text: ocr.text,
        provider_hash: providerKey,
        cached_at: new Date().toISOString(),
      }
    );
    logger.debug('Saved OCR result to disk cache', { page, path: sourcePath });
  }

  return {
    success: true,
    result: {
      source,
      success: true,
      data: {
        ...ocr,
        fingerprint,
        from_cache: false,
        page,
      },
    },
  };
};

// Page OCR implementation
const performPageOcr = async (
  source: { path?: string; url?: string },
  sourceDescription: string,
  page: number,
  provider: OcrProviderOptions | undefined,
  scale: number | undefined,
  smartOcr: boolean,
  useCache: boolean,
  pdfDocument: pdfjsLib.PDFDocumentProxy
): Promise<
  { success: true; result: OcrResult } | { success: false; imageData: string; metadata: object }
> => {
  const fingerprint = getDocumentFingerprint(pdfDocument, sourceDescription);
  const providerKey = buildOcrProviderKey(provider);
  const cacheKey = `page-${page}#scale-${scale ?? 1}#provider-${providerKey}`;

  // Check if provider is available
  if (!provider) {
    logger.info('No OCR provider configured, returning rendered page image', { page });
    const pdfPage = await pdfDocument.getPage(page);
    const { imageData } = await renderPageToPng(pdfPage, scale);

    return {
      success: false,
      imageData,
      metadata: {
        page,
        scale: scale ?? 1,
        message: 'No OCR provider configured. Returning rendered page image for Vision analysis.',
        recommendation:
          'Configure MISTRAL_API_KEY environment variable to enable OCR, or analyze this image with your Vision capabilities.',
      },
    };
  }

  // Smart OCR decision
  const smartOcrResult = await handleSmartOcrDecision(
    smartOcr,
    fingerprint,
    page,
    sourceDescription,
    pdfDocument
  );
  if (smartOcrResult) return smartOcrResult;

  // Layer 1: In-memory cache
  const memoryCached = checkInMemoryCache(fingerprint, cacheKey, useCache, sourceDescription, page);
  if (memoryCached) return memoryCached;

  // Layer 2: Disk cache
  const diskCached = checkDiskCacheForPage(
    source.path,
    fingerprint,
    page,
    scale ?? 1,
    providerKey,
    provider.name ?? 'unknown',
    cacheKey,
    sourceDescription,
    useCache
  );
  if (diskCached) return diskCached;

  // Layer 3: Perform OCR
  return executePageOcrAndCache(
    pdfDocument,
    page,
    scale,
    provider,
    fingerprint,
    cacheKey,
    providerKey,
    source.path,
    sourceDescription
  );
};

// Image OCR implementation
const performImageOcr = async (
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
  const cacheKey = `image-${page}-${index}#provider-${providerKey}`;

  // Extract the image first (needed for both OCR and fallback)
  const { images } = await extractImages(pdfDocument, [page]);
  const target = images.find((img) => img.page === page && img.index === index);

  if (!target) {
    throw new Error(`Image with index ${index} not found on page ${page}.`);
  }

  // Check if provider is available
  if (!provider) {
    logger.info('No OCR provider configured, returning extracted image', { page, index });

    return {
      success: false,
      imageData: target.data,
      metadata: {
        page,
        index,
        width: target.width,
        height: target.height,
        format: target.format,
        message: 'No OCR provider configured. Returning extracted image for Vision analysis.',
        recommendation:
          'Configure MISTRAL_API_KEY environment variable to enable OCR, or analyze this image with your Vision capabilities.',
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

  // Layer 3: Perform OCR
  const ocr = await performOcr(target.data, provider);

  // Save to caches
  setCachedOcrText(fingerprint, cacheKey, { text: ocr.text, provider: ocr.provider });

  if (source.path) {
    setCachedOcrImage(
      source.path,
      fingerprint,
      page,
      index,
      providerKey,
      provider.name ?? 'unknown',
      {
        text: ocr.text,
        provider_hash: providerKey,
        cached_at: new Date().toISOString(),
      }
    );
    logger.debug('Saved OCR result to disk cache', { page, index, path: source.path });
  }

  return {
    success: true,
    result: {
      source: sourceDescription,
      success: true,
      data: {
        ...ocr,
        fingerprint,
        from_cache: false,
        image: { page, index },
      },
    },
  };
};

export const pdfOcr = tool()
  .description(
    'STAGE 3: OCR for text in images\n\n' +
      'Use AFTER Stage 1 (pdf_read) and Stage 2 (pdf_extract_image) when:\n' +
      '- Images contain text that Vision cannot read clearly\n' +
      '- You need machine-readable text from scanned pages\n\n' +
      'AUTO-FALLBACK: If no OCR provider is configured via MISTRAL_API_KEY environment variable, returns base64 image for your Vision analysis instead of erroring.\n\n' +
      'Two modes:\n' +
      '1. Page OCR: Omit "index" to OCR entire rendered page\n' +
      '2. Image OCR: Provide "index" to OCR specific image from page\n\n' +
      'Configuration: Set MISTRAL_API_KEY environment variable to enable OCR.\n\n' +
      'Example:\n' +
      '  pdf_ocr({source: {path: "doc.pdf"}, page: 5})  // Full page\n' +
      '  pdf_ocr({source: {path: "doc.pdf"}, page: 5, index: 0})  // Specific image'
  )
  .input(pdfOcrArgsSchema)
  .handler(async ({ input }) => {
    const { source, page, index, scale, cache, smart_ocr } = input;
    const sourceDescription = source.path ?? source.url ?? 'unknown source';

    const sourceArgs = {
      ...(source.path ? { path: source.path } : {}),
      ...(source.url ? { url: source.url } : {}),
    };

    try {
      // Get provider from environment configuration
      const configuredProvider = getConfiguredProvider();

      const result = await withPdfDocument(sourceArgs, sourceDescription, async (pdfDocument) => {
        const totalPages = pdfDocument.numPages;

        if (page < 1 || page > totalPages) {
          throw new Error(`Requested page ${page} is out of bounds (1-${totalPages}).`);
        }

        // Determine if this is image OCR or page OCR
        if (index !== undefined) {
          // Image OCR
          return performImageOcr(
            sourceArgs,
            sourceDescription,
            page,
            index,
            configuredProvider,
            cache !== false,
            pdfDocument
          );
        }

        // Page OCR
        return performPageOcr(
          sourceArgs,
          sourceDescription,
          page,
          configuredProvider,
          scale,
          smart_ocr ?? false,
          cache !== false,
          pdfDocument
        );
      });

      // Handle fallback case (no provider configured)
      if (!result.success) {
        return [
          text(JSON.stringify(result.metadata, null, 2)),
          image(result.imageData, 'image/png'),
        ];
      }

      // Return OCR result
      return [text(JSON.stringify(result.result, null, 2))];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to perform OCR', { sourceDescription, page, index, error: message });
      return toolError(`Failed to perform OCR on ${sourceDescription}. Reason: ${message}`);
    }
  });
