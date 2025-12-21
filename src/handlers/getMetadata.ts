import { text, tool, toolError } from '@sylphx/mcp-server-sdk';
import type * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractMetadataAndPageCount } from '../pdf/extractor.js';
import { loadPdfDocument } from '../pdf/loader.js';
import { getMetadataArgsSchema } from '../schemas/getMetadata.js';
import type { PdfSource } from '../schemas/pdfSource.js';
import type {
  PdfMetadataSummary,
  PdfSourceMetadataResult,
  PdfSourceResult,
} from '../types/pdf.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('GetMetadata');

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
  let pdfDocument: pdfjsLib.PDFDocumentProxy | null = null;
  let result: PdfSourceMetadataResult = { source: sourceDescription, success: false };

  try {
    const { pages: _pages, ...loadArgs } = source;
    pdfDocument = await loadPdfDocument(loadArgs, sourceDescription);
    const metadata = await extractMetadataAndPageCount(
      pdfDocument,
      options.includeMetadata,
      options.includePageCount
    );
    const fingerprint =
      (pdfDocument as unknown as { fingerprint?: string }).fingerprint ??
      (pdfDocument as unknown as { fingerprints?: string[] }).fingerprints?.[0];

    let hasPageLabels: boolean | undefined;
    let samplePageLabels: string[] | undefined;
    if (options.includePageLabels) {
      try {
        const labels = await pdfDocument.getPageLabels();
        hasPageLabels = labels !== null;
        if (labels) {
          const uniqueLabels = Array.from(new Set(labels.filter((label) => label !== null)));
          samplePageLabels = uniqueLabels.slice(0, 5) as string[];
        }
      } catch (labelError: unknown) {
        const message = labelError instanceof Error ? labelError.message : String(labelError);
        logger.warn('Error checking page labels', { sourceDescription, error: message });
      }
    }

    let hasOutline: boolean | undefined;
    if (options.includeOutline) {
      try {
        const outline = await pdfDocument.getOutline();
        hasOutline = Boolean(outline && outline.length > 0);
      } catch (outlineError: unknown) {
        const message = outlineError instanceof Error ? outlineError.message : String(outlineError);
        logger.warn('Error checking outline', { sourceDescription, error: message });
      }
    }

    const metadataSummary: PdfMetadataSummary = {
      ...metadata,
      fingerprint,
      has_page_labels: hasPageLabels,
      has_outline: hasOutline,
      sample_page_labels: samplePageLabels,
    };

    result = { source: sourceDescription, success: true, data: metadataSummary };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    result = {
      source: sourceDescription,
      success: false,
      error: `Failed to load metadata for ${sourceDescription}. Reason: ${message}`,
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

export const pdfGetMetadata = tool()
  .description('Retrieves document metadata and basic info for one or more PDFs.')
  .input(getMetadataArgsSchema)
  .handler(async ({ input }) => {
    const { sources, include_metadata, include_page_count, include_page_labels, include_outline } = input;
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
