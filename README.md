<div align="center">

# 📄 @sylphx/pdf-reader-mcp

> Production-ready PDF processing server for AI agents

[![npm version](https://img.shields.io/npm/v/@sylphx/pdf-reader-mcp?style=flat-square)](https://www.npmjs.com/package/@sylphx/pdf-reader-mcp)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](https://opensource.org/licenses/MIT)
[![CI/CD](https://img.shields.io/github/actions/workflow/status/SylphxAI/pdf-reader-mcp/ci.yml?style=flat-square&label=CI/CD)](https://github.com/SylphxAI/pdf-reader-mcp/actions/workflows/ci.yml)
[![codecov](https://img.shields.io/codecov/c/github/SylphxAI/pdf-reader-mcp?style=flat-square)](https://codecov.io/gh/SylphxAI/pdf-reader-mcp)
[![coverage](https://img.shields.io/badge/coverage-94.17%25-brightgreen?style=flat-square)](https://pdf-reader-msu3esos4-sylphx.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![Downloads](https://img.shields.io/npm/dm/@sylphx/pdf-reader-mcp?style=flat-square)](https://www.npmjs.com/package/@sylphx/pdf-reader-mcp)

**5-10x faster parallel processing** • **Y-coordinate content ordering** • **94%+ test coverage** • **103 tests passing**

<a href="https://mseep.ai/app/SylphxAI-pdf-reader-mcp">
<img src="https://mseep.net/pr/SylphxAI-pdf-reader-mcp-badge.png" alt="Security Validated" width="200"/>
</a>

</div>

---

## 🚀 Overview

PDF Reader MCP is a **production-ready** Model Context Protocol server that empowers AI agents with **enterprise-grade PDF processing capabilities**. Extract text, images, and metadata with unmatched performance and reliability.

**The Problem:**
```typescript
// Traditional PDF processing
- Sequential page processing (slow)
- No natural content ordering
- Complex path handling
- Poor error isolation
```

**The Solution:**
```typescript
// PDF Reader MCP
- 5-10x faster parallel processing ⚡
- Y-coordinate based ordering 📐
- Flexible path support (absolute/relative) 🎯
- Per-page error resilience 🛡️
- 94%+ test coverage ✅
```

**Result: Production-ready PDF processing that scales.**

---

## ⚡ Key Features

### Performance

- 🚀 **5-10x faster** than sequential with automatic parallelization
- ⚡ **12,933 ops/sec** error handling, 5,575 ops/sec text extraction
- 💨 **Process 50-page PDFs** in seconds with multi-core utilization
- 📦 **Lightweight** with minimal dependencies

### Developer Experience

- 🎯 **Path Flexibility** - Absolute & relative paths, Windows/Unix support (v1.3.0)
- 🖼️ **Smart Ordering** - Y-coordinate based content preserves document layout
- 🛡️ **Type Safe** - Full TypeScript with strict mode enabled
- 📚 **Battle-tested** - 103 tests, 94%+ coverage, 98%+ function coverage
- 🎨 **Focused API** - Dedicated tools for metadata, navigation, search + backward-compatible `read_pdf`

---

## 📊 Performance Benchmarks

Real-world performance from production testing:

| Operation | Ops/sec | Performance | Use Case |
|-----------|---------|-------------|----------|
| **Error handling** | 12,933 | ⚡⚡⚡⚡⚡ | Validation & safety |
| **Extract full text** | 5,575 | ⚡⚡⚡⚡ | Document analysis |
| **Extract page** | 5,329 | ⚡⚡⚡⚡ | Single page ops |
| **Multiple pages** | 5,242 | ⚡⚡⚡⚡ | Batch processing |
| **Metadata only** | 4,912 | ⚡⚡⚡ | Quick inspection |

### Parallel Processing Speedup

| Document | Sequential | Parallel | Speedup |
|----------|-----------|----------|---------|
| **10-page PDF** | ~2s | ~0.3s | **5-8x faster** |
| **50-page PDF** | ~10s | ~1s | **10x faster** |
| **100+ pages** | ~20s | ~2s | **Linear scaling** with CPU cores |

*Benchmarks vary based on PDF complexity and system resources.*

---

## 📦 Installation

### Claude Code

```bash
claude mcp add pdf-reader -- npx @sylphx/pdf-reader-mcp
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pdf-reader": {
      "command": "npx",
      "args": ["@sylphx/pdf-reader-mcp"]
    }
  }
}
```

<details>
<summary><strong>📍 Config file locations</strong></summary>

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

</details>

### VS Code

```bash
code --add-mcp '{"name":"pdf-reader","command":"npx","args":["@sylphx/pdf-reader-mcp"]}'
```

### Cursor

1. Open **Settings** → **MCP** → **Add new MCP Server**
2. Select **Command** type
3. Enter: `npx @sylphx/pdf-reader-mcp`

### Windsurf

Add to your Windsurf MCP config:

```json
{
  "mcpServers": {
    "pdf-reader": {
      "command": "npx",
      "args": ["@sylphx/pdf-reader-mcp"]
    }
  }
}
```

### Cline

Add to Cline's MCP settings:

```json
{
  "mcpServers": {
    "pdf-reader": {
      "command": "npx",
      "args": ["@sylphx/pdf-reader-mcp"]
    }
  }
}
```

### Warp

1. Go to **Settings** → **AI** → **Manage MCP Servers** → **Add**
2. Command: `npx`, Args: `@sylphx/pdf-reader-mcp`

### Smithery (One-click)

```bash
npx -y @smithery/cli install @sylphx/pdf-reader-mcp --client claude
```

### Manual Installation

```bash
# Quick start - zero installation
npx @sylphx/pdf-reader-mcp

# Or install globally
npm install -g @sylphx/pdf-reader-mcp
```

---

## 🎯 Quick Start

### Basic Usage

```json
{
  "sources": [{
    "path": "documents/report.pdf"
  }],
  "include_full_text": true,
  "include_metadata": true,
  "include_page_count": true
}
```

> ⚠️ **Heads up:** Large PDFs require explicit `pages` or `allow_full_document=true`. When pages are omitted, the server samples only the first pages and returns a guard warning to prevent accidental full-document reads.

**Result:**
- ✅ Full text content extracted
- ✅ PDF metadata (author, title, dates)
- ✅ Total page count
- ✅ Structural sharing - unchanged parts preserved

### Extract Specific Pages

```json
{
  "sources": [{
    "path": "documents/manual.pdf",
    "pages": "1-5,10,15-20"
  }],
  "include_full_text": true
}
```

### Absolute Paths (v1.3.0+)

```json
// Windows - Both formats work!
{
  "sources": [{
    "path": "C:\\Users\\John\\Documents\\report.pdf"
  }],
  "include_full_text": true
}

// Unix/Mac
{
  "sources": [{
    "path": "/home/user/documents/contract.pdf"
  }],
  "include_full_text": true
}
```

**No more** `"Absolute paths are not allowed"` **errors!**

### Extract Images with Natural Ordering

```json
{
  "sources": [{
    "path": "presentation.pdf",
    "pages": [1, 2, 3]
  }],
  "include_images": true,
  "include_full_text": true
}
```

**Response includes:**
- Text and images in **exact document order** (Y-coordinate sorted)
- Base64-encoded images with metadata (width, height, format)
- Natural reading flow preserved for AI comprehension

### Batch Processing

```json
{
  "sources": [
    { "path": "C:\\Reports\\Q1.pdf", "pages": "1-10" },
    { "path": "/home/user/Q2.pdf", "pages": "1-10" },
    { "url": "https://example.com/Q3.pdf" }
  ],
  "include_full_text": true
}
```

⚡ **All PDFs processed in parallel automatically!**

---

## ✨ Features

### Core Capabilities
- ✅ **Text Extraction** - Full document or specific pages with intelligent parsing
- ✅ **Image Extraction** - Base64-encoded with complete metadata (width, height, format)
- ✅ **Content Ordering** - Y-coordinate based layout preservation for natural reading flow
- ✅ **Metadata Extraction** - Author, title, creation date, and custom properties
- ✅ **Page Counting** - Fast enumeration without loading full content
- ✅ **Dual Sources** - Local files (absolute or relative paths) and HTTP/HTTPS URLs
- ✅ **Batch Processing** - Multiple PDFs processed concurrently

### Advanced Features
- ⚡ **5-10x Performance** - Parallel page processing with Promise.all
- 🎯 **Smart Pagination** - Extract ranges like "1-5,10-15,20"
- 🖼️ **Multi-Format Images** - RGB, RGBA, Grayscale with automatic detection
- 🛡️ **Path Flexibility** - Windows, Unix, and relative paths all supported (v1.3.0)
- 🔍 **Error Resilience** - Per-page error isolation with detailed messages
- 📏 **Large File Support** - Efficient streaming and memory management
- 📝 **Type Safe** - Full TypeScript with strict mode enabled

---

## 🆕 What's New in v1.3.0

### 🎉 Absolute Paths Now Supported!

```json
// ✅ Windows
{ "path": "C:\\Users\\John\\Documents\\report.pdf" }
{ "path": "C:/Users/John/Documents/report.pdf" }

// ✅ Unix/Mac
{ "path": "/home/john/documents/report.pdf" }
{ "path": "/Users/john/Documents/report.pdf" }

// ✅ Relative (still works)
{ "path": "documents/report.pdf" }
```

**Other Improvements:**
- 🐛 Improved request validation error handling
- 📦 Updated all dependencies to latest versions
- ✅ 103 tests passing, 94%+ coverage maintained

<details>
<summary><strong>📋 View Full Changelog</strong></summary>

<br/>

**v1.2.0 - Content Ordering**
- Y-coordinate based text and image ordering
- Natural reading flow for AI models
- Intelligent line grouping

**v1.1.0 - Image Extraction & Performance**
- Base64-encoded image extraction
- 10x speedup with parallel processing
- Comprehensive test coverage (94%+)

[View Full Changelog →](./CHANGELOG.md)

</details>

---

## 📖 API Reference

### `pdf_get_metadata` — metadata & page label probe

Retrieves document info, metadata objects, page count, page-label hints, and outline presence in one lightweight call.

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `sources` | Array | List of PDF sources to inspect | Required |
| `include_metadata` | boolean | Include metadata/info objects | `true` |
| `include_page_count` | boolean | Include total page count | `true` |
| `include_page_labels` | boolean | Detect and sample page labels | `true` |
| `include_outline` | boolean | Report whether an outline/TOC exists | `true` |

**Output:** For each source, returns `info`/`metadata`, `num_pages`, fingerprint, `has_page_labels`, `sample_page_labels`, and `has_outline` when requested.

### `pdf_get_toc` — table of contents flattening

Flattens PDF outline entries into a depth-aware list with resolved page numbers.

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `sources` | Array | List of PDF sources to load | Required |

**Output:** `has_outline` plus `toc` items with `title`, resolved `page` (when available), and `depth` values.

### `pdf_get_page_stats` — page-level length summary

Counts characters and (optionally) images per page to size work before full extraction.

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `sources` | Array | List of PDF sources to scan | Required |
| `include_images` | boolean | Count images while scanning pages | `false` |
| `allow_full_document` | boolean | Explicitly permit full-document scans when `pages` is omitted; otherwise guarded sampling occurs on large files | `false` |

**Output:** `num_pages`, `page_stats` with `page`, `text_length`, `image_count`, `has_text`, `has_images`, plus `warnings` for invalid page specs.

### `pdf_read_pages` — structured page reader

Extracts ordered text per page with optional image indexes (no binary data) plus truncation/whitespace controls.

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `sources` | Array | List of PDF sources to process | Required |
| `include_image_indexes` | boolean | Return image indexes for each page (base64 omitted) | `false` |
| `max_chars_per_page` | number | Truncate each page after N characters | unset |
| `preserve_whitespace` | boolean | Keep original whitespace (otherwise collapsed) | `false` |
| `trim_lines` | boolean | Trim leading/trailing whitespace per line | `true` |
| `allow_full_document` | boolean | Allow full-document reads when `pages` is not provided; otherwise a guard samples only the first pages with a warning | `false` |

**Output:** `page_index` (0-based), `page_number`, optional `page_label`, ordered `lines`, combined `text`, `image_indexes`, and `truncated_pages` metadata when limits apply.

### `pdf_search` — page-aware search

Iterates pages in reading order with plain text or regex matching. Returns page index/label, exact match, and surrounding `context_before`/`context_after` strings while honoring `pages` filters and `max_hits` short-circuiting.

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `sources` | Array | List of PDF sources to scan | Required |
| `query` | string | Plain text or regex pattern | Required |
| `use_regex` | boolean | Treat `query` as regex | `false` |
| `case_sensitive` | boolean | Case-sensitive matching | `false` |
| `context_chars` | number | Characters shown before/after each match | `60` |
| `max_hits` | number | Maximum matches before stopping | `20` |
| `max_chars_per_page` | number | Truncate each page before searching | unset |
| `preserve_whitespace` | boolean | Keep original whitespace (otherwise collapsed) | `false` |
| `trim_lines` | boolean | Trim leading/trailing whitespace per line | `true` |

### `pdf_list_images` — enumerate image metadata

Lists page/index/dimension/format info for all images (or filtered pages) without base64 payloads.

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `sources` | Array | List of PDF sources to inspect (honors `pages` filters) | Required |
| `allow_full_document` | boolean | Permit full-document image enumeration when `pages` are omitted; otherwise guarded sampling/limits apply for large PDFs | `false` |

**Output:** `images` array with page/index/width/height/format, `total_images`, and `warnings` when page ranges are out of bounds.

### `pdf_get_image` — fetch a single embedded image

Downloads one image as PNG along with metadata and any page warnings.

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `source` | Object | PDF source (path/url and optional pages) | Required |
| `page` | number | 1-based page number containing the image | Required |
| `index` | number | 0-based image index within that page | Required |

**Output:** JSON metadata (`page`, `index`, `width`, `height`, `format`, `warnings`) plus a PNG part containing the base64 image data.

### `pdf_render_page` — rasterize a page

Renders a PDF page to PNG for downstream vision tasks or OCR.

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `source` | Object | PDF source (path/url) | Required |
| `page` | number | 1-based page number to render | Required |
| `scale` | number | Rendering scale factor (1.0 = 100%) | `1.5` |

**Output:** PNG image content plus metadata (`page`, `width`, `height`, `scale`, `fingerprint`).

### `pdf_ocr_page` — OCR a rendered page

Runs OCR against a rendered page with provider overrides and caching.

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `source` | Object | PDF source (path/url) | Required |
| `page` | number | 1-based page to OCR | Required |
| `scale` | number | Rendering scale applied before OCR | `1.5` |
| `provider` | Object | OCR provider configuration (type/endpoint/model/language/extras) | unset |
| `cache` | boolean | Use cached OCR result when available | `true` |

**Output:** `text`, `provider`, `fingerprint`, `from_cache`, and `page` identifiers.

**OCR provider configuration:**

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `mock` (default placeholder text) or `http` (send JSON request). |
| `endpoint` | string | Required when `type` is `http`; URL that accepts a POST JSON payload. |
| `api_key` | string | Optional; sets `Authorization: Bearer <api_key>`. |
| `model` | string | Optional model hint forwarded to the HTTP OCR service. |
| `language` | string | Optional language hint forwarded to the OCR service. |
| `extras` | object | Optional free-form settings forwarded in the HTTP payload. |

**HTTP OCR payload shape:**

```json
{
  "source": { "path": "./docs/report.pdf" },
  "page": 5,
  "provider": {
    "type": "http",
    "endpoint": "https://example-ocr.internal/v1/ocr",
    "api_key": "sk-ocr-demo",
    "model": "vision-large",
    "language": "en",
    "extras": { "detect_tables": true }
  }
}
```

The service receives `{ "image": "<base64 PNG>", "model": "vision-large", "language": "en", "extras": { "detect_tables": true } }` and must respond with `{ "text": "..." }` (or `{ "ocr": "..." }`).

### `pdf_ocr_image` — OCR a single image

Targets one embedded image for OCR without rasterizing the full page again.

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `source` | Object | PDF source (path/url) | Required |
| `page` | number | 1-based page hosting the image | Required |
| `index` | number | 0-based image index on that page | Required |
| `provider` | Object | OCR provider configuration | unset |
| `cache` | boolean | Use cached OCR result when available | `true` |

**Output:** `text`, `provider`, `fingerprint`, `from_cache`, and `image` identifiers (`page`, `index`).

### `pdf_cache_stats` — inspect caches

Returns cache entry counts and keys for text and OCR results.

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| _none_ | — | No input parameters | — |

**Output:** `stats` with `text_entries`, `ocr_entries`, and corresponding key listings.

### `pdf_cache_clear` — flush caches

Clears cached text and/or OCR entries.

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `scope` | string | Cache scope: `text`, `ocr`, or `all` | `all` |

**Output:** Boolean flags `cleared_text` and `cleared_ocr` reflecting what was removed.

### `read_pdf` — compatibility tool

Legacy all-in-one extractor kept for backward compatibility. Uses modern loaders but preserves the combined output shape.

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `sources` | Array | List of PDF sources to process | Required |
| `include_full_text` | boolean | Return concatenated full text when `pages` are not specified | `false` |
| `include_metadata` | boolean | Include metadata/info objects | `true` |
| `include_page_count` | boolean | Include total page count | `true` |
| `include_images` | boolean | Include embedded images with base64 data | `false` |

**Output:** Backward-compatible payload with `full_text` or `page_texts`, `page_contents`, `metadata`/`info`, `num_pages`, optional `images`, and `warnings`.

## 🧭 Navigation & search playbook

1) **Orient first:** Use `pdf_get_metadata` to grab page counts, fingerprints, page label samples, and outline presence.
2) **Map the structure:** Call `pdf_get_toc` for outline entries and `pdf_get_page_stats` to see which sections contain text/images before heavy reads.
3) **Dive deeper:** Pull structured text with `pdf_read_pages`, search with `pdf_search`, and fetch visuals with `pdf_render_page`/`pdf_get_image` as needed.
4) **Extract text when needed:** Run `pdf_ocr_page` or `pdf_ocr_image` for vision-only content, leaning on cached results where possible.
5) **Maintain performance:** Inspect caches with `pdf_cache_stats` and clear scopes via `pdf_cache_clear` to refresh results between runs.

---

## 🔧 Advanced Usage

<details>
<summary><strong>📐 Y-Coordinate Content Ordering</strong></summary>

<br/>

Content is returned in natural reading order based on Y-coordinates:

```
Document Layout:
┌─────────────────────┐
│ [Title]       Y:100 │
│ [Image]       Y:150 │
│ [Text]        Y:400 │
│ [Photo A]     Y:500 │
│ [Photo B]     Y:550 │
└─────────────────────┘

Response Order:
[
  { type: "text", text: "Title..." },
  { type: "image", data: "..." },
  { type: "text", text: "..." },
  { type: "image", data: "..." },
  { type: "image", data: "..." }
]
```

**Benefits:**
- AI understands spatial relationships
- Natural document comprehension
- Perfect for vision-enabled models
- Automatic multi-line text grouping

</details>

<details>
<summary><strong>🖼️ Image Extraction</strong></summary>

<br/>

**Enable extraction:**
```json
{
  "sources": [{ "path": "manual.pdf" }],
  "include_images": true
}
```

**Response format:**
```json
{
  "images": [{
    "page": 1,
    "index": 0,
    "width": 1920,
    "height": 1080,
    "format": "rgb",
    "data": "base64-encoded-png..."
  }]
}
```

**Supported formats:** RGB, RGBA, Grayscale
**Auto-detected:** JPEG, PNG, and other embedded formats

</details>

<details>
<summary><strong>📂 Path Configuration</strong></summary>

<br/>

**Absolute paths** (v1.3.0+) - Direct file access:
```json
{ "path": "C:\\Users\\John\\file.pdf" }
{ "path": "/home/user/file.pdf" }
```

**Relative paths** - Workspace files:
```json
{ "path": "docs/report.pdf" }
{ "path": "./2024/Q1.pdf" }
```

**Configure working directory:**
```json
{
  "mcpServers": {
    "pdf-reader-mcp": {
      "command": "npx",
      "args": ["@sylphx/pdf-reader-mcp"],
      "cwd": "/path/to/documents"
    }
  }
}
```

</details>

<details>
<summary><strong>📊 Large PDF Strategies</strong></summary>

<br/>

**Strategy 1: Page ranges**
```json
{ "sources": [{ "path": "big.pdf", "pages": "1-20" }] }
```

**Strategy 2: Progressive loading**
```json
// Step 1: Get page count
{ "sources": [{ "path": "big.pdf" }], "include_full_text": false }

// Step 2: Extract sections
{ "sources": [{ "path": "big.pdf", "pages": "50-75" }] }
```

**Strategy 3: Parallel batching**
```json
{
  "sources": [
    { "path": "big.pdf", "pages": "1-50" },
    { "path": "big.pdf", "pages": "51-100" }
  ]
}
```

</details>

---

## 🔧 Troubleshooting

### "Absolute paths are not allowed"

**Solution:** Upgrade to v1.3.0+

```bash
npm update @sylphx/pdf-reader-mcp
```

Restart your MCP client completely.

---

### "File not found"

**Causes:**
- File doesn't exist at path
- Wrong working directory
- Permission issues

**Solutions:**

Use absolute path:
```json
{ "path": "C:\\Full\\Path\\file.pdf" }
```

Or configure `cwd`:
```json
{
  "pdf-reader-mcp": {
    "command": "npx",
    "args": ["@sylphx/pdf-reader-mcp"],
    "cwd": "/path/to/docs"
  }
}
```

---

### "No tools showing up"

**Solution:**

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install @sylphx/pdf-reader-mcp@latest
```

Restart MCP client completely.

---

## 🏗️ Architecture

### Tech Stack

| Component | Technology |
|:----------|:-----------|
| **Runtime** | Node.js 22+ ESM |
| **PDF Engine** | PDF.js (Mozilla) |
| **Validation** | @sylphx/vex |
| **Protocol** | MCP SDK |
| **Language** | TypeScript (strict) |
| **Testing** | Bun test runner |
| **Quality** | Biome |
| **CI/CD** | GitHub Actions |

### Design Principles

- 🔒 **Security First** - Flexible paths with secure defaults
- 🎯 **Targeted Tools** - Specialized handlers for metadata, navigation, search, render, OCR, with `read_pdf` kept for compatibility
- ⚡ **Performance** - Parallel processing, efficient memory
- 🛡️ **Reliability** - Per-page isolation, detailed errors
- 🧪 **Quality** - 94%+ coverage, strict TypeScript
- 📝 **Type Safety** - No `any` types, strict mode
- 🔄 **Backward Compatible** - Smooth upgrades always

---

## 🧪 Development

<details>
<summary><strong>Setup & Scripts</strong></summary>

<br/>

**Prerequisites:**
- Node.js >= 22.0.0
- Bun 1.3.x (matches CI) - install from https://bun.sh to mirror GitHub Actions

**Setup:**
```bash
git clone https://github.com/SylphxAI/pdf-reader-mcp.git
cd pdf-reader-mcp
bun install && bun run build
```

**Scripts:**
```bash
bun run build       # Build TypeScript
bun run test        # Run test suite
bun run test:cov    # Coverage report
bun run check       # Lint + format
bun run check:fix   # Auto-fix
bun run benchmark   # Performance tests
```

**Quality:**
- ✅ Comprehensive tests via Bun test runner
- ✅ High coverage enforced in CI
- ✅ Automated linting and formatting with Biome
- ✅ Strict TypeScript configuration

</details>

<details>
<summary><strong>Contributing</strong></summary>

<br/>

**Quick Start:**
1. Fork repository
2. Create branch: `git checkout -b feature/awesome`
3. Make changes: `bun run test`
4. Format: `bun run check:fix`
5. Commit: Use [Conventional Commits](https://www.conventionalcommits.org/)
6. Open PR

**Commit Format:**
```
feat(images): add WebP support
fix(paths): handle UNC paths
docs(readme): update examples
```

See [CONTRIBUTING.md](./CONTRIBUTING.md)

</details>

---

## 📚 Documentation

- 📖 [Full Docs](https://SylphxAI.github.io/pdf-reader-mcp/) - Complete guides
- 🚀 [Getting Started](./docs/guide/getting-started.md) - Quick start
- 📘 [API Reference](./docs/api/README.md) - Detailed API
- 🏗️ [Design](./docs/design/index.md) - Architecture
- ⚡ [Performance](./docs/performance/index.md) - Benchmarks
- 🔍 [Comparison](./docs/comparison/index.md) - vs. alternatives

---

## 🗺️ Roadmap

**✅ Completed**
- [x] Image extraction (v1.1.0)
- [x] 5-10x parallel speedup (v1.1.0)
- [x] Y-coordinate ordering (v1.2.0)
- [x] Absolute paths (v1.3.0)
- [x] 94%+ test coverage (v1.3.0)

**🚀 Next**
- [ ] OCR for scanned PDFs
- [ ] Annotation extraction
- [ ] Form field extraction
- [ ] Table detection
- [ ] 100+ MB streaming
- [ ] Advanced caching
- [ ] PDF generation

Vote at [Discussions](https://github.com/SylphxAI/pdf-reader-mcp/discussions)

---

## 🏆 Recognition

**Featured on:**
- [Smithery](https://smithery.ai/server/@sylphx/pdf-reader-mcp) - MCP directory
- [Glama](https://glama.ai/mcp/servers/@sylphx/pdf-reader-mcp) - AI marketplace
- [MseeP.ai](https://mseep.ai/app/SylphxAI-pdf-reader-mcp) - Security validated

**Trusted worldwide** • **Enterprise adoption** • **Battle-tested**

---

## 🤝 Support

[![GitHub Issues](https://img.shields.io/github/issues/SylphxAI/pdf-reader-mcp?style=flat-square)](https://github.com/SylphxAI/pdf-reader-mcp/issues)
[![Discord](https://img.shields.io/discord/YOUR_DISCORD_ID?style=flat-square&logo=discord)](https://discord.gg/sylphx)

- 🐛 [Bug Reports](https://github.com/SylphxAI/pdf-reader-mcp/issues)
- 💬 [Discussions](https://github.com/SylphxAI/pdf-reader-mcp/discussions)
- 📖 [Documentation](https://SylphxAI.github.io/pdf-reader-mcp/)
- 📧 [Email](mailto:hi@sylphx.com)

**Show Your Support:**
⭐ Star • 👀 Watch • 🐛 Report bugs • 💡 Suggest features • 🔀 Contribute

---

## 📊 Stats

![Stars](https://img.shields.io/github/stars/SylphxAI/pdf-reader-mcp?style=social)
![Forks](https://img.shields.io/github/forks/SylphxAI/pdf-reader-mcp?style=social)
![Downloads](https://img.shields.io/npm/dm/@sylphx/pdf-reader-mcp)
![Contributors](https://img.shields.io/github/contributors/SylphxAI/pdf-reader-mcp)

**103 Tests** • **94%+ Coverage** • **Production Ready**

---

## 📄 License

MIT © [Sylphx](https://sylphx.com)

---

## 🙏 Credits

Built with:
- [PDF.js](https://mozilla.github.io/pdf.js/) - Mozilla PDF engine
- [Bun](https://bun.sh) - Fast JavaScript runtime

Special thanks to the open source community ❤️

## Powered by Sylphx

This project uses the following [@sylphx](https://github.com/SylphxAI) packages:

- [@sylphx/mcp-server-sdk](https://github.com/SylphxAI/mcp-server-sdk) - MCP server framework
- [@sylphx/biome-config](https://github.com/SylphxAI/biome-config) - Biome configuration
- [@sylphx/tsconfig](https://github.com/SylphxAI/tsconfig) - TypeScript configuration
- [@sylphx/bump](https://github.com/SylphxAI/bump) - Version management
- [@sylphx/doctor](https://github.com/SylphxAI/doctor) - Project health checker
- [@sylphx/leaf](https://github.com/SylphxAI/leaf) - Documentation framework
- [@sylphx/leaf-theme-default](https://github.com/SylphxAI/leaf-theme-default) - Documentation theme

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=SylphxAI/pdf-reader-mcp&type=Date)](https://star-history.com/#SylphxAI/pdf-reader-mcp&Date)

---

<div align="center">
<sub>Built with ❤️ by <a href="https://github.com/SylphxAI">Sylphx</a></sub>
</div>
