import type * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createLogger } from '../utils/logger.js';
import { NodeCanvasFactory } from './canvasFactory.js';

const logger = createLogger('Renderer');

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
  } as Parameters<pdfjsLib.PDFPageProxy['render']>[0];

  try {
    await page.render(renderContext).promise;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error rendering page', { pageNum, error: message });
    throw error;
  }

  const pngBuffer = await canvas.encode('png');
  canvasFactory.destroy({ canvas, context });

  return {
    width: Math.ceil(viewport.width),
    height: Math.ceil(viewport.height),
    scale,
    data: pngBuffer.toString('base64'),
  };
};
