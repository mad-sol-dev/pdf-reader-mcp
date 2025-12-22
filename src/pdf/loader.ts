// PDF document loading utilities

import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import type * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ErrorCode, PdfError } from '../utils/errors.js';
import { createLogger } from '../utils/logger.js';
import { resolvePath } from '../utils/pathUtils.js';

const logger = createLogger('Loader');

// Resolve CMap path relative to pdfjs-dist package location
// This ensures CMap files are found regardless of the current working directory
const require = createRequire(import.meta.url);
const CMAP_URL = require.resolve('pdfjs-dist/package.json').replace('package.json', 'cmaps/');

// Maximum PDF file size: 100MB
// Prevents memory exhaustion from loading extremely large files
const MAX_PDF_SIZE = 100 * 1024 * 1024;

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_READ_TIMEOUT_MS = 15_000;

type LoadPdfOptions = {
  allowedProtocols?: string[];
  maxBytes?: number;
  requestTimeoutMs?: number;
  readTimeoutMs?: number;
};

const fetchPdfBytes = async (
  url: string,
  sourceDescription: string,
  options: LoadPdfOptions
): Promise<Uint8Array> => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (err: unknown) {
    throw new PdfError(
      ErrorCode.InvalidParams,
      `Invalid URL for ${sourceDescription}. Reason: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const allowedProtocols = options.allowedProtocols ?? [];
  if (allowedProtocols.length > 0 && !allowedProtocols.includes(parsedUrl.protocol)) {
    throw new PdfError(
      ErrorCode.InvalidRequest,
      `URL protocol '${parsedUrl.protocol}' is not allowed for ${sourceDescription}.`
    );
  }

  const maxBytes = options.maxBytes ?? MAX_PDF_SIZE;
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const readTimeoutMs = options.readTimeoutMs ?? DEFAULT_READ_TIMEOUT_MS;

  const controller = new AbortController();
  let requestTimedOut = false;
  const requestTimeoutId = setTimeout(() => {
    requestTimedOut = true;
    controller.abort();
  }, requestTimeoutMs);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err: unknown) {
    clearTimeout(requestTimeoutId);
    if (requestTimedOut) {
      throw new PdfError(
        ErrorCode.InvalidRequest,
        `Timed out requesting PDF from ${sourceDescription} after ${requestTimeoutMs}ms.`
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new PdfError(
      ErrorCode.InvalidRequest,
      `Failed to fetch PDF from ${sourceDescription}. Reason: ${message}`
    );
  }

  clearTimeout(requestTimeoutId);

  if (!response.ok) {
    throw new PdfError(
      ErrorCode.InvalidRequest,
      `Failed to fetch PDF from ${sourceDescription}. Status: ${response.status} ${response.statusText}`.trim()
    );
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    const contentLengthBytes = Number.parseInt(contentLength, 10);
    if (Number.isFinite(contentLengthBytes) && contentLengthBytes > maxBytes) {
      controller.abort();
      throw new PdfError(
        ErrorCode.InvalidRequest,
        `PDF download exceeds maximum size of ${maxBytes} bytes. Reported content length: ${contentLengthBytes} bytes.`
      );
    }
  }

  if (!response.body) {
    throw new PdfError(
      ErrorCode.InvalidRequest,
      `Failed to fetch PDF from ${sourceDescription}. Reason: Response body is empty.`
    );
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  let readTimedOut = false;
  let readTimeoutId: NodeJS.Timeout | null = null;

  const resetReadTimeout = () => {
    if (readTimeoutId) {
      clearTimeout(readTimeoutId);
    }
    readTimeoutId = setTimeout(() => {
      readTimedOut = true;
      void reader.cancel('read timeout');
      controller.abort();
    }, readTimeoutMs);
  };

  try {
    resetReadTimeout();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        receivedBytes += value.length;
        if (receivedBytes > maxBytes) {
          await reader.cancel('max size exceeded');
          controller.abort();
          throw new PdfError(
            ErrorCode.InvalidRequest,
            `PDF download exceeds maximum size of ${maxBytes} bytes. Received ${receivedBytes} bytes.`
          );
        }
        chunks.push(value);
        resetReadTimeout();
      }
    }
    if (readTimedOut) {
      throw new PdfError(
        ErrorCode.InvalidRequest,
        `Timed out reading PDF from ${sourceDescription} after ${readTimeoutMs}ms without new data.`
      );
    }
  } catch (err: unknown) {
    if (readTimeoutId) {
      clearTimeout(readTimeoutId);
    }
    if (readTimedOut) {
      throw new PdfError(
        ErrorCode.InvalidRequest,
        `Timed out reading PDF from ${sourceDescription} after ${readTimeoutMs}ms without new data.`
      );
    }
    if (err instanceof PdfError) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new PdfError(
        ErrorCode.InvalidRequest,
        `Failed to fetch PDF from ${sourceDescription}. Reason: download aborted.`
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new PdfError(
      ErrorCode.InvalidRequest,
      `Failed to fetch PDF from ${sourceDescription}. Reason: ${message}`
    );
  } finally {
    if (readTimeoutId) {
      clearTimeout(readTimeoutId);
    }
  }

  const buffer = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  return buffer;
};

/**
 * Load a PDF document from a local file path or URL
 * @param source - Object containing either path or url
 * @param sourceDescription - Description for error messages
 * @returns PDF document proxy
 */
export const loadPdfDocument = async (
  source: { path?: string | undefined; url?: string | undefined },
  sourceDescription: string,
  options: LoadPdfOptions = {}
): Promise<pdfjsLib.PDFDocumentProxy> => {
  let pdfDataSource: Uint8Array;

  try {
    if (source.path) {
      const safePath = resolvePath(source.path);
      const buffer = await fs.readFile(safePath);

      // Security: Check file size to prevent memory exhaustion
      if (buffer.length > MAX_PDF_SIZE) {
        throw new PdfError(
          ErrorCode.InvalidRequest,
          `PDF file exceeds maximum size of ${MAX_PDF_SIZE} bytes (${(MAX_PDF_SIZE / 1024 / 1024).toFixed(0)}MB). File size: ${buffer.length} bytes.`
        );
      }

      pdfDataSource = new Uint8Array(buffer);
    } else if (source.url) {
      pdfDataSource = await fetchPdfBytes(source.url, sourceDescription, options);
    } else {
      throw new PdfError(
        ErrorCode.InvalidParams,
        `Source ${sourceDescription} missing 'path' or 'url'.`
      );
    }
  } catch (err: unknown) {
    if (err instanceof PdfError) {
      throw err;
    }

    const message = err instanceof Error ? err.message : String(err);
    const errorCode = ErrorCode.InvalidRequest;

    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      err.code === 'ENOENT' &&
      source.path
    ) {
      throw new PdfError(errorCode, `File not found at '${source.path}'.`, {
        cause: err instanceof Error ? err : undefined,
      });
    }

    throw new PdfError(
      errorCode,
      `Failed to prepare PDF source ${sourceDescription}. Reason: ${message}`,
      { cause: err instanceof Error ? err : undefined }
    );
  }

  const loadingTask = getDocument({
    data: pdfDataSource,
    cMapUrl: CMAP_URL,
    cMapPacked: true,
  });

  try {
    return await loadingTask.promise;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('PDF.js loading error', { sourceDescription, error: message });
    throw new PdfError(
      ErrorCode.InvalidRequest,
      `Failed to load PDF document from ${sourceDescription}. Reason: ${message || 'Unknown loading error'}`,
      { cause: err instanceof Error ? err : undefined }
    );
  }
};
