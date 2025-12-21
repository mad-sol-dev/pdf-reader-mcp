import { text, tool, toolError } from '@sylphx/mcp-server-sdk';
import type * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { getTocArgsSchema } from '../schemas/getToc.js';
import type { PdfSource } from '../schemas/pdfSource.js';
import type { PdfSourceTocResult, PdfTocItem } from '../types/pdf.js';
import { createLogger } from '../utils/logger.js';
import { withPdfDocument } from '../utils/pdfLifecycle.js';

type OutlineEntry = {
  title?: string;
  dest?: unknown;
  items?: OutlineEntry[] | null;
};

const logger = createLogger('GetToc');

const resolvePageNumber = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  destination: unknown,
  sourceDescription: string
): Promise<number | undefined> => {
  try {
    let destToUse = destination;

    if (typeof destination === 'string') {
      destToUse = await pdfDocument.getDestination(destination);
      if (!destToUse) {
        return undefined;
      }
    }

    if (Array.isArray(destToUse) && destToUse[0] !== undefined) {
      const pageIndex = await pdfDocument.getPageIndex(destToUse[0] as never);
      return pageIndex + 1;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Error resolving outline destination', { sourceDescription, error: message });
  }

  return undefined;
};

const flattenOutline = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  outlineItems: OutlineEntry[] | null,
  sourceDescription: string
): Promise<PdfTocItem[]> => {
  if (!outlineItems || outlineItems.length === 0) {
    return [];
  }

  const items: PdfTocItem[] = [];

  for (const item of outlineItems) {
    const page = await resolvePageNumber(pdfDocument, item.dest, sourceDescription);
    const tocItem: PdfTocItem = {
      title: item.title ?? 'Untitled',
      depth: 0,
      ...(page !== undefined ? { page } : {}),
    };

    items.push(tocItem);

    if (item.items && item.items.length > 0) {
      const childItems = await flattenOutline(
        pdfDocument,
        item.items as OutlineEntry[],
        sourceDescription
      );
      items.push(...childItems.map((child) => ({ ...child, depth: child.depth + 1 })));
    }
  }

  return items;
};

const buildLoadArgs = (source: PdfSource) => ({
  ...(source.path ? { path: source.path } : {}),
  ...(source.url ? { url: source.url } : {}),
});

const buildTocResult = (
  sourceDescription: string,
  outline: OutlineEntry[] | null,
  tocItems: PdfTocItem[]
): PdfSourceTocResult => ({
  source: sourceDescription,
  success: true,
  data: {
    has_outline: Boolean(outline && outline.length > 0),
    toc: tocItems,
  },
});

const processToc = async (
  source: PdfSource,
  sourceDescription: string
): Promise<PdfSourceTocResult> => {
  const loadArgs = buildLoadArgs(source);

  try {
    const { outline, tocItems } = await withPdfDocument(
      loadArgs,
      sourceDescription,
      async (pdfDocument) => {
        const outline = await pdfDocument.getOutline();
        const tocItems = await flattenOutline(pdfDocument, outline, sourceDescription);
        return { outline, tocItems };
      }
    );

    return buildTocResult(sourceDescription, outline, tocItems);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      source: sourceDescription,
      success: false,
      error: `Failed to load table of contents for ${sourceDescription}. Reason: ${message}`,
    };
  }
};

export const pdfGetToc = tool()
  .description('Retrieves the table of contents / outline entries for one or more PDFs.')
  .input(getTocArgsSchema)
  .handler(async ({ input }) => {
    const { sources } = input;
    const MAX_CONCURRENT_SOURCES = 3;

    const results: PdfSourceTocResult[] = [];

    for (let i = 0; i < sources.length; i += MAX_CONCURRENT_SOURCES) {
      const batch = sources.slice(i, i + MAX_CONCURRENT_SOURCES);
      const batchResults = await Promise.all(
        batch.map((source) => {
          const sourceDescription = source.path ?? source.url ?? 'unknown source';
          return processToc(source, sourceDescription);
        })
      );

      results.push(...batchResults);
    }

    if (results.every((r) => !r.success)) {
      const errors = results.map((r) => r.error).join('; ');
      return toolError(`All sources failed to return TOC data: ${errors}`);
    }

    return [text(JSON.stringify({ results }, null, 2))];
  });
