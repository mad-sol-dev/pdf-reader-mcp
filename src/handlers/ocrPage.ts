import { text, tool, toolError } from '@sylphx/mcp-server-sdk';
import type * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { renderPageToPng } from '../pdf/render.js';
import { ocrPageArgsSchema } from '../schemas/ocr.js';
import type { OcrResult } from '../types/pdf.js';
import { buildOcrProviderKey, getCachedOcrText, setCachedOcrText } from '../utils/cache.js';
import { getCachedOcrPage, setCachedOcrPage } from '../utils/diskCache.js';
import { getDocumentFingerprint } from '../utils/fingerprint.js';
import { createLogger } from '../utils/logger.js';
import type { OcrProviderOptions } from '../utils/ocr.js';
import { performOcr, sanitizeProviderOptions } from '../utils/ocr.js';
import { withPdfDocument } from '../utils/pdfLifecycle.js';

const logger = createLogger('OcrPage');

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

export const decideNeedsOcr = async (
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

  const nonWhitespaceText = trimmedText.replace(/\s+/g, '');
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional ASCII range check
  const nonAsciiMatches = nonWhitespaceText.match(/[^\x00-\x7f]/g) ?? [];
  const nonAsciiCount = nonAsciiMatches.length;
  const nonAsciiRatio = nonAsciiCount / Math.max(1, nonWhitespaceText.length);

  if (
    nonAsciiCount >= SMART_OCR_NON_ASCII_MIN_COUNT &&
    nonAsciiRatio >= SMART_OCR_NON_ASCII_RATIO
  ) {
    return { needsOcr: true, reason: 'non_ascii_ratio_high' };
  }

  const imageCount = await countImagesOnPage(page);
  const imageToTextRatio = imageCount / Math.max(1, textLength);

  if (imageToTextRatio >= SMART_OCR_IMAGE_TEXT_RATIO) {
    return { needsOcr: true, reason: 'image_text_ratio_high' };
  }

  return { needsOcr: false, reason: 'text_within_thresholds' };
};

const buildCachedResult = (
  sourceDescription: string,
  fingerprint: string,
  page: number,
  provider?: string,
  text?: string
): OcrResult => ({
  source: sourceDescription,
  success: true,
  data: {
    text: text ?? '',
    provider: provider ?? 'cache',
    fingerprint,
    from_cache: true,
    page,
  },
});

