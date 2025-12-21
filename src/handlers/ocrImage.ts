import { text, tool, toolError } from '@sylphx/mcp-server-sdk';
import { extractImages } from '../pdf/extractor.js';
import { ocrImageArgsSchema } from '../schemas/ocr.js';
import type { OcrResult } from '../types/pdf.js';
import { buildOcrProviderKey, getCachedOcrText, setCachedOcrText } from '../utils/cache.js';
import { getDocumentFingerprint } from '../utils/fingerprint.js';
import { createLogger } from '../utils/logger.js';
import { performOcr } from '../utils/ocr.js';
import { withPdfDocument } from '../utils/pdfLifecycle.js';

const logger = createLogger('OcrImage');

const buildCachedResult = (
  sourceDescription: string,
  fingerprint: string,
  page: number,
  index: number,
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
    image: { page, index },
  },
});

const performImageOcr = async (
  source: { path?: string; url?: string },
  sourceDescription: string,
  page: number,
  index: number,
  provider: Parameters<typeof performOcr>[1],
  useCache: boolean
): Promise<OcrResult> => {
  return withPdfDocument(source, sourceDescription, async (pdfDocument) => {
    const totalPages = pdfDocument.numPages;

    if (page < 1 || page > totalPages) {
      throw new Error(`Requested page ${page} is out of bounds (1-${totalPages}).`);
    }

    const fingerprint = getDocumentFingerprint(pdfDocument, sourceDescription);
    const providerKey = buildOcrProviderKey(provider);
    const cacheKey = `image-${page}-${index}#provider-${providerKey}`;
    const cached = useCache ? getCachedOcrText(fingerprint, cacheKey) : undefined;

    if (cached) {
      return buildCachedResult(
        sourceDescription,
        fingerprint,
        page,
        index,
        cached.provider,
        cached.text
      );
    }

    const images = await extractImages(pdfDocument, [page]);
    const target = images.find((img) => img.page === page && img.index === index);

    if (!target) {
      throw new Error(`Image with index ${index} not found on page ${page}.`);
    }

    const ocr = await performOcr(target.data, provider);
    setCachedOcrText(fingerprint, cacheKey, { text: ocr.text, provider: ocr.provider });

    return {
      source: sourceDescription,
      success: true,
      data: {
        text: ocr.text,
        provider: ocr.provider,
        fingerprint,
        from_cache: false,
        image: { page, index },
      },
    } satisfies OcrResult;
  });
};

export const pdfOcrImage = tool()
  .description('Perform OCR on a specific image from a PDF page with caching support.')
  .input(ocrImageArgsSchema)
  .handler(async ({ input }) => {
    const { source, page, index, provider, cache } = input;
    const sourceDescription = source.path ?? source.url ?? 'unknown source';

    try {
      const result = await performImageOcr(
        source,
        sourceDescription,
        page,
        index,
        provider,
        cache !== false
      );
      return [text(JSON.stringify(result, null, 2))];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to OCR image', { sourceDescription, page, index, error: message });
      return toolError(`Failed to OCR image from ${sourceDescription}. Reason: ${message}`);
    }
  });
