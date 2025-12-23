import { text, tool, toolError } from '@sylphx/mcp-server-sdk';
import type * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { buildWarnings, extractPageContent } from '../pdf/extractor.js';
import { loadPdfDocument } from '../pdf/loader.js';
import {
  DEFAULT_SAMPLE_PAGE_LIMIT,
  determinePagesToProcess,
  getTargetPages,
} from '../pdf/parser.js';
import { buildNormalizedPageText } from '../pdf/text.js';
import { pdfReadArgsSchema } from '../schemas/pdfRead.js';
import type { PdfSource } from '../schemas/pdfSource.js';
import type { PdfPageText, PdfSourcePagesResult } from '../types/pdf.js';
import { getCachedPageText, setCachedPageText } from '../utils/cache.js';
import { getDocumentFingerprint } from '../utils/fingerprint.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('PdfRead');

interface PageReadOptions {
  includeImageIndexes: boolean;
  insertMarkers: boolean;
  maxCharsPerPage?: number;
  preserveWhitespace: boolean;
  trimLines: boolean;
}

const processPage = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  sourceDescription: string,
  options: PageReadOptions,
  fingerprint?: string,
  pageLabel?: string | null
): Promise<PdfPageText> => {
  const cached = getCachedPageText(fingerprint, pageNum, options);
  if (cached) {
    return cached;
  }

  // Extract images if either includeImageIndexes or insertMarkers is enabled
  const shouldIncludeImages = options.includeImageIndexes || options.insertMarkers;

  const { items } = await extractPageContent(
    pdfDocument,
    pageNum,
    shouldIncludeImages,
    sourceDescription
  );

  const normalized = buildNormalizedPageText(items, {
    preserveWhitespace: options.preserveWhitespace,
    trimLines: options.trimLines,
    insertMarkers: options.insertMarkers,
    ...(options.maxCharsPerPage !== undefined ? { maxCharsPerPage: options.maxCharsPerPage } : {}),
  });

  const pageEntry: PdfPageText = {
    page_number: pageNum,
    page_index: pageNum - 1,
    page_label: pageLabel ?? null,
    lines: normalized.lines,
    text: normalized.text,
  };

  if (normalized.truncated) {
    pageEntry.truncated = true;
  }

  if (options.includeImageIndexes) {
    const imageIndexes = items
      .filter((item) => item.type === 'image' && item.imageData)
      .map((item) => item.imageData?.index)
      .filter((value): value is number => value !== undefined);

    if (imageIndexes.length > 0) {
      pageEntry.image_indexes = imageIndexes;
    }
  }

  setCachedPageText(fingerprint, pageNum, options, pageEntry);

  return pageEntry;
};

const getPageLabelsSafe = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  sourceDescription: string
): Promise<string[] | null> => {
  try {
    return await pdfDocument.getPageLabels();
  } catch (labelError: unknown) {
    const message = labelError instanceof Error ? labelError.message : String(labelError);
    logger.warn('Error retrieving page labels', { sourceDescription, error: message });
  }

  return null;
};

const collectPages = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  pagesToProcess: number[],
  pageLabels: string[] | null,
  sourceDescription: string,
  options: PageReadOptions,
  fingerprint?: string
): Promise<{ pages: PdfPageText[]; truncatedPages: number[] }> => {
  const pages: PdfPageText[] = [];
  const truncatedPages: number[] = [];

  for (const pageNum of pagesToProcess) {
    const label = pageLabels?.[pageNum - 1] ?? null;
    const pageData = await processPage(
      pdfDocument,
      pageNum,
      sourceDescription,
      options,
      fingerprint,
      label
    );

    if (pageData.truncated) {
      truncatedPages.push(pageNum);
    }

    pages.push(pageData);
  }

  return { pages, truncatedPages };
};

const destroyPdfDocument = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy | null,
  sourceDescription: string
): Promise<void> => {
  if (!pdfDocument || typeof pdfDocument.destroy !== 'function') {
    return;
  }

  try {
    await pdfDocument.destroy();
  } catch (destroyError: unknown) {
    const message = destroyError instanceof Error ? destroyError.message : String(destroyError);
    logger.warn('Error destroying PDF document', { sourceDescription, error: message });
  }
};

