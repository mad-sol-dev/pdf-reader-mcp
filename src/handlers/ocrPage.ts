import { text, tool, toolError } from '@sylphx/mcp-server-sdk';
import { renderPageToPng } from '../pdf/render.js';
import { ocrPageArgsSchema } from '../schemas/ocr.js';
import type { OcrResult } from '../types/pdf.js';
import { buildOcrProviderKey, getCachedOcrText, setCachedOcrText } from '../utils/cache.js';
import { getDocumentFingerprint } from '../utils/fingerprint.js';
import { createLogger } from '../utils/logger.js';
import { performOcr } from '../utils/ocr.js';
import type { OcrProviderOptions } from '../utils/ocr.js';
import { withPdfDocument } from '../utils/pdfLifecycle.js';

const logger = createLogger('OcrPage');

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
  useCache: boolean
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

    const rendered = await renderPageToPng(pdfDocument, page, renderScale);
    const ocr = await performOcr(rendered.data, provider);

    setCachedOcrText(fingerprint, cacheKey, { text: ocr.text, provider: ocr.provider });

    return {
      source: sourceDescription,
      success: true,
      data: {
        text: ocr.text,
        provider: ocr.provider,
        fingerprint,
        from_cache: false,
        page,
      },
    } satisfies OcrResult;
  });
};

export const pdfOcrPage = tool()
  .description(
    'Perform OCR on a rendered PDF page with optional provider configuration and caching.'
  )
  .input(ocrPageArgsSchema)
  .handler(async ({ input }) => {
    const { source, page, scale, provider, cache } = input;
    const sourceDescription = source.path ?? source.url ?? 'unknown source';
    const providerOptions: OcrProviderOptions | undefined = provider
      ? {
          ...(provider.name ? { name: provider.name } : {}),
          ...(provider.type === 'http' || provider.type === 'mock' ? { type: provider.type } : {}),
          ...(provider.endpoint ? { endpoint: provider.endpoint } : {}),
          ...(provider.api_key ? { api_key: provider.api_key } : {}),
          ...(provider.model ? { model: provider.model } : {}),
          ...(provider.language ? { language: provider.language } : {}),
          ...(provider.extras ? { extras: provider.extras } : {}),
        }
      : undefined;

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
        cache !== false
      );
      return [text(JSON.stringify(result, null, 2))];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to OCR page', { sourceDescription, page, error: message });
      return toolError(`Failed to OCR page from ${sourceDescription}. Reason: ${message}`);
    }
  });
