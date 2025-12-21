import { text, tool, toolError } from '@sylphx/mcp-server-sdk';
import type * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractMetadataAndPageCount } from '../pdf/extractor.js';
import { getMetadataArgsSchema } from '../schemas/getMetadata.js';
import type { PdfSource } from '../schemas/pdfSource.js';
import type { PdfMetadataSummary, PdfSourceMetadataResult, PdfSourceResult } from '../types/pdf.js';
import { createLogger } from '../utils/logger.js';
import { withPdfDocument } from '../utils/pdfLifecycle.js';

const logger = createLogger('GetMetadata');

const buildLoadArgs = (source: PdfSource) => ({
  ...(source.path ? { path: source.path } : {}),
  ...(source.url ? { url: source.url } : {}),
});

const getFingerprint = (pdfDocument: pdfjsLib.PDFDocumentProxy): string | undefined =>
  (pdfDocument as unknown as { fingerprint?: string }).fingerprint ??
  (pdfDocument as unknown as { fingerprints?: string[] }).fingerprints?.[0];

const resolvePageLabels = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  sourceDescription: string,
  includePageLabels: boolean
): Promise<{ hasPageLabels?: boolean; samplePageLabels?: string[] }> => {
  if (!includePageLabels) {
    return {};
  }

  try {
    const labels = await pdfDocument.getPageLabels();
    if (!labels) {
      return { hasPageLabels: false };
    }

    const uniqueLabels = Array.from(new Set(labels.filter((label) => label !== null)));
    return {
      hasPageLabels: true,
      samplePageLabels: uniqueLabels.slice(0, 5) as string[],
    };
  } catch (labelError: unknown) {
    const message = labelError instanceof Error ? labelError.message : String(labelError);
    logger.warn('Error checking page labels', { sourceDescription, error: message });
  }

  return {};
};

const resolveOutline = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  sourceDescription: string,
  includeOutline: boolean
): Promise<boolean | undefined> => {
  if (!includeOutline) {
    return undefined;
  }

  try {
    const outline = await pdfDocument.getOutline();
    return Boolean(outline && outline.length > 0);
  } catch (outlineError: unknown) {
    const message = outlineError instanceof Error ? outlineError.message : String(outlineError);
    logger.warn('Error checking outline', { sourceDescription, error: message });
  }

  return undefined;
};

const buildMetadataSummary = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  sourceDescription: string,
  options: {
    includeMetadata: boolean;
    includePageCount: boolean;
    includePageLabels: boolean;
    includeOutline: boolean;
  }
): Promise<PdfMetadataSummary> => {
  const metadata = await extractMetadataAndPageCount(
    pdfDocument,
    options.includeMetadata,
    options.includePageCount
  );
  const fingerprint = getFingerprint(pdfDocument);
  const { hasPageLabels, samplePageLabels } = await resolvePageLabels(
    pdfDocument,
    sourceDescription,
    options.includePageLabels
  );
  const hasOutline = await resolveOutline(pdfDocument, sourceDescription, options.includeOutline);

  return {
    ...metadata,
    ...(fingerprint ? { fingerprint } : {}),
    ...(hasPageLabels !== undefined ? { has_page_labels: hasPageLabels } : {}),
    ...(hasOutline !== undefined ? { has_outline: hasOutline } : {}),
    ...(samplePageLabels ? { sample_page_labels: samplePageLabels } : {}),
  } satisfies PdfMetadataSummary;
};

const processMetadata = async (
  source: PdfSource,
  sourceDescription: string,
  options: {
    includeMetadata: boolean;
    includePageCount: boolean;
    includePageLabels: boolean;
    includeOutline: boolean;
  }
): Promise<PdfSourceResult | PdfSourceMetadataResult> => {
  const loadArgs = buildLoadArgs(source);

  try {
    const metadataSummary = await withPdfDocument(loadArgs, sourceDescription, (pdfDocument) =>
      buildMetadataSummary(pdfDocument, sourceDescription, options)
    );

    return { source: sourceDescription, success: true, data: metadataSummary };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      source: sourceDescription,
      success: false,
      error: `Failed to load metadata for ${sourceDescription}. Reason: ${message}`,
    };
  }
};

export const pdfGetMetadata = tool()
  .description('Retrieves document metadata and basic info for one or more PDFs.')
  .input(getMetadataArgsSchema)
  .handler(async ({ input }) => {
    const { sources, include_metadata, include_page_count, include_page_labels, include_outline } =
      input;
    const includeMetadata = include_metadata ?? true;
    const includePageCount = include_page_count ?? true;
    const includePageLabels = include_page_labels ?? true;
    const includeOutline = include_outline ?? true;
    const MAX_CONCURRENT_SOURCES = 3;

    const results: Array<PdfSourceResult | PdfSourceMetadataResult> = [];

    for (let i = 0; i < sources.length; i += MAX_CONCURRENT_SOURCES) {
      const batch = sources.slice(i, i + MAX_CONCURRENT_SOURCES);
      const batchResults = await Promise.all(
        batch.map((source) => {
          const sourceDescription = source.path ?? source.url ?? 'unknown source';
          return processMetadata(source, sourceDescription, {
            includeMetadata,
            includePageCount,
            includePageLabels,
            includeOutline,
          });
        })
      );

      results.push(...batchResults);
    }

    if (results.every((r) => !r.success)) {
      const errors = results.map((r) => r.error).join('; ');
      return toolError(`All sources failed to return metadata: ${errors}`);
    }

    return [text(JSON.stringify({ results }, null, 2))];
  });
