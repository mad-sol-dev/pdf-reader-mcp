import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pdfGetPageStats } from '../../src/handlers/getPageStats.js';
import { pdfListImages } from '../../src/handlers/listImages.js';
import { pdfReadPages } from '../../src/handlers/readPages.js';
import { DEFAULT_SAMPLE_PAGE_LIMIT } from '../../src/pdf/parser.js';

const {
  mockExtractPageContent,
  mockExtractImages,
  mockLoadPdfDocument,
  mockGetCachedPageText,
  mockSetCachedPageText,
  mockFingerprint,
} = vi.hoisted(() => ({
  mockExtractPageContent: vi.fn(),
  mockExtractImages: vi.fn(),
  mockLoadPdfDocument: vi.fn(),
  mockGetCachedPageText: vi.fn(),
  mockSetCachedPageText: vi.fn(),
  mockFingerprint: vi.fn(),
}));

vi.mock('../../src/pdf/loader.js', () => ({
  loadPdfDocument: mockLoadPdfDocument,
}));

vi.mock('../../src/pdf/extractor.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/pdf/extractor.js')>('../../src/pdf/extractor.js');
  return {
    ...actual,
    extractPageContent: mockExtractPageContent,
    extractImages: mockExtractImages,
  };
});

vi.mock('../../src/utils/cache.js', () => ({
  getCachedPageText: mockGetCachedPageText,
  setCachedPageText: mockSetCachedPageText,
}));

vi.mock('../../src/utils/fingerprint.js', () => ({
  getDocumentFingerprint: mockFingerprint,
}));

const createPdfDocument = (numPages: number) => ({
  numPages,
  getPageLabels: vi.fn().mockResolvedValue(null),
  destroy: vi.fn(),
});

const extractTextPayload = (result: unknown): string => {
  if (Array.isArray(result)) {
    const first = result[0];
    if (first && typeof first === 'object' && 'text' in first) {
      return (first as { text: string }).text;
    }
  }

  if (result && typeof result === 'object' && 'content' in (result as Record<string, unknown>)) {
    const content = (result as { content?: Array<{ text?: string }> }).content;
    if (Array.isArray(content) && content[0]?.text) {
      return content[0].text as string;
    }
  }

  throw new Error('Unexpected handler result');
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFingerprint.mockReturnValue('fingerprint');
  mockLoadPdfDocument.mockResolvedValue(createPdfDocument(12));
  mockGetCachedPageText.mockReturnValue(undefined);
  mockSetCachedPageText.mockImplementation(() => {});
  mockExtractImages.mockResolvedValue([{ page: 1, index: 0, width: 100, height: 100, format: 'png' }]);
  mockExtractPageContent.mockImplementation(async (_doc, pageNum: number) => [
    { type: 'text', yPosition: 0, textContent: `Page ${pageNum}` },
  ]);
});

describe('PDF handlers page guards', () => {
  it('samples readPages requests without explicit pages and surfaces a warning', async () => {
    const result = await pdfReadPages.handler({
      input: { sources: [{ path: 'doc.pdf' }] },
      ctx: {},
    });

    const payload = JSON.parse(extractTextPayload(result)) as {
      results: Array<{ data?: { pages?: Array<{ page_number: number }>; warnings?: string[] } }>;
    };
    const entry = payload.results[0]!;

    expect(mockExtractPageContent).toHaveBeenCalledTimes(DEFAULT_SAMPLE_PAGE_LIMIT);
    expect(entry.data?.pages).toHaveLength(DEFAULT_SAMPLE_PAGE_LIMIT);
    expect(entry.data?.warnings?.some((warning) => warning.includes('allow_full_document=true'))).toBe(true);
  });

  it('samples listImages when pages are omitted', async () => {
    const result = await pdfListImages.handler({
      input: { sources: [{ path: 'doc.pdf' }] },
      ctx: {},
    });

    const payload = JSON.parse(extractTextPayload(result)) as {
      results: Array<{ data?: { warnings?: string[] } }>;
    };
    const entry = payload.results[0]!;

    expect(mockExtractImages).toHaveBeenCalledWith(
      expect.objectContaining({ numPages: 12 }),
      Array.from({ length: DEFAULT_SAMPLE_PAGE_LIMIT }, (_, idx) => idx + 1)
    );
    expect(entry.data?.warnings?.some((warning) => warning.includes('allow_full_document=true'))).toBe(true);
  });

  it('samples getPageStats when pages are omitted', async () => {
    const result = await pdfGetPageStats.handler({
      input: { sources: [{ path: 'doc.pdf' }] },
      ctx: {},
    });

    const payload = JSON.parse(extractTextPayload(result)) as {
      results: Array<{ data?: { page_stats?: Array<{ page: number }>; warnings?: string[] } }>;
    };
    const entry = payload.results[0]!;

    expect(entry.data?.page_stats).toHaveLength(DEFAULT_SAMPLE_PAGE_LIMIT);
    expect(entry.data?.warnings?.some((warning) => warning.includes('allow_full_document=true'))).toBe(true);
  });

  it('continues to honor explicit page selections', async () => {
    const result = await pdfReadPages.handler({
      input: { sources: [{ path: 'doc.pdf', pages: [2, 4] }] },
      ctx: {},
    });

    const payload = JSON.parse(extractTextPayload(result)) as {
      results: Array<{ data?: { pages?: Array<{ page_number: number }>; warnings?: string[] } }>;
    };
    const entry = payload.results[0]!;

    expect(mockExtractPageContent.mock.calls.map((call) => call[1])).toEqual([2, 4]);
    expect(entry.data?.pages?.map((page) => page.page_number)).toEqual([2, 4]);
    expect(entry.data?.warnings).toBeUndefined();
  });
});
