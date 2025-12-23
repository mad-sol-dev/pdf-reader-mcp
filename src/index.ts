#!/usr/bin/env node

// Filter out all warnings/console output from stdout (breaks MCP JSON)
// MCP protocol requires clean JSON-RPC on stdout, everything else goes to stderr
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = ((
  chunk: string | Uint8Array,
  encodingOrCallback?: BufferEncoding | ((error?: Error) => void),
  callback?: (error?: Error) => void
) => {
  const str = chunk.toString();

  // Redirect any warnings or debug output to stderr
  // Common patterns: "Warning:", "Cannot polyfill", "DOMMatrix", etc.
  const shouldRedirectToStderr =
    str.includes('Warning:') ||
    str.includes('Cannot polyfill') ||
    str.includes('DOMMatrix') ||
    str.includes('Path2D') ||
    str.trim().startsWith('Warning') ||
    str.trim().startsWith('(node:'); // Node.js warnings

  if (shouldRedirectToStderr) {
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
// Core Tools
import { pdfInfo } from './handlers/pdfInfo.js';
import { pdfRead } from './handlers/pdfRead.js';
import { pdfExtractImage } from './handlers/extractImage.js';
import { pdfOcr } from './handlers/pdfOcr.js';
import { pdfSearch } from './handlers/searchPdf.js';
// Advanced Tool
import { pdfCacheClear } from './handlers/cache.js';

const server = createServer({
  name: 'pdf-reader-mcp',
  version: '3.0.0',
  instructions:
    'PDF toolkit for MCP clients: retrieve metadata, compute page statistics, inspect TOCs, read structured pages, search text, extract text/images, rasterize pages, perform OCR with caching, and manage caches (read_pdf maintained for compatibility).',
  tools: {
    pdf_info: pdfInfo, // PRE-STAGE: Metadata and document overview
    pdf_read: pdfRead, // STAGE 1: Extract text from PDF pages
    pdf_extract_image: pdfExtractImage, // STAGE 2: Extract specific images
    pdf_ocr: pdfOcr, // STAGE 3: OCR for text in images
    pdf_search: pdfSearch, // Shortcut: Search text across documents
    _pdf_cache_clear: pdfCacheClear, // Advanced: Cache management
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
