import { text, tool, toolError } from '@sylphx/mcp-server-sdk';
import type * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractMetadataAndPageCount } from '../pdf/extractor.js';
import type { PdfInfoArgs, PdfInfoResponse } from '../schemas/pdfInfo.js';
import { pdfInfoArgsSchema } from '../schemas/pdfInfo.js';
import type { PdfSource } from '../schemas/pdfSource.js';
import { createLogger } from '../utils/logger.js';
import { withPdfDocument } from '../utils/pdfLifecycle.js';

const logger = createLogger('PdfInfo');

const buildLoadArgs = (source: PdfSource) => ({
  ...(source.path ? { path: source.path } : {}),
  ...(source.url ? { url: source.url } : {}),
});

const getFingerprint = (pdfDocument: pdfjsLib.PDFDocumentProxy): string | undefined =>
  (pdfDocument as unknown as { fingerprint?: string }).fingerprint ??
  (pdfDocument as unknown as { fingerprints?: string[] }).fingerprints?.[0];

/**
 * Check if PDF has table of contents and count entries
 */
const getTocInfo = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  sourceDescription: string
): Promise<{ has_toc: boolean; toc_entries?: number }> => {
  try {
    const outline = await pdfDocument.getOutline();
    if (!outline || outline.length === 0) {
      return { has_toc: false };
    }

    // Count total entries (including nested)
    const countEntries = (items: unknown[]): number => {
      let count = items.length;
      for (const item of items) {
        const typedItem = item as { items?: unknown[] };
        if (typedItem.items && Array.isArray(typedItem.items)) {
          count += countEntries(typedItem.items);
        }
      }
      return count;
    };

    return {
      has_toc: true,
      toc_entries: countEntries(outline),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Error checking TOC', { sourceDescription, error: message });
    return { has_toc: false };
  }
};

/**
 * Count images on a single page
 */
const countImagesOnPage = async (page: pdfjsLib.PDFPageProxy): Promise<number> => {
  const operatorList = await page.getOperatorList();
  const fnArray = operatorList.fnArray ?? [];
  let count = 0;

  for (const op of fnArray) {
    if (op === OPS.paintImageXObject || op === OPS.paintXObject) {
      count += 1;
    }
  }

  return count;
};

/**
 * Count total images across sampled pages
 */
const countTotalImages = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  pagesToCheck: number,
  sourceDescription: string
): Promise<number> => {
  let totalImages = 0;

  for (let pageNum = 1; pageNum <= pagesToCheck; pageNum++) {
    try {
      const page = await pdfDocument.getPage(pageNum);
      totalImages += await countImagesOnPage(page);
    } catch (pageError: unknown) {
      const message = pageError instanceof Error ? pageError.message : String(pageError);
      logger.warn('Error checking images on page', {
        sourceDescription,
        page: pageNum,
        error: message,
      });
    }
  }

  return totalImages;
};

/**
 * Build image statistics result
 */
const buildImageStatsResult = (
  totalImages: number,
  pagesToCheck: number,
  numPages: number
): { has_images: boolean; image_count?: number } => {
  if (totalImages === 0) {
    return { has_images: false };
  }

  const estimatedTotal =
    pagesToCheck < numPages ? Math.round((totalImages / pagesToCheck) * numPages) : totalImages;

  return {
    has_images: true,
    image_count: estimatedTotal,
  };
};

/**
 * Count images across sampled pages
 */
const getImageStats = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  sourceDescription: string
): Promise<{ has_images: boolean; image_count?: number }> => {
  try {
    const numPages = pdfDocument.numPages;
    const pagesToCheck = Math.min(10, numPages);

    const totalImages = await countTotalImages(pdfDocument, pagesToCheck, sourceDescription);

    return buildImageStatsResult(totalImages, pagesToCheck, numPages);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Error counting images', { sourceDescription, error: message });
    return { has_images: false };
  }
};

/**
 * Build workflow suggestions based on PDF content
 */
