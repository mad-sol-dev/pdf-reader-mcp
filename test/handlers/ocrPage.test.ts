import { type Schema, safeParse } from '@sylphx/vex';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCache } from '../../src/utils/cache.js';

const mockRenderPageToPng = vi.fn();
const mockPerformOcr = vi.fn();
const mockWithPdfDocument = vi.fn();

vi.mock('../../src/pdf/render.js', () => ({
  renderPageToPng: mockRenderPageToPng,
}));

vi.mock('../../src/utils/pdfLifecycle.js', () => ({
  withPdfDocument: mockWithPdfDocument,
}));

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  OPS: {
    paintImageXObject: 89,
    paintXObject: 92,
  },
}));

vi.mock('../../src/utils/ocr.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils/ocr.js')>('../../src/utils/ocr.js');
  return {
    ...actual,
    performOcr: mockPerformOcr,
  };
});

const buildPage = (imageCount = 0, text = '') => ({
  getOperatorList: vi.fn().mockResolvedValue({
    fnArray: Array(imageCount).fill(89),
  }),
  getTextContent: vi.fn().mockResolvedValue({
    items: [{ str: text, transform: [1, 0, 0, 1, 0, 0] }],
  }),
});

interface HandlerResultContent {
  type: string;
  text: string;
}

let handler: (args: unknown) => Promise<{ content: HandlerResultContent[] }>;
let ocrSchema: Schema<unknown>;
let decideNeedsOcr: typeof import('../../src/handlers/ocrPage.js')['decideNeedsOcr'];
let fingerprintCounter = 0;

beforeAll(async () => {
  const ocrModule = await import('../../src/handlers/ocrPage.js');
  const { ocrPageArgsSchema } = await import('../../src/schemas/ocr.js');
  decideNeedsOcr = ocrModule.decideNeedsOcr;
  ocrSchema = ocrPageArgsSchema as Schema<unknown>;

  handler = async (args: unknown) => {
    const parseResult = safeParse(ocrSchema)(args);
    if (!parseResult.success) {
      throw new Error(`Invalid arguments: ${parseResult.error}`);
    }
    const parsedArgs = parseResult.data;
    const result = await ocrModule.pdfOcrPage.handler({ input: parsedArgs, ctx: {} as unknown });
    if (Array.isArray(result)) {
      return {
        content: result.map((item) => {
          if ('text' in item) return { type: 'text', text: item.text };
          return item;
        }),
      };
    }
    return result as { content: HandlerResultContent[] };
  };
});

beforeEach(() => {
  clearCache('all');
  mockRenderPageToPng.mockReset();
  mockPerformOcr.mockReset();
  mockWithPdfDocument.mockReset();
  fingerprintCounter += 1;
});

describe('decideNeedsOcr heuristics', () => {
  it('requires OCR for short extracted text', async () => {
    const page = buildPage(0) as unknown as Parameters<typeof decideNeedsOcr>[0];
    const decision = await decideNeedsOcr(page, 'Too short');
    expect(decision).toEqual({ needsOcr: true, reason: 'text_too_short' });
  });

  it('skips OCR for long extracted text', async () => {
    const page = buildPage(0) as unknown as Parameters<typeof decideNeedsOcr>[0];
    const decision = await decideNeedsOcr(page, 'a'.repeat(1101));
    expect(decision).toEqual({ needsOcr: false, reason: 'text_too_long' });
  });

  it('requires OCR when non-ASCII ratio is high', async () => {
    const page = buildPage(0) as unknown as Parameters<typeof decideNeedsOcr>[0];
    const decision = await decideNeedsOcr(page, '\u00e9'.repeat(60));
    expect(decision).toEqual({ needsOcr: true, reason: 'non_ascii_ratio_high' });
  });

  it('requires OCR for high image-to-text ratio', async () => {
    const page = buildPage(10) as unknown as Parameters<typeof decideNeedsOcr>[0];
    const decision = await decideNeedsOcr(page, 'a'.repeat(200));
    expect(decision).toEqual({ needsOcr: true, reason: 'image_text_ratio_high' });
  });
});

describe('smart_ocr flag', () => {
  it('skips OCR when smart_ocr decision says no', async () => {
    const text = 'a'.repeat(1201);
    const page = buildPage(0, text);
    const mockPdfDocument = {
      numPages: 1,
      fingerprints: [`fingerprint-${String(fingerprintCounter)}`],
      getPage: vi.fn().mockResolvedValue(page),
      destroy: vi.fn(),
    };

    mockWithPdfDocument.mockImplementation(async (_source, _desc, handlerFn) => handlerFn(mockPdfDocument));
    mockRenderPageToPng.mockResolvedValue({
      width: 100,
      height: 100,
      scale: 1.5,
      data: 'rendered',
    });

    const result = await handler({ source: { path: 'test.pdf' }, page: 1, smart_ocr: true });
    const payload = JSON.parse(result.content[0].text) as {
      data: { skipped?: boolean; reason?: string };
    };

    expect(payload.data.skipped).toBe(true);
    expect(payload.data.reason).toBe('text_too_long');
    expect(mockPerformOcr).not.toHaveBeenCalled();
  });

  it('runs OCR when smart_ocr is disabled', async () => {
    const text = 'a'.repeat(200);
    const page = buildPage(0, text);
    const mockPdfDocument = {
      numPages: 1,
      fingerprints: [`fingerprint-${String(fingerprintCounter)}`],
      getPage: vi.fn().mockResolvedValue(page),
      destroy: vi.fn(),
    };

    mockWithPdfDocument.mockImplementation(async (_source, _desc, handlerFn) => handlerFn(mockPdfDocument));
    mockRenderPageToPng.mockResolvedValue({
      width: 100,
      height: 100,
      scale: 1.5,
      data: 'rendered',
    });
    mockPerformOcr.mockResolvedValue({ provider: 'mock', text: 'OCR text' });

    const result = await handler({ source: { path: 'test.pdf' }, page: 1, smart_ocr: false, cache: false });
    const payload = JSON.parse(result.content[0].text) as {
      data: { skipped?: boolean; text?: string };
    };

    expect(payload.data.skipped).toBeUndefined();
    expect(mockPerformOcr).toHaveBeenCalledOnce();
  });
});
