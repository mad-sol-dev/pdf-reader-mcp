import { createCanvas, type Canvas } from '@napi-rs/canvas';

interface CanvasAndContext {
  canvas: Canvas;
  // biome-ignore lint/suspicious/noExplicitAny: PDF.js expects a specific canvas context type that conflicts with @napi-rs/canvas types
  context: any; // Using any to avoid stricter typing conflicts with PDF.js
}

/**
 * NodeCanvasFactory for PDF.js to use with @napi-rs/canvas
 * This factory is shared across document loading and rendering to ensure
 * all canvas operations use the same canvas implementation.
 */
export class NodeCanvasFactory {
  create(width: number, height: number): CanvasAndContext {
    // Ensure strict integer dimensions to prevent napi errors
    const safeWidth = Math.floor(Math.max(1, width));
    const safeHeight = Math.floor(Math.max(1, height));

    const canvas = createCanvas(safeWidth, safeHeight);
    const context = canvas.getContext('2d');

    return { canvas, context };
  }

  reset(canvasAndContext: CanvasAndContext, width: number, height: number): void {
    const safeWidth = Math.floor(Math.max(1, width));
    const safeHeight = Math.floor(Math.max(1, height));
    canvasAndContext.canvas.width = safeWidth;
    canvasAndContext.canvas.height = safeHeight;
  }

  destroy(canvasAndContext: CanvasAndContext): void {
    // @napi-rs/canvas handles memory quite well, manual nulling hints GC
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    // biome-ignore lint/suspicious/noExplicitAny: Type cast needed to null the canvas reference for GC
    (canvasAndContext.canvas as any) = null;
    canvasAndContext.context = null;
  }
}
