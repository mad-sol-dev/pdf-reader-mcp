#!/usr/bin/env node

// Filter out DOMMatrix polyfill warnings from stdout (breaks MCP JSON)
// These warnings come from @napi-rs/canvas native module
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = ((
  chunk: string | Uint8Array,
  encodingOrCallback?: BufferEncoding | ((error?: Error) => void),
  callback?: (error?: Error) => void
) => {
  const str = chunk.toString();
  // Skip DOMMatrix warnings - redirect to stderr instead
  if (str.includes('Cannot polyfill') || str.includes('DOMMatrix')) {
    if (typeof encodingOrCallback === 'function') {
      process.stderr.write(chunk, encodingOrCallback);
    } else {
      process.stderr.write(chunk, encodingOrCallback as BufferEncoding, callback);
    }
    return true;
  }

  if (typeof encodingOrCallback === 'function') {
    return originalStdoutWrite(chunk, encodingOrCallback);
  }
  return originalStdoutWrite(chunk, encodingOrCallback, callback);
}) as typeof process.stdout.write;

// Load environment variables from .env file
import 'dotenv/config';

// IMPORTANT: Load polyfills first, before PDF.js
import './pdf/polyfills.js';

import { createServer, stdio } from '@sylphx/mcp-server-sdk';
import { pdfCacheClear, pdfCacheStats } from './handlers/cache.js';
import { pdfGetImage } from './handlers/getImage.js';
import { pdfGetMetadata } from './handlers/getMetadata.js';
import { pdfGetPageStats } from './handlers/getPageStats.js';
import { pdfGetToc } from './handlers/getToc.js';
import { pdfListImages } from './handlers/listImages.js';
import { pdfOcrImage } from './handlers/ocrImage.js';
import { pdfOcrPage } from './handlers/ocrPage.js';
import { pdfInfo } from './handlers/pdfInfo.js';
import { pdfRead } from './handlers/pdfRead.js';
import { readPdf } from './handlers/readPdf.js';
import { pdfRenderPage } from './handlers/renderPage.js';
import { pdfSearch } from './handlers/searchPdf.js';

const server = createServer({
  name: 'pdf-reader-mcp',
  version: '2.1.0',
  instructions:
    'PDF toolkit for MCP clients: retrieve metadata, compute page statistics, inspect TOCs, read structured pages, search text, extract text/images, rasterize pages, perform OCR with caching, and manage caches (read_pdf maintained for compatibility).',
  tools: {
    pdf_info: pdfInfo,
    pdf_get_metadata: pdfGetMetadata,
    pdf_get_page_stats: pdfGetPageStats,
    pdf_get_toc: pdfGetToc,
    pdf_list_images: pdfListImages,
    pdf_get_image: pdfGetImage,
    pdf_render_page: pdfRenderPage,
    pdf_ocr_page: pdfOcrPage,
    pdf_ocr_image: pdfOcrImage,
    pdf_cache_stats: pdfCacheStats,
    pdf_cache_clear: pdfCacheClear,
    pdf_read: pdfRead,
    pdf_search: pdfSearch,
    read_pdf: readPdf,
  },
  transport: stdio(),
});

async function main(): Promise<void> {
  await server.start();

  // Only log startup message in debug mode to prevent stderr pollution
  // This prevents handshake failures with MCP clients that expect clean stdio
  if (process.env['DEBUG_MCP']) {
    console.error('[PDF Reader MCP] Server running on stdio');
    console.error('[PDF Reader MCP] Project root:', process.cwd());
  }
}

main().catch((error: unknown) => {
  console.error('[PDF Reader MCP] Server error:', error);
  process.exit(1);
});
