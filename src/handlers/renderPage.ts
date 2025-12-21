import { image, text, tool, toolError } from '@sylphx/mcp-server-sdk';
import { renderPageToPng } from '../pdf/render.js';
import { renderPageArgsSchema } from '../schemas/renderPage.js';
import { getDocumentFingerprint } from '../utils/fingerprint.js';
import { createLogger } from '../utils/logger.js';
import { withPdfDocument } from '../utils/pdfLifecycle.js';

const logger = createLogger('RenderPage');

const renderTargetPage = async (
  source: { path?: string; url?: string },
  sourceDescription: string,
  page: number,
  scale?: number
): Promise<{ metadata: object; imageData: string }> => {
  return withPdfDocument(source, sourceDescription, async (pdfDocument) => {
    const totalPages = pdfDocument.numPages;

    if (page < 1 || page > totalPages) {
      throw new Error(`Requested page ${page} is out of bounds (1-${totalPages}).`);
    }

    const fingerprint = getDocumentFingerprint(pdfDocument, sourceDescription);
    const rendered = await renderPageToPng(pdfDocument, page, scale ?? 1.5);

    return {
      metadata: {
        page,
        width: rendered.width,
        height: rendered.height,
        scale: rendered.scale,
        fingerprint,
      },
      imageData: rendered.data,
    };
  });
};

export const pdfRenderPage = tool()
  .description('Rasterize a PDF page to PNG and return metadata plus base64 image content.')
  .input(renderPageArgsSchema)
  .handler(async ({ input }) => {
    const { source, page, scale } = input;
    const sourceDescription = source.path ?? source.url ?? 'unknown source';
    const normalizedSource = {
      ...(source.path ? { path: source.path } : {}),
      ...(source.url ? { url: source.url } : {}),
    };

    try {
      const result = await renderTargetPage(normalizedSource, sourceDescription, page, scale);
      return [text(JSON.stringify(result.metadata, null, 2)), image(result.imageData, 'image/png')];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to render page', { sourceDescription, page, error: message });
      return toolError(`Failed to render page from ${sourceDescription}. Reason: ${message}`);
    }
  });
