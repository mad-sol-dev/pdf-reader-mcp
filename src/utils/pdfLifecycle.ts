import type * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { loadPdfDocument } from '../pdf/loader.js';
import { createLogger } from './logger.js';

const logger = createLogger('PdfLifecycle');

export const withPdfDocument = async <T>(
  source: { path?: string; url?: string },
  sourceDescription: string,
  handler: (pdfDocument: pdfjsLib.PDFDocumentProxy) => Promise<T>
): Promise<T> => {
  const pdfDocument = await loadPdfDocument(source, sourceDescription);

  try {
    return await handler(pdfDocument);
  } finally {
    if (typeof pdfDocument.destroy === 'function') {
      try {
        await pdfDocument.destroy();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn('Error destroying PDF document', { sourceDescription, error: message });
      }
    }
  }
};
