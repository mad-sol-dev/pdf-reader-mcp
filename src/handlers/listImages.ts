import { text, tool, toolError } from '@sylphx/mcp-server-sdk';
import { buildWarnings, extractImages } from '../pdf/extractor.js';
import {
  DEFAULT_SAMPLE_PAGE_LIMIT,
  determinePagesToProcess,
  getTargetPages,
} from '../pdf/parser.js';
import { listImagesArgsSchema } from '../schemas/listImages.js';
import type { PdfImageInfo, PdfImageListResult } from '../types/pdf.js';
import { createLogger } from '../utils/logger.js';
import { withPdfDocument } from '../utils/pdfLifecycle.js';

const logger = createLogger('ListImages');
const MAX_CONCURRENT_SOURCES = 3;

const summarizeImages = (images: PdfImageInfo[], warnings: string[]) => ({
  images,
  total_images: images.length,
  ...(warnings.length > 0 ? { warnings } : {}),
});

const collectImages = async (
  source: { path?: string; url?: string; pages?: string | number[] },
  sourceDescription: string,
  allowFullDocument: boolean
): Promise<PdfImageListResult> => {
  const loadArgs = {
    ...(source.path ? { path: source.path } : {}),
    ...(source.url ? { url: source.url } : {}),
  };

  return withPdfDocument(loadArgs, sourceDescription, async (pdfDocument) => {
    const totalPages = pdfDocument.numPages;
    const targetPages = getTargetPages(source.pages, sourceDescription);
    const { pagesToProcess, invalidPages, guardWarning } = determinePagesToProcess(
      targetPages,
      totalPages,
      true,
      {
        allowFullDocument,
        samplePageLimit: DEFAULT_SAMPLE_PAGE_LIMIT,
      }
    );
    const images = await extractImages(pdfDocument, pagesToProcess);
    const warnings = [
      ...buildWarnings(invalidPages, totalPages),
      ...(guardWarning ? [guardWarning] : []),
    ];

    const imageInfo: PdfImageInfo[] = images.map((img) => ({
      page: img.page,
      index: img.index,
      width: img.width,
      height: img.height,
      format: img.format,
    }));

    return {
      source: sourceDescription,
      success: true,
      data: summarizeImages(imageInfo, warnings),
    } satisfies PdfImageListResult;
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Failed to list images', { sourceDescription, error: message });

    return {
      source: sourceDescription,
      success: false,
      error: `Failed to list images for ${sourceDescription}. Reason: ${message}`,
    } satisfies PdfImageListResult;
  });
};

export const pdfListImages = tool()
  .description(
    'Enumerate image metadata (page/index/dimensions) for PDFs without returning binary data.'
  )
  .input(listImagesArgsSchema)
  .handler(async ({ input }) => {
    const { sources, allow_full_document } = input;
    const results: PdfImageListResult[] = [];

    for (let i = 0; i < sources.length; i += MAX_CONCURRENT_SOURCES) {
      const batch = sources.slice(i, i + MAX_CONCURRENT_SOURCES);
      const batchResults = await Promise.all(
        batch.map((source) =>
          collectImages(
            {
              ...(source.path ? { path: source.path } : {}),
              ...(source.url ? { url: source.url } : {}),
              ...(source.pages !== undefined ? { pages: source.pages } : {}),
            },
            source.path ?? source.url ?? 'unknown source',
            allow_full_document ?? false
          )
        )
      );
      results.push(...batchResults);
    }

    if (results.every((r) => !r.success)) {
      const errors = results.map((r) => r.error).join('; ');
      return toolError(`All sources failed to list images: ${errors}`);
    }

    return [text(JSON.stringify({ results }, null, 2))];
  });
