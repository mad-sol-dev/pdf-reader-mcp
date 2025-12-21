# Design Philosophy

PDF Reader MCP is built on these core principles:

## 1. Performance First

- **Concurrent Processing** - Multiple PDF sources are processed in parallel
- **Efficient Parsing** - Uses pdfjs-dist for reliable, fast PDF parsing
- **Minimal Overhead** - Direct stdio communication with no HTTP overhead
- **Batch Operations** - Process multiple files in a single request

> **How the tools align:** `pdf_get_metadata`, `pdf_get_page_stats`, and `pdf_get_toc` provide light, preflight calls so you only render or OCR pages when necessary. `pdf_read_pages` and `pdf_search` stream structured text without base64 payload bloat, while `pdf_render_page`/`pdf_get_image` work one page or image at a time to keep memory tight.

## 2. Comprehensive Extraction

- **Text Extraction** - Full document or specific pages
- **Page Ranges** - Flexible page selection with ranges like "1-5, 10, 15-20"
- **Metadata Access** - Document properties, author, title, dates
- **Image Extraction** - Embedded images as base64-encoded PNG
- **Navigation Context** - TOC flattening and page label detection
- **Search & OCR** - Regex/keyword search plus page/image OCR

> **How the tools align:** Dedicated handlers cover each need: `pdf_get_metadata` for metadata/page labels, `pdf_get_toc` for outlines, `pdf_get_page_stats` for density checks, `pdf_read_pages` and `pdf_search` for text-first work, `pdf_render_page`/`pdf_get_image`/`pdf_list_images` for visuals, and `pdf_ocr_page`/`pdf_ocr_image` for vision-only pages.

## 3. Simple Integration

- **Focused Toolset** - Specialized tools for metadata, structure, reading, searching, images, OCR, and caches
- **Standard MCP** - Compatible with any MCP client
- **Easy Setup** - One command installation via npx
- **Multiple Clients** - Works with Claude Desktop, Claude Code, Cursor, and more

> **How the tools align:** The quick-start workflow in [Getting Started](../guide/getting-started.md#quick-start-workflow) shows how to chain the handlers. The compatibility `read_pdf` tool remains for legacy clients while new integrations can mix and match lighter calls.

## 4. Flexible Input

- **Local Files** - Read PDFs from any path on the filesystem
- **Remote URLs** - Download and process PDFs from URLs
- **Mixed Sources** - Combine local and remote files in one request

> **How the tools align:** Every handler accepts shared source definitions so metadata probes, search, rendering, and OCR can use the same paths/URLs and page range filters without reconfiguration.

## 5. Robust Error Handling

- **Graceful Failures** - One failed source doesn't stop others
- **Clear Errors** - Specific error codes and messages
- **Partial Results** - Get results from successful sources even if some fail
- **Cache Controls** - Inspect/clear caches to prevent stale or conflicting results

> **How the tools align:** Per-tool results include warnings for out-of-range pages, OCR cache hits are called out in `from_cache`, and `pdf_cache_stats`/`pdf_cache_clear` give operators control between runs. The `read_pdf` compatibility tool still follows the same error-isolated batch model.

## Technical Stack

- **Runtime**: Node.js 22+
- **PDF Parsing**: pdfjs-dist
- **Image Encoding**: pngjs
- **Schema Validation**: Zod
- **MCP SDK**: @sylphx/mcp-server-sdk
- **Build Tool**: bunup
