import { text, tool, toolError } from '@sylphx/mcp-server-sdk';
import type * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { buildWarnings, extractPageContent } from '../pdf/extractor.js';
import { loadPdfDocument } from '../pdf/loader.js';
import { determinePagesToProcess, getTargetPages } from '../pdf/parser.js';
import { getPageStatsArgsSchema } from '../schemas/getPageStats.js';
import type { PdfSource } from '../schemas/pdfSource.js';
import type { PdfPageStats, PdfSourcePageStatsResult } from '../types/pdf.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('GetPageStats');

const summarizePageStats = (
  pagesToProcess: number[],
  pageContents: Array<Awaited<ReturnType<typeof extractPageContent>>>,
  includeImages: boolean
): PdfPageStats['page_stats'] => {
  return pageContents.map((items, idx) => {
    const textLength = items.reduce((total, item) => {
      if (item.type === 'text' && item.textContent) {
        return total + item.textContent.length;
      }
      return total;
    }, 0);

    const imageCount = includeImages
      ? items.filter((item) => item.type === 'image' && item.imageData !== undefined).length
      : 0;

    return {
      page: pagesToProcess[idx] as number,
      text_length: textLength,
      image_count: imageCount,
    };
  });
};

const processSourceStats = async (
  source: PdfSource,
  sourceDescription: string,
  includeImages: boolean
): Promise<PdfSourcePageStatsResult> => {
  let pdfDocument: pdfjsLib.PDFDocumentProxy | null = null;
  let result: PdfSourcePageStatsResult = { source: sourceDescription, success: false };

  try {
    const targetPages = getTargetPages(source.pages, sourceDescription);
    const { pages: _pages, ...loadArgs } = source;

    pdfDocument = await loadPdfDocument(loadArgs, sourceDescription);
    const totalPages = pdfDocument.numPages;

    const { pagesToProcess, invalidPages } = determinePagesToProcess(
      targetPages,
      totalPages,
      true
    );

    const pageContents = await Promise.all(
      pagesToProcess.map((pageNum) =>
        extractPageContent(
          pdfDocument as pdfjsLib.PDFDocumentProxy,
          pageNum,
          includeImages,
          sourceDescription
        )
      )
    );

    const warnings = buildWarnings(invalidPages, totalPages);

    const data: PdfPageStats = {
      num_pages: totalPages,
      page_stats: summarizePageStats(pagesToProcess, pageContents, includeImages),
    };

    if (warnings.length > 0) {
      data.warnings = warnings;
    }

    result = { source: sourceDescription, success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    result = {
      source: sourceDescription,
      success: false,
      error: `Failed to compute page stats for ${sourceDescription}. Reason: ${message}`,
    };
  } finally {
    if (pdfDocument && typeof pdfDocument.destroy === 'function') {
      try {
        await pdfDocument.destroy();
      } catch (destroyError: unknown) {
        const message = destroyError instanceof Error ? destroyError.message : String(destroyError);
        logger.warn('Error destroying PDF document', { sourceDescription, error: message });
      }
    }
  }

  return result;
};

export const pdfGetPageStats = tool()
  .description('Returns per-page text length and image counts for selected pages in PDFs.')
  .input(getPageStatsArgsSchema)
  .handler(async ({ input }) => {
    const { sources, include_images } = input;
    const includeImages = include_images ?? false;
    const MAX_CONCURRENT_SOURCES = 3;

    const results: PdfSourcePageStatsResult[] = [];

    for (let i = 0; i < sources.length; i += MAX_CONCURRENT_SOURCES) {
      const batch = sources.slice(i, i + MAX_CONCURRENT_SOURCES);
      const batchResults = await Promise.all(
        batch.map((source) => {
          const sourceDescription = source.path ?? source.url ?? 'unknown source';
          return processSourceStats(source, sourceDescription, includeImages);
        })
      );

      results.push(...batchResults);
    }

    if (results.every((r) => !r.success)) {
      const errors = results.map((r) => r.error).join('; ');
      return toolError(`All sources failed to return page stats: ${errors}`);
    }

    return [text(JSON.stringify({ results }, null, 2))];
  });
