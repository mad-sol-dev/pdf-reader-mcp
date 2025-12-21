import { createCanvas } from 'canvas';
import type * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Renderer');

interface CanvasAndContext {
  canvas: ReturnType<typeof createCanvas>;
  context: ReturnType<ReturnType<typeof createCanvas>['getContext']>;
}

class NodeCanvasFactory {
  create(width: number, height: number): CanvasAndContext {
    const safeWidth = Math.ceil(width);
    const safeHeight = Math.ceil(height);
    const canvas = createCanvas(safeWidth, safeHeight);
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Failed to create canvas rendering context');
    }

    return { canvas, context };
  }

  destroy(canvasAndContext: CanvasAndContext): void {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}

export interface RenderedPageImage {
  width: number;
  height: number;
  scale: number;
  data: string;
}

export const renderPageToPng = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  scale = 1.5
): Promise<RenderedPageImage> => {
  const page = await pdfDocument.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvasFactory = new NodeCanvasFactory();
  const { canvas, context } = canvasFactory.create(viewport.width, viewport.height);

  const renderContext = {
    canvasContext: context,
    viewport,
    canvasFactory,
  } satisfies pdfjsLib.PDFRenderParameters;

  try {
    await page.render(renderContext).promise;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error rendering page', { pageNum, error: message });
    throw error;
  }

  const pngBuffer = canvas.toBuffer('image/png');
  canvasFactory.destroy({ canvas, context });

  return {
    width: Math.ceil(viewport.width),
    height: Math.ceil(viewport.height),
    scale,
    data: pngBuffer.toString('base64'),
  };
};