const performPageOcr = async (
  source: { path?: string; url?: string },
  sourceDescription: string,
  page: number,
  scale: number | undefined,
  provider: Parameters<typeof performOcr>[1],
  useCache: boolean,
  smartOcr: boolean
): Promise<OcrResult> => {
  return withPdfDocument(source, sourceDescription, async (pdfDocument) => {
    const totalPages = pdfDocument.numPages;

    if (page < 1 || page > totalPages) {
      throw new Error(`Requested page ${page} is out of bounds (1-${totalPages}).`);
    }

    const fingerprint = getDocumentFingerprint(pdfDocument, sourceDescription);
    const renderScale = scale ?? 1.5;
    const providerKey = buildOcrProviderKey(provider);
    const cacheKey = `page-${page}#scale-${renderScale}#provider-${providerKey}`;

    // Layer 1: In-memory cache (fast)
    const cached = useCache ? getCachedOcrText(fingerprint, cacheKey) : undefined;

    if (cached) {
      return buildCachedResult(
        sourceDescription,
        fingerprint,
        page,
        cached.provider ?? provider?.name,
        cached.text
      );
    }

    // Layer 2: Disk cache (persistent) - only for file-based PDFs
    if (useCache && source.path) {
      const diskCached = getCachedOcrPage(source.path, fingerprint, page, providerKey);
      if (diskCached) {
        // Load into memory cache for next time
        setCachedOcrText(fingerprint, cacheKey, {
          text: diskCached.text,
          provider: provider?.name ?? 'unknown',
        });

        logger.debug('Loaded OCR result from disk cache', { page, path: source.path });

        return buildCachedResult(
          sourceDescription,
          fingerprint,
          page,
          provider?.name,
          diskCached.text
        );
      }
    }

    let rendered: Awaited<ReturnType<typeof renderPageToPng>> | undefined;
    let extractedText = '';

    if (smartOcr) {
      // Render first so the OCR step can reuse the image without rerendering.
      rendered = await renderPageToPng(pdfDocument, page, renderScale);
      const pageInstance = await pdfDocument.getPage(page);
      extractedText = await extractTextFromPage(pageInstance);

      const cachedDecision = getCachedDecision(fingerprint, page);
      const decision = cachedDecision ?? (await decideNeedsOcr(pageInstance, extractedText));
      if (!cachedDecision) {
        setCachedDecision(fingerprint, page, decision);
      }

      logger.info('Smart OCR decision', {
        page,
        needs_ocr: decision.needsOcr,
        reason: decision.reason,
        text_length: extractedText.length,
      });

      if (!decision.needsOcr) {
        return {
          source: sourceDescription,
          success: true,
          data: {
            text: extractedText,
            provider: 'pdf_text',
            fingerprint,
            from_cache: false,
            page,
            skipped: true,
            reason: decision.reason,
          },
        } satisfies OcrResult;
      }
    }

    // Layer 3: API call (slow, expensive)
    if (!rendered) {
      rendered = await renderPageToPng(pdfDocument, page, renderScale);
    }
    const ocr = await performOcr(rendered.data, provider);

    // Save to both cache layers
    setCachedOcrText(fingerprint, cacheKey, { text: ocr.text, provider: ocr.provider });

    if (source.path) {
      setCachedOcrPage(source.path, fingerprint, page, providerKey, provider?.name ?? 'unknown', {
        text: ocr.text,
        provider_hash: providerKey,
        cached_at: new Date().toISOString(),
        scale: renderScale,
      });
      logger.debug('Saved OCR result to disk cache', { page, path: source.path });
    }

    return {
      source: sourceDescription,
      success: true,
      data: {
        ...ocr, // Spread all OCR result fields (including pages, model, usage_info if present)
        fingerprint,
        from_cache: false,
        page,
      },
    } satisfies OcrResult;
  });
};

const executeOcrPage = async (input: {
  source: { path?: string; url?: string };
  page: number;
  scale?: number;
  provider?: OcrProviderOptions;
  cache?: boolean;
  smartOcr?: boolean;
}) => {
  const { source, page, scale, provider, cache, smartOcr } = input;
  const sourceDescription = source.path ?? source.url ?? 'unknown source';
  const providerOptions = sanitizeProviderOptions(provider);

  try {
    const result = await performPageOcr(
      {
        ...(source.path ? { path: source.path } : {}),
        ...(source.url ? { url: source.url } : {}),
      },
      sourceDescription,
      page,
      scale,
      providerOptions,
      cache !== false,
      smartOcr === true
    );
    return [text(JSON.stringify(result, null, 2))];
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to OCR page', { sourceDescription, page, error: message });
    return toolError(`Failed to OCR page from ${sourceDescription}. Reason: ${message}`);
  }
};

export const pdfOcrPage = tool()
  .description(
    'Perform OCR on a rendered PDF page with optional provider configuration and caching.'
  )
  .input(ocrPageArgsSchema)
  .handler(async ({ input }) => {
    const { source, provider, cache, page, scale, smart_ocr: smartOcr } = input;
    const sourceArgs = {
      ...(source.path ? { path: source.path } : {}),
      ...(source.url ? { url: source.url } : {}),
    };
    const sanitizedProvider = sanitizeProviderOptions(provider);

    return executeOcrPage({
      page,
      ...(scale !== undefined ? { scale } : {}),
      ...(cache !== undefined ? { cache } : {}),
      ...(smartOcr !== undefined ? { smartOcr } : {}),
      ...(sanitizedProvider ? { provider: sanitizedProvider } : {}),
      source: sourceArgs,
    });
  });
