#!/usr/bin/env node

import { createServer, stdio } from '@sylphx/mcp-server-sdk';
import { pdfGetMetadata } from './handlers/getMetadata.js';
import { pdfGetPageStats } from './handlers/getPageStats.js';
import { pdfGetToc } from './handlers/getToc.js';
import { pdfReadPages } from './handlers/readPages.js';
import { readPdf } from './handlers/readPdf.js';
import { pdfSearch } from './handlers/searchPdf.js';

const server = createServer({
  name: 'pdf-reader-mcp',
  version: '1.3.0',
  instructions:
    'PDF toolkit for MCP clients: retrieve metadata, compute page statistics, inspect TOCs, read structured pages, search text, and extract text/images (read_pdf maintained for compatibility).',
  tools: {
    pdf_get_metadata: pdfGetMetadata,
    pdf_get_page_stats: pdfGetPageStats,
    pdf_get_toc: pdfGetToc,
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
