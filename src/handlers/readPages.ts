import { text, tool, toolError } from '@sylphx/mcp-server-sdk';
import type * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { buildWarnings, extractPageContent } from '../pdf/extractor.js';
import { loadPdfDocument } from '../pdf/loader.js';
import { determinePagesToProcess, getTargetPages } from '../pdf/parser.js';
import { buildNormalizedPageText } from '../pdf/text.js';
import type { PdfSource } from '../schemas/pdfSource.js';
import { readPagesArgsSchema } from '../schemas/readPages.js';
import type { PdfPageText, PdfSourcePagesResult } from '../types/pdf.js';
import { getCachedPageText, setCachedPageText } from '../utils/cache.js';
import { getDocumentFingerprint } from '../utils/fingerprint.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ReadPages');

interface PageReadOptions {
  includeImageIndexes: boolean;
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
  const cached = getCachedPageText(fingerprint, pageNum);
  if (cached) {
    return cached;
  }

  const items = await extractPageContent(
    pdfDocument,
    pageNum,
    options.includeImageIndexes,
    sourceDescription
  );

  const normalized = buildNormalizedPageText(items, {
    preserveWhitespace: options.preserveWhitespace,
    trimLines: options.trimLines,
    maxCharsPerPage: options.maxCharsPerPage,
  });

  const pageEntry: PdfPageText = {
    page_number: pageNum,
    page_index: pageNum - 1,
    page_label: pageLabel ?? undefined,
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

  setCachedPageText(fingerprint, pageNum, pageEntry);

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
  options: PageReadOptions
): Promise<PdfSourcePagesResult> => {
  let pdfDocument: pdfjsLib.PDFDocumentProxy | null = null;
  let result: PdfSourcePagesResult = { source: sourceDescription, success: false };

  try {
    const targetPages = getTargetPages(source.pages, sourceDescription);
    const { pages: _pages, ...loadArgs } = source;

    pdfDocument = await loadPdfDocument(loadArgs, sourceDescription);
    const totalPages = pdfDocument.numPages;
    const fingerprint = getDocumentFingerprint(pdfDocument, sourceDescription);

    const { pagesToProcess, invalidPages } = determinePagesToProcess(targetPages, totalPages, true);
    const pageLabels = await getPageLabelsSafe(pdfDocument, sourceDescription);
    const { pages, truncatedPages } = await collectPages(
      pdfDocument,
      pagesToProcess,
      pageLabels,
      sourceDescription,
      options,
      fingerprint
    );

    const warnings = buildWarnings(invalidPages, totalPages);

    result = {
      source: sourceDescription,
      success: true,
      data: {
        pages,
        warnings: warnings.length > 0 ? warnings : undefined,
        truncated_pages: truncatedPages.length > 0 ? truncatedPages : undefined,
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

export const pdfReadPages = tool()
  .description('Reads structured text for specific PDF pages with optional image indexes.')
  .input(readPagesArgsSchema)
  .handler(async ({ input }) => {
    const { sources, include_image_indexes, max_chars_per_page, preserve_whitespace, trim_lines } =
      input;

    const options: PageReadOptions = {
      includeImageIndexes: include_image_indexes ?? false,
      maxCharsPerPage: max_chars_per_page,
      preserveWhitespace: preserve_whitespace ?? false,
      trimLines: trim_lines ?? true,
    };

    const MAX_CONCURRENT_SOURCES = 3;
    const results: PdfSourcePagesResult[] = [];

    for (let i = 0; i < sources.length; i += MAX_CONCURRENT_SOURCES) {
      const batch = sources.slice(i, i + MAX_CONCURRENT_SOURCES);
      const batchResults = await Promise.all(
        batch.map((source) => {
          const sourceDescription = source.path ?? source.url ?? 'unknown source';
          return processSourcePages(source, sourceDescription, options);
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
