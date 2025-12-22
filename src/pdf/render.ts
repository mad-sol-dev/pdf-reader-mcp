import fs from 'node:fs/promises';
import type * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { NodeCanvasFactory } from './canvasFactory.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Renderer');

const DEBUG_LOG_PATH = '/tmp/pdf-render-debug.log';

async function debugLog(message: string, data?: unknown): Promise<void> {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n${data ? JSON.stringify(data, null, 2) : ''}\n\n`;
  await fs.appendFile(DEBUG_LOG_PATH, logEntry).catch(() => {});
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
  await debugLog('=== START renderPageToPng ===', { pageNum, scale });

  try {
    await debugLog('Getting page from document');
    const page = await pdfDocument.getPage(pageNum);

    await debugLog('Getting viewport');
    const viewport = page.getViewport({ scale });
    await debugLog('Viewport created', { width: viewport.width, height: viewport.height });

    await debugLog('Creating canvas factory');
    const canvasFactory = new NodeCanvasFactory();

    await debugLog('Creating canvas');
    const { canvas, context } = canvasFactory.create(viewport.width, viewport.height);
    await debugLog('Canvas created', {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      contextType: typeof context,
    });

    const renderContext = {
      canvasContext: context,
      viewport,
      canvasFactory,
    } as Parameters<pdfjsLib.PDFPageProxy['render']>[0];

    await debugLog('Starting page.render()');

    try {
      await page.render(renderContext).promise;
      await debugLog('page.render() completed successfully');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      await debugLog('ERROR in page.render()', { message, stack, error });
      logger.error('Error rendering page', { pageNum, error: message });
      throw error;
    }

    await debugLog('Encoding canvas to PNG');
    const pngBuffer = await canvas.encode('png');
    await debugLog('PNG encoding completed', { bufferLength: pngBuffer.length });

    canvasFactory.destroy({ canvas, context });
    await debugLog('Canvas destroyed');

    const result = {
      width: Math.ceil(viewport.width),
      height: Math.ceil(viewport.height),
      scale,
      data: pngBuffer.toString('base64'),
    };

    await debugLog('=== END renderPageToPng SUCCESS ===');
    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    await debugLog('=== END renderPageToPng ERROR ===', { message, stack, error });
    throw error;
  }
};
