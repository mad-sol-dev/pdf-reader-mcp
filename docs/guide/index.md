# Introduction

PDF Reader MCP is a **Model Context Protocol (MCP) server** that provides comprehensive PDF processing capabilities for AI agents, including text extraction, image handling, OCR, and Vision API integration.

## What's New in v2.2.0 🆕

- **Vision API Support** — Analyze technical diagrams, charts, and illustrations with Mistral Vision or Claude Vision
- **Enhanced Mistral OCR** — Full response structure with images, tables, hyperlinks, dimensions, and usage info
- **Smart OCR Decision** — Automatically skip OCR when native text extraction is sufficient (cost savings)
- **Three-Stage Workflow** — Text extraction → Vision analysis → OCR extraction for optimal results

See [OCR_COMPARISON_TEST.md](../../OCR_COMPARISON_TEST.md) for real test results demonstrating Vision vs OCR API performance.

## What It Does

AI agents need to access information from PDF documents - technical manuals, research papers, invoices, reports, and more. This server provides specialized tools to:

### 📄 Navigation & Structure
- **Metadata** — Document properties, page counts, page labels, outline presence
- **Table of Contents** — Flattened TOC with page numbers and depth levels
- **Page Statistics** — Text length and image counts per page for quick assessment

### 📖 Reading & Search
- **Page-specific text** — Extract text from specific pages with `[IMAGE]` and `[TABLE]` markers
- **Search** — Regex or plain-text search with context windows
- **Flexible extraction** — Whitespace preservation, line trimming, max character limits

### 🖼️ Images & Rendering
- **List images** — Enumerate embedded images with metadata (no base64 payload)
- **Extract images** — Get specific images as base64-encoded PNG
- **Render pages** — Rasterize pages to PNG for vision analysis

### 🔍 Vision & OCR (v2.2.0)

**Critical distinction for accurate results:**

| Content Type | API to Use | Best For |
|--------------|------------|----------|
| **Diagrams, Charts, Technical Illustrations** | **Vision API** (`type: "mistral"`) | Semantic understanding, extracting labels, relationships |
| **Scanned Documents, Forms, Tables** | **OCR API** (`type: "mistral-ocr"`) | Text extraction, structured tables (HTML), headers/footers |

**Providers:**
- **Mistral Vision** — Vision API for diagrams (cost-effective, cached)
- **Mistral OCR** — OCR API with enhanced response structure (tables, images, hyperlinks)
- **Claude Vision** — Highest accuracy for complex analysis (via MCP prompt)
- **HTTP** — Custom OCR endpoints
- **Mock** — Testing and development

**Smart OCR:**
- Automatically skip OCR when native text is sufficient
- Save API costs on large documents
- Configurable decision heuristics

### 💾 Cache Management
- **Dual-layer caching** — Memory (fast) + Disk (persistent)
- **Cache statistics** — Inspect text and OCR cache usage
- **Selective clearing** — Clear text, OCR, or all caches

## Key Features

### Specialized Tools
Modern toolkit with focused tools instead of monolithic extraction:
- `pdf_get_metadata` — Document probe
- `pdf_read_pages` — Structured text extraction
- `pdf_search` — Keyword/regex search
- `pdf_ocr_page` — OCR rendered pages
- `pdf_ocr_image` — OCR specific images (Vision or OCR API)
- `pdf_render_page` — Page rasterization
- And more... (see [Getting Started](./getting-started.md))

### Multiple Sources
Process PDFs from **local files** or **URLs** in a single request. Mix and match sources as needed.

### Batch Processing
Send multiple PDF sources in one request. The server processes them **concurrently** for optimal performance (5-10x speedup).

### Path Security
- **Allowlist-based access** — Configure trusted root directories
- **Base directory** — Resolve relative paths safely
- **Optional absolute paths** — Opt-in for absolute path access

### Performance
- **Parallel processing** — Promise.all for multi-page/multi-source operations
- **Smart caching** — Fingerprint-based cache with disk persistence
- **Guardrails** — Large document warnings unless explicitly opted in

## Supported Clients

- **Claude Desktop** — Add to your `claude_desktop_config.json`
- **Claude Code** — Use `claude mcp add` command
- **Cursor** — Configure in MCP settings
- **Any MCP Client** — Standard MCP protocol over stdio

## Quick Links

- **[Getting Started](./getting-started.md)** — Quick start workflow and tool-by-tool examples
- **[Installation](./installation.md)** — Setup instructions for different clients
- **[Three-Stage OCR Workflow](./three-stage-ocr-workflow.md)** — Recommended workflow combining text, Vision, and OCR
- **[OCR Providers](./ocr-providers.md)** — Complete provider reference
- **[Mistral OCR Capabilities](./mistral-ocr-capabilities.md)** — Full response structure and options

## Architecture

Built on a solid foundation by **@sylphx**, massively expanded with:
- Vision API integration (Mistral + Claude)
- Enhanced OCR with full response structure
- Smart routing and decision logic
- Three-stage workflow optimization

See the [main README](../../README.md) for complete documentation and API reference.
