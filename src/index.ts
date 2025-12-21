#!/usr/bin/env node

import { createServer, stdio } from '@sylphx/mcp-server-sdk';
import { pdfCacheClear, pdfCacheStats } from './handlers/cache.js';
import { pdfGetImage } from './handlers/getImage.js';
import { pdfGetMetadata } from './handlers/getMetadata.js';
import { pdfGetPageStats } from './handlers/getPageStats.js';
import { pdfGetToc } from './handlers/getToc.js';
import { pdfListImages } from './handlers/listImages.js';
import { pdfOcrImage } from './handlers/ocrImage.js';
import { pdfOcrPage } from './handlers/ocrPage.js';
import { pdfReadPages } from './handlers/readPages.js';
import { readPdf } from './handlers/readPdf.js';
import { pdfRenderPage } from './handlers/renderPage.js';
import { pdfSearch } from './handlers/searchPdf.js';

const server = createServer({
  name: 'pdf-reader-mcp',
  version: '2.1.0',
  instructions:
    'PDF toolkit for MCP clients: retrieve metadata, compute page statistics, inspect TOCs, read structured pages, search text, extract text/images, rasterize pages, perform OCR with caching, and manage caches (read_pdf maintained for compatibility).',
  tools: {
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
    pdf_read_pages: pdfReadPages,
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
