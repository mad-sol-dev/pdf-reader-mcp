import fs from 'node:fs/promises';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPdfDocument } from '../../src/pdf/loader.js';
import { ErrorCode, PdfError } from '../../src/utils/errors.js';
import * as pathUtils from '../../src/utils/pathUtils.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
  },
}));

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: vi.fn(),
}));

vi.mock('../../src/utils/pathUtils.js', () => ({
  resolvePath: vi.fn(),
}));

const createReadableStream = (
  chunks: Uint8Array[],
  options: { delayMs?: number; onCancel?: (reason?: unknown) => void } = {}
) =>
  new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (chunks.length === 0) {
        controller.close();
        return;
      }
      if (options.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      }
      const chunk = chunks.shift();
      if (chunk) {
        controller.enqueue(chunk);
      }
    },
    cancel(reason) {
      options.onCancel?.(reason);
    },
  });

describe('loader', () => {
  describe('loadPdfDocument', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockFetch.mockReset();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should load PDF from local file path', async () => {
      const mockBuffer = Buffer.from('fake pdf content');
      const mockDocument = { numPages: 5 };

      pathUtils.resolvePath.mockReturnValue('/safe/path/test.pdf');
      fs.readFile.mockResolvedValue(mockBuffer);
      pdfjsLib.getDocument.mockReturnValue({
        promise: Promise.resolve(mockDocument as unknown as pdfjsLib.PDFDocumentProxy),
      } as pdfjsLib.PDFDocumentLoadingTask);

      const result = await loadPdfDocument({ path: 'test.pdf' }, 'test.pdf');

      expect(result).toBe(mockDocument);
      expect(pathUtils.resolvePath).toHaveBeenCalledWith('test.pdf');
      expect(fs.readFile).toHaveBeenCalledWith('/safe/path/test.pdf');
    });

    it('should load PDF from URL', async () => {
      const mockDocument = { numPages: 3 };
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

      mockFetch.mockResolvedValue(
        new Response(createReadableStream([pdfBytes]), {
          status: 200,
          headers: { 'content-length': String(pdfBytes.length) },
        })
      );
      pdfjsLib.getDocument.mockReturnValue({
        promise: Promise.resolve(mockDocument as unknown as pdfjsLib.PDFDocumentProxy),
      } as pdfjsLib.PDFDocumentLoadingTask);

      const result = await loadPdfDocument({ url: 'https://example.com/test.pdf' }, 'https://example.com/test.pdf');

      expect(result).toBe(mockDocument);
      const callArgs = pdfjsLib.getDocument.mock.calls.at(-1)?.[0];
      expect(callArgs).toMatchObject({
        cMapUrl: expect.stringContaining('pdfjs-dist') && expect.stringContaining('cmaps'),
        cMapPacked: true,
      });
      expect(callArgs.data).toEqual(pdfBytes);
    });

    it('should throw PdfError when neither path nor url provided', async () => {
      await expect(loadPdfDocument({}, 'unknown')).rejects.toThrow(PdfError);
      await expect(loadPdfDocument({}, 'unknown')).rejects.toThrow("Source unknown missing 'path' or 'url'.");
    });

    it('should handle file not found error (ENOENT)', async () => {
      const enoentError = Object.assign(new Error('File not found'), { code: 'ENOENT' });

      pathUtils.resolvePath.mockReturnValue('/safe/path/missing.pdf');
      fs.readFile.mockRejectedValue(enoentError);

      await expect(loadPdfDocument({ path: 'missing.pdf' }, 'missing.pdf')).rejects.toThrow(PdfError);
      await expect(loadPdfDocument({ path: 'missing.pdf' }, 'missing.pdf')).rejects.toThrow(
        "File not found at 'missing.pdf'."
      );
    });

    it('should handle generic file read errors', async () => {
      pathUtils.resolvePath.mockReturnValue('/safe/path/error.pdf');
      fs.readFile.mockRejectedValue(new Error('Permission denied'));

      await expect(loadPdfDocument({ path: 'error.pdf' }, 'error.pdf')).rejects.toThrow(PdfError);
      await expect(loadPdfDocument({ path: 'error.pdf' }, 'error.pdf')).rejects.toThrow(
        'Failed to prepare PDF source error.pdf. Reason: Permission denied'
      );
    });

    it('should handle non-Error exceptions during file read', async () => {
      pathUtils.resolvePath.mockReturnValue('/safe/path/test.pdf');
      fs.readFile.mockRejectedValue('String error');

      await expect(loadPdfDocument({ path: 'test.pdf' }, 'test.pdf')).rejects.toThrow(
        'Failed to prepare PDF source test.pdf. Reason: String error'
      );
    });

    it('should handle PDF.js loading errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockBuffer = Buffer.from('fake pdf');

      pathUtils.resolvePath.mockReturnValue('/safe/path/bad.pdf');
      fs.readFile.mockResolvedValue(mockBuffer);
      pdfjsLib.getDocument.mockReturnValue({
        promise: Promise.reject(new Error('Invalid PDF')),
      } as pdfjsLib.PDFDocumentLoadingTask);

      await expect(loadPdfDocument({ path: 'bad.pdf' }, 'bad.pdf')).rejects.toThrow(PdfError);
      await expect(loadPdfDocument({ path: 'bad.pdf' }, 'bad.pdf')).rejects.toThrow(
        'Failed to load PDF document from bad.pdf. Reason: Invalid PDF'
      );

      // Logger outputs message first, then structured JSON
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('PDF.js loading error'));

      consoleErrorSpy.mockRestore();
    });

    it('should handle non-Error PDF.js loading exceptions', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const pdfBytes = new Uint8Array([0x25, 0x50]);

      mockFetch.mockResolvedValue(
        new Response(createReadableStream([pdfBytes]), {
          status: 200,
          headers: { 'content-length': String(pdfBytes.length) },
        })
      );
      pdfjsLib.getDocument.mockReturnValue({
        promise: Promise.reject('Unknown error'),
      } as pdfjsLib.PDFDocumentLoadingTask);

      await expect(
        loadPdfDocument({ url: 'https://example.com/bad.pdf' }, 'https://example.com/bad.pdf')
      ).rejects.toThrow('Failed to load PDF document from https://example.com/bad.pdf');

      consoleErrorSpy.mockRestore();
    });

    it('should propagate PdfError from resolvePath', async () => {
      const pdfError = new PdfError(ErrorCode.InvalidRequest, 'Path validation failed');
      pathUtils.resolvePath.mockImplementation(() => {
        throw pdfError;
      });

      await expect(loadPdfDocument({ path: 'test.pdf' }, 'test.pdf')).rejects.toThrow(pdfError);
    });

    it('should use fallback message when PDF.js error message is empty', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const pdfBytes = new Uint8Array([0x25, 0x50]);

      mockFetch.mockResolvedValue(
        new Response(createReadableStream([pdfBytes]), {
          status: 200,
          headers: { 'content-length': String(pdfBytes.length) },
        })
      );
      pdfjsLib.getDocument.mockReturnValue({
        promise: Promise.reject(new Error('')),
      } as pdfjsLib.PDFDocumentLoadingTask);

      await expect(
        loadPdfDocument({ url: 'https://example.com/bad.pdf' }, 'https://example.com/bad.pdf')
      ).rejects.toThrow('Unknown loading error');

      consoleErrorSpy.mockRestore();
    });

    it('should handle non-Error exception during file read with cause undefined', async () => {
      pathUtils.resolvePath.mockReturnValue('/safe/path/test.pdf');
      const nonErrorObject = { code: 'SOME_ERROR' };
      fs.readFile.mockRejectedValue(nonErrorObject);

      try {
        await loadPdfDocument({ path: 'test.pdf' }, 'test.pdf');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PdfError);
        // Verify that cause is undefined when error is not an Error instance
        expect((error as PdfError).cause).toBeUndefined();
      }
    });

    it('should abort oversized URL downloads and cancel the stream', async () => {
      const pdfBytes = [new Uint8Array([1, 2, 3, 4, 5, 6]), new Uint8Array([7, 8, 9, 10, 11, 12])];
      const cancelSpy = vi.fn();

      mockFetch.mockResolvedValue(
        new Response(createReadableStream([...pdfBytes], { onCancel: cancelSpy }), {
          status: 200,
        })
      );

      await expect(
        loadPdfDocument(
          { url: 'https://example.com/large.pdf' },
          'https://example.com/large.pdf',
          { maxBytes: 10, requestTimeoutMs: 500, readTimeoutMs: 500 }
        )
      ).rejects.toThrow('PDF download exceeds maximum size of 10 bytes');

      expect(cancelSpy).toHaveBeenCalled();
      expect(pdfjsLib.getDocument).not.toHaveBeenCalled();
    });

    it('should time out slow URL downloads and cancel the stream', async () => {
      vi.useFakeTimers();
      const cancelSpy = vi.fn();

      const slowStream = new ReadableStream<Uint8Array>({
        pull() {
          return new Promise(() => {});
        },
        cancel(reason) {
          cancelSpy(reason);
        },
      });

      mockFetch.mockResolvedValue(
        new Response(slowStream, {
          status: 200,
        })
      );

      const promise = loadPdfDocument(
        { url: 'https://example.com/slow.pdf' },
        'https://example.com/slow.pdf',
        { maxBytes: 10_000, requestTimeoutMs: 500, readTimeoutMs: 50 }
      );

      const assertion = expect(promise).rejects.toThrow(
        'Timed out reading PDF from https://example.com/slow.pdf'
      );

      await vi.advanceTimersByTimeAsync(60);

      await assertion;
      expect(cancelSpy).toHaveBeenCalled();
      expect(pdfjsLib.getDocument).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});