const processSourcePages = async (
  source: PdfSource,
  sourceDescription: string,
  options: PageReadOptions,
  allowFullDocument: boolean
): Promise<PdfSourcePagesResult> => {
  let pdfDocument: pdfjsLib.PDFDocumentProxy | null = null;
  let result: PdfSourcePagesResult = { source: sourceDescription, success: false };

  try {
    const targetPages = getTargetPages(source.pages, sourceDescription);
    const loadArgs = {
      ...(source.path ? { path: source.path } : {}),
      ...(source.url ? { url: source.url } : {}),
    };

    pdfDocument = await loadPdfDocument(loadArgs, sourceDescription);
    const totalPages = pdfDocument.numPages;
    const fingerprint = getDocumentFingerprint(pdfDocument, sourceDescription);

    const { pagesToProcess, invalidPages, guardWarning, rangeWarnings } = determinePagesToProcess(
      targetPages,
      totalPages,
      true,
      {
        allowFullDocument,
        samplePageLimit: DEFAULT_SAMPLE_PAGE_LIMIT,
      }
    );
    const pageLabels = await getPageLabelsSafe(pdfDocument, sourceDescription);
    const { pages, truncatedPages } = await collectPages(
      pdfDocument,
      pagesToProcess,
      pageLabels,
      sourceDescription,
      options,
      fingerprint
    );

    const warnings = [
      ...(rangeWarnings ?? []),
      ...buildWarnings(invalidPages, totalPages),
      ...(guardWarning ? [guardWarning] : []),
    ];

    result = {
      source: sourceDescription,
      success: true,
      data: {
        pages,
        ...(warnings.length > 0 ? { warnings } : {}),
        ...(truncatedPages.length > 0 ? { truncated_pages: truncatedPages } : {}),
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    result = {
      source: sourceDescription,
      success: false,
      error: `Failed to read pages from ${sourceDescription}. Reason: ${message}`,
    };
  } finally {
    await destroyPdfDocument(pdfDocument, sourceDescription);
  }

  return result;
};

export const pdfRead = tool()
  .description(
    'STAGE 1: Extract text from PDF pages\n\n' +
      'ALWAYS USE THIS FIRST before other tools.\n\n' +
      'Returns structured text with line-by-line content. Use insert_markers=true to see where [IMAGE] and [TABLE] markers appear - ' +
      'if you see these markers, you may need Stage 2 (pdf_extract_image) or Stage 3 (pdf_ocr) for those specific elements.\n\n' +
      'Example:\n' +
      '  pdf_read({sources: [{path: "doc.pdf", pages: "1-5"}], insert_markers: true})'
  )
  .input(pdfReadArgsSchema)
  .handler(async ({ input }) => {
    const {
      sources,
      include_image_indexes,
      insert_markers,
      max_chars_per_page,
      preserve_whitespace,
      trim_lines,
      allow_full_document,
    } = input;

    const options: PageReadOptions = {
      includeImageIndexes: include_image_indexes ?? false,
      insertMarkers: insert_markers ?? false,
      preserveWhitespace: preserve_whitespace ?? false,
      trimLines: trim_lines ?? true,
      ...(max_chars_per_page !== undefined ? { maxCharsPerPage: max_chars_per_page } : {}),
    };

    const MAX_CONCURRENT_SOURCES = 3;
    const results: PdfSourcePagesResult[] = [];

    for (let i = 0; i < sources.length; i += MAX_CONCURRENT_SOURCES) {
      const batch = sources.slice(i, i + MAX_CONCURRENT_SOURCES);
      const batchResults = await Promise.all(
        batch.map((source) => {
          const sourceDescription = source.path ?? source.url ?? 'unknown source';
          return processSourcePages(
            source,
            sourceDescription,
            options,
            allow_full_document ?? false
          );
        })
      );

      results.push(...batchResults);
    }

    if (results.every((r) => !r.success)) {
      const errors = results.map((r) => r.error).join('; ');
      return toolError(`All sources failed to return page content: ${errors}`);
    }

    return [text(JSON.stringify({ results }, null, 2))];
  });