const buildNextStep = (data: {
  has_toc?: boolean;
  has_images?: boolean;
}): { suggestion: string; tools?: string[] } => {
  if (data.has_toc || data.has_images) {
    return {
      suggestion:
        'To read content, use pdf_read (Stage 1). To search for specific terms, use pdf_search.',
      tools: ['pdf_read', 'pdf_search'],
    };
  }

  return {
    suggestion: 'Use pdf_read (Stage 1) to extract text from pages.',
    tools: ['pdf_read'],
  };
};

/**
 * Build base metadata from PDF document
 */
const buildBaseData = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy
): Promise<NonNullable<PdfInfoResponse['data']>> => {
  const metadata = await extractMetadataAndPageCount(pdfDocument, true, true);
  const fingerprint = getFingerprint(pdfDocument);

  return {
    pages: metadata.num_pages ?? pdfDocument.numPages,
    ...(metadata.info?.Title ? { title: metadata.info.Title } : {}),
    ...(metadata.info?.Author ? { author: metadata.info.Author } : {}),
    ...(metadata.info?.Language !== undefined ? { language: metadata.info.Language } : {}),
    ...(fingerprint ? { fingerprint } : {}),
  };
};

/**
 * Enrich data with optional TOC and stats
 */
const enrichData = async (
  data: NonNullable<PdfInfoResponse['data']>,
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  sourceDescription: string,
  includeToc: boolean,
  includeStats: boolean
): Promise<void> => {
  if (includeToc) {
    const tocInfo = await getTocInfo(pdfDocument, sourceDescription);
    data.has_toc = tocInfo.has_toc;
    if (tocInfo.toc_entries !== undefined) {
      data.toc_entries = tocInfo.toc_entries;
    }
  }

  if (includeStats) {
    const imageStats = await getImageStats(pdfDocument, sourceDescription);
    data.has_images = imageStats.has_images;
    if (imageStats.image_count !== undefined) {
      data.image_count = imageStats.image_count;
    }
  }
};

/**
 * Process a single PDF source
 */
const processSource = async (args: PdfInfoArgs): Promise<PdfInfoResponse> => {
  const { source, include } = args;
  const sourceDescription = source.path ?? source.url ?? 'unknown source';
  const loadArgs = buildLoadArgs(source);

  const includeToc = include?.includes('toc') ?? false;
  const includeStats = include?.includes('stats') ?? false;

  return withPdfDocument(loadArgs, sourceDescription, async (pdfDocument) => {
    const data = await buildBaseData(pdfDocument);
    await enrichData(data, pdfDocument, sourceDescription, includeToc, includeStats);

    data.next_step = buildNextStep({
      has_toc: data.has_toc,
      has_images: data.has_images,
    });

    return {
      source: sourceDescription,
      success: true,
      data,
    } satisfies PdfInfoResponse;
  });
};

export const pdfInfo = tool()
  .description(
    'QUICK CHECK: Get PDF metadata and overview\n\n' +
      'Use for fast answers about the PDF without loading content:\n' +
      '- How many pages?\n' +
      '- Title/author/language?\n' +
      '- Has table of contents? (with include=["toc"])\n' +
      '- Has images? (with include=["stats"])\n\n' +
      'This is FAST and LIGHTWEIGHT - perfect before deciding which pages to read.\n\n' +
      'Example:\n' +
      '  pdf_info({source: {path: "doc.pdf"}})\n' +
      '  pdf_info({source: {path: "doc.pdf"}, include: ["toc", "stats"]})'
  )
  .input(pdfInfoArgsSchema)
  .handler(async ({ input }) => {
    try {
      const result = await processSource(input);
      return [text(JSON.stringify(result, null, 2))];
    } catch (error: unknown) {
      const sourceDescription = input.source.path ?? input.source.url ?? 'unknown source';
      const message = error instanceof Error ? error.message : String(error);

      const errorResult: PdfInfoResponse = {
        source: sourceDescription,
        success: false,
        error: `Failed to get info for ${sourceDescription}. Reason: ${message}`,
      };

      return toolError(JSON.stringify(errorResult));
    }
  });
