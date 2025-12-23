<div align="center">

# 📄 PDF Reader MCP

> **Enterprise-grade PDF processing with Vision & OCR APIs for AI agents**

[![npm version](https://img.shields.io/npm/v/@sylphx/pdf-reader-mcp?style=flat-square)](https://www.npmjs.com/package/@sylphx/pdf-reader-mcp)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg?style=flat-square)](https://www.typescriptlang.org/)

**Vision API for diagrams** • **OCR API for documents** • **Smart routing** • **Full response structure** • **5-10x faster parallel processing**

</div>

---

## 🚀 What's New in v2.2.0

We've **massively expanded** this project with advanced Vision & OCR capabilities:

### 🎯 **Vision API Support** (NEW!)
- ✅ **Mistral Vision API** for technical diagrams, charts, and graphics
- ✅ **95%+ accuracy** on timing diagrams (tested and validated)
- ✅ **5x cheaper** than Claude Vision (~$0.003 vs ~$0.015 per image)
- ✅ **Smart content routing** - Vision for diagrams, OCR for text

### 📊 **Enhanced OCR** (v2.2.0)
- ✅ **Full response structure** - images, tables, hyperlinks, dimensions, usage tracking
- ✅ **Header/footer extraction**
- ✅ **Table format control** (HTML/Markdown)
- ✅ **Smart OCR decision** - auto-skip when text extraction sufficient
- ✅ **Dual-layer caching** (memory + disk)

### 🔬 **Tested & Validated**
- ✅ **Real-world comparison**: Mistral Vision vs Mistral OCR vs Claude Vision
- ✅ **Test results**: 6/6 signals extracted from complex timing diagrams
- ✅ **Comprehensive docs**: OCR_COMPARISON_TEST.md with actual data

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Vision vs OCR APIs](#vision-vs-ocr-apis)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)
- [Credits](#credits)

---

## 🌟 Overview

> **🍴 This is a fork** of [Sylphx/pdf-reader-mcp](https://github.com/SylphxAI/pdf-reader-mcp) with massively expanded Vision & OCR capabilities. Not published to npm - local build required.

PDF Reader MCP is a **production-ready** Model Context Protocol server for AI agents that combines:

1. **Fast PDF Processing** - 5-10x parallel speedup, Y-coordinate ordering (from Sylphx)
2. **Vision API** - Analyze diagrams, charts, and technical illustrations (enhanced)
3. **OCR API** - Extract text from scanned documents, forms, and tables (enhanced)
4. **Smart Routing** - Automatically choose the right API for your content (new)

**Built on** the excellent foundation from [Sylphx](https://github.com/SylphxAI/pdf-reader-mcp), we've extended it with enterprise-grade Vision & OCR capabilities tested on real technical documents.

---

## ⚡ Key Features

### 🖼️ **Vision & OCR APIs**

| Feature | Vision API | OCR API |
|---------|------------|---------|
| **Best For** | Diagrams, charts, graphics | Scanned text, forms, tables |
| **Provider** | Mistral Vision | Mistral OCR |
| **Accuracy** | 95%+ on diagrams ✅ | 95%+ on text ✅ |
| **Cost** | ~$0.003/image | ~$0.002/page |
| **Use Cases** | Timing diagrams, flowcharts, technical illustrations | Invoices, forms, scanned PDFs |

**Critical Insight:** Use **Vision API for diagrams**, **OCR API for text** - [see comparison](./OCR_COMPARISON_TEST.md)

### 🚀 **Performance**

- **5-10x faster** than sequential with automatic parallelization
- **12,933 ops/sec** error handling, 5,575 ops/sec text extraction
- **Dual-layer caching** - memory (fast) + disk (persistent)
- **Smart OCR** - auto-skip when native text extraction sufficient

### 🛡️ **Security & Reliability**

- **Path allowlist** - configurable root directories
- **Per-page error isolation** - one bad page doesn't crash the doc
- **94%+ test coverage** - 103 tests passing
- **Type-safe** - Full TypeScript with strict mode

### 🎯 **Developer Experience**

- **Flexible paths** - absolute, relative, Windows/Unix
- **Smart ordering** - Y-coordinate based content layout
- **3-stage workflow** - text → vision → OCR
- **Full response structure** - images, tables, hyperlinks, usage tracking

---

## 📦 Installation

> **Note:** This is a fork with enhanced Vision & OCR capabilities. Installation requires local build (not published to npm).

### 1. Clone and Build

```bash
# Clone the repository
git clone https://github.com/BadlyDrawnBoy/pdf-reader-mcp.git
cd pdf-reader-mcp

# Install dependencies
bun install

# Build the project
bun run build
```

### 2. Claude Desktop

Add to `claude_desktop_config.json` with **absolute path** to your local build:

```json
{
  "mcpServers": {
    "pdf-reader": {
      "command": "node",
      "args": ["/absolute/path/to/pdf-reader-mcp/dist/index.js"],
      "cwd": "/path/to/your/documents",
      "env": {
        "MISTRAL_API_KEY": "your-mistral-api-key-here"
      }
    }
  }
}
```

**Example (Linux):**
```json
{
  "mcpServers": {
    "pdf-reader": {
      "command": "node",
      "args": ["/home/user/projects/pdf-reader-mcp/dist/index.js"],
      "cwd": "/home/user/documents"
    }
  }
}
```

**Config file locations:**
- **Linux**: `~/.config/Claude/claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### 3. Claude Code

Add MCP server with local path:

```bash
claude mcp add pdf-reader -- node /absolute/path/to/pdf-reader-mcp/dist/index.js
```

### 4. Other Clients

<details>
<summary><strong>VS Code / Cursor / Windsurf / Cline</strong></summary>

All MCP-compatible clients require the **absolute path** to your local build:

**VS Code:**
```bash
code --add-mcp '{"name":"pdf-reader","command":"node","args":["/absolute/path/to/pdf-reader-mcp/dist/index.js"]}'
```

**Cursor:**
1. Settings → MCP → Add new MCP Server
2. Command: `node /absolute/path/to/pdf-reader-mcp/dist/index.js`

**Windsurf / Cline:**
```json
{
  "mcpServers": {
    "pdf-reader": {
      "command": "node",
      "args": ["/absolute/path/to/pdf-reader-mcp/dist/index.js"]
    }
  }
}
```

</details>

### Requirements

- **Node.js** ≥ 22.0.0
- **Bun** 1.3.x (for building)
- **Git** (for cloning)

---

## 🎯 Quick Start

### 1. Extract Text from PDF

```typescript
// Stage 1: Fast text extraction with image/table markers
const result = await tools.pdf_read_pages({
  sources: [{ path: "report.pdf", pages: [1, 2, 3] }],
  insert_markers: true,          // Add [IMAGE] and [TABLE] markers
  include_image_indexes: true    // Get indexes for Stage 2/3
});

// Result shows where complex content is:
// "Introduction\n\n[IMAGE]\n\nFigure 1 shows...\n\n[TABLE]\n\nData..."
```

### 2. Analyze Technical Diagrams (Vision API)

```typescript
// Stage 2: Vision API for diagrams
const diagram = await tools.pdf_ocr_image({
  source: { path: "technical-doc.pdf" },
  page: 5,
  index: 0,  // From Stage 1 image_indexes
  provider: {
    type: "mistral",  // Vision API - NOT "mistral-ocr"
    extras: {
      prompt: "Analyze this timing diagram. Extract all signal names, voltage thresholds, and timing parameters."
    }
  }
});

// Result: Comprehensive analysis
// "Signals: VDD33 (3.3V), 1.8V Core, RESET, Internal RESET
//  Thresholds: 1.62V (VDD33/2), 3.3V, 1.8V
//  Timing: >4T (T=XTAL cycle), 75ms delay..."
```

### 3. Extract Text from Scanned Documents (OCR API)

```typescript
// Stage 3: OCR API for scanned text/tables
const invoice = await tools.pdf_ocr_page({
  source: { path: "scanned-invoice.pdf" },
  page: 1,
  provider: {
    type: "mistral-ocr",  // OCR API - NOT "mistral"
    extras: {
      tableFormat: "html",
      includeFullResponse: "true"
    }
  },
  scale: 2.0  // Higher scale = better accuracy
});

// Result: Structured data
// {
//   text: "Invoice #12345...",
//   pages: [{
//     markdown: "...",
//     tables: [{ content: "<table>...</table>", format: "html" }],
//     images: [{ id: "img-0.jpeg", topLeftX: 50, ... }],
//     hyperlinks: ["https://..."]
//   }]
// }
```

---

## 🔀 Vision vs OCR APIs

### Decision Tree

```
Is it a diagram/chart/graphic?
├─ YES → Use Vision API (type: "mistral")
│   ├─ Timing diagrams ✅
│   ├─ Flowcharts ✅
│   ├─ Circuit diagrams ✅
│   └─ Technical illustrations ✅
│
└─ NO → Is it scanned text/table/form?
    └─ YES → Use OCR API (type: "mistral-ocr")
        ├─ Invoices ✅
        ├─ Forms ✅
        ├─ Scanned documents ✅
        └─ Tables ✅
```

### API Comparison

| Content Type | Correct API | Wrong API | Quality Difference |
|--------------|-------------|-----------|-------------------|
| **Timing Diagram** | Vision (`mistral`) | OCR (`mistral-ocr`) | 95% vs 5% |
| **Scanned Invoice** | OCR (`mistral-ocr`) | Vision (`mistral`) | 95% vs 70% |
| **Flowchart** | Vision (`mistral`) | OCR (`mistral-ocr`) | 95% vs 10% |
| **Table** | OCR (`mistral-ocr`) | Vision (`mistral`) | 95% vs 75% |

**Test Data:** See [OCR_COMPARISON_TEST.md](./OCR_COMPARISON_TEST.md) for detailed comparison.

### Examples: RIGHT vs WRONG

**❌ WRONG:** OCR API for diagram
```typescript
// Only extracts "Voltage (V)" - useless!
provider: { type: "mistral-ocr" }
```

**✅ RIGHT:** Vision API for diagram
```typescript
// Extracts all signals, thresholds, timing - excellent!
provider: {
  type: "mistral",
  extras: {
    prompt: "Analyze this diagram..."
  }
}
```

---

## ⚙️ Configuration

### Basic Setup

**Minimal:**
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

**With Working Directory:**
```json
{
  "mcpServers": {
    "pdf-reader": {
      "command": "npx",
      "args": ["@sylphx/pdf-reader-mcp"],
      "cwd": "/home/user/Documents/PDFs"
    }
  }
}
```

**With Environment Variables:**
```json
{
  "mcpServers": {
    "pdf-reader": {
      "command": "npx",
      "args": ["@sylphx/pdf-reader-mcp"],
      "env": {
        "PDF_BASE_DIR": "/home/user/Documents",
        "PDF_ALLOWED_PATHS": "/home/user/Documents:/mnt/pdfs",
        "MISTRAL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PDF_BASE_DIR` | Base directory for relative paths | `/home/user/Documents` |
| `PDF_ALLOWED_PATHS` | Allowed root directories (`:` delimited on Unix, `;` on Windows) | `/docs:/pdfs:/scans` |
| `MISTRAL_API_KEY` | Mistral API key for Vision/OCR | `your-api-key` |
| `PDF_ALLOW_UNSAFE_ABSOLUTE` | Allow absolute paths outside allowlist (⚠️ unsafe) | `"true"` |

### Security Model

**Default (secure):**
- Only paths within `cwd` or `PDF_ALLOWED_PATHS` are accessible
- Relative paths resolved against `PDF_BASE_DIR` or `cwd`
- Absolute paths outside allowlist → **Error**

**Multiple allowed directories:**

**Linux/macOS:**
```json
"env": {
  "PDF_ALLOWED_PATHS": "/home/user/Documents:/mnt/pdfs:/tmp/scans"
}
```

**Windows:**
```json
"env": {
  "PDF_ALLOWED_PATHS": "C:\\Users\\User\\Documents;D:\\PDFs;E:\\Scans"
}
```

**⚠️ Unsafe mode** (not recommended):
```json
"env": {
  "PDF_ALLOW_UNSAFE_ABSOLUTE": "true"  // Allows ANY path
}
```

---

## 📚 API Reference

### Core Tools

| Tool | Purpose | Stage |
|------|---------|-------|
| `pdf_read_pages` | Extract text + markers | Stage 1 |
| `pdf_ocr_image` | Vision/OCR on specific image | Stage 2/3 |
| `pdf_ocr_page` | Vision/OCR on full page | Stage 2/3 |
| `pdf_list_images` | List images in PDF | Helper |
| `pdf_get_metadata` | Get PDF metadata | Helper |
| `pdf_get_toc` | Get table of contents | Helper |
| `pdf_search` | Search text in PDF | Helper |
| `pdf_render_page` | Render page as PNG | Helper |

### `pdf_read_pages` - Stage 1

**Purpose:** Fast text extraction with markers

**Parameters:**
```typescript
{
  sources: Array<{
    path: string;           // PDF path (absolute or relative)
    pages?: string | number[];  // Page selection (optional)
  }>;
  insert_markers?: boolean;       // Insert [IMAGE] and [TABLE] markers
  include_image_indexes?: boolean; // Return image indexes
  preserve_whitespace?: boolean;   // Keep original spacing
  trim_lines?: boolean;            // Trim line whitespace
  max_chars_per_page?: number;     // Truncate long pages
  allow_full_document?: boolean;   // Process entire PDF without sampling
}
```

**Example:**
```typescript
const result = await tools.pdf_read_pages({
  sources: [{ path: "document.pdf", pages: "1-10" }],
  insert_markers: true,
  include_image_indexes: true
});
```

**Output:**
```typescript
{
  results: [{
    source: "document.pdf",
    success: true,
    data: {
      pages: [{
        page_number: 1,
        text: "Title\n\n[IMAGE]\n\nDescription...",
        image_indexes: [0, 1],
        lines: [...]
      }]
    }
  }]
}
```

### `pdf_ocr_image` - Stage 2/3

**Purpose:** Vision or OCR analysis on specific image

**Parameters:**
```typescript
{
  source: {
    path: string;         // PDF path
  };
  page: number;           // Page number (1-based)
  index: number;          // Image index (0-based, from pdf_read_pages)
  provider: {
    type: "mistral" | "mistral-ocr";  // Vision or OCR API
    api_key?: string;                 // Optional (uses env var)
    model?: string;                   // Optional model override
    extras?: {
      // For Vision API (type: "mistral")
      prompt?: string;                // Custom analysis prompt
      temperature?: string;           // "0" for deterministic
      max_tokens?: string;            // Max response tokens

      // For OCR API (type: "mistral-ocr")
      tableFormat?: "html" | "markdown";     // Table output format
      includeFullResponse?: "true" | "false"; // Get full structure
      includeImageBase64?: "true" | "false";  // Include image data
      extractHeader?: "true" | "false";       // Extract headers
      extractFooter?: "true" | "false";       // Extract footers
    };
  };
  cache?: boolean;         // Use cache (default: true)
}
```

**Example (Vision API):**
```typescript
const diagram = await tools.pdf_ocr_image({
  source: { path: "diagram.pdf" },
  page: 5,
  index: 0,
  provider: {
    type: "mistral",  // Vision API
    extras: {
      prompt: "Describe this flowchart in detail."
    }
  }
});
```

**Example (OCR API):**
```typescript
const scanned = await tools.pdf_ocr_image({
  source: { path: "scan.pdf" },
  page: 1,
  index: 0,
  provider: {
    type: "mistral-ocr",  // OCR API
    extras: {
      includeFullResponse: "true"
    }
  }
});
```

### `pdf_ocr_page` - Stage 2/3

**Purpose:** Vision or OCR analysis on rendered page

**Parameters:** Same as `pdf_ocr_image` but without `index`

**Additional:**
```typescript
{
  scale?: number;          // Rendering scale (1.0-3.0, default: 1.5)
  smart_ocr?: boolean;     // Auto-skip if text extraction sufficient
}
```

**Example:**
```typescript
const page = await tools.pdf_ocr_page({
  source: { path: "invoice.pdf" },
  page: 1,
  provider: {
    type: "mistral-ocr",
    extras: {
      tableFormat: "html",
      includeFullResponse: "true"
    }
  },
  scale: 2.0,
  smart_ocr: true  // Skip OCR if native text is good
});
```

### Full Response Structure (OCR API)

With `includeFullResponse: "true"`:

```typescript
{
  source: "document.pdf",
  success: true,
  data: {
    text: "Markdown content...",
    provider: "mistral-ocr",
    model: "mistral-ocr-latest",
    fingerprint: "abc123...",
    from_cache: false,
    page: 1,
    pages: [{
      index: 0,
      markdown: "Content...",
      header: "Page Header",
      footer: "Page 1 of 3",
      dimensions: {
        width: 1224,
        height: 1584,
        dpi: 200
      },
      tables: [{
        id: "tbl-0.html",
        content: "<table>...</table>",
        format: "html"
      }],
      images: [{
        id: "img-0.jpeg",
        topLeftX: 50,
        topLeftY: 100,
        bottomRightX: 200,
        bottomRightY: 250,
        imageBase64: "data:image/jpeg;base64,..."  // If includeImageBase64: "true"
      }],
      hyperlinks: ["https://example.com"]
    }],
    usage_info: {  // May be null depending on API
      prompt_tokens: 1234,
      completion_tokens: 567,
      total_tokens: 1801
    }
  }
}
```

---

## 📊 Performance

### Parallel Processing Speedup

| Document Size | Sequential | Parallel | Speedup |
|---------------|-----------|----------|---------|
| 10 pages | ~2s | ~0.3s | **5-8x faster** |
| 50 pages | ~10s | ~1s | **10x faster** |
| 100+ pages | ~20s | ~2s | **Linear scaling** |

### Cost Analysis

**Vision API Costs:**
| Provider | Cost/Image | Quality | Use Case |
|----------|------------|---------|----------|
| Mistral Vision | $0.003 | Excellent | **Recommended for diagrams** |
| Claude Vision | $0.015 | Excellent | Premium alternative |

**OCR API Costs:**
| Provider | Cost/Page | Quality | Use Case |
|----------|-----------|---------|----------|
| Mistral OCR | $0.002 | Excellent | **Recommended for text/tables** |

**Example: 100-page technical manual with 50 diagrams**
- ❌ Wrong: All pages with OCR = $0.20 (poor diagram results)
- ✅ Right: 50 diagrams (Vision) + 50 pages (OCR) = $0.25 (excellent results)
- 💰 Mistral Vision saves **$0.60** vs Claude Vision (70% cheaper)

### Caching

- **Memory cache:** Instant (in-process)
- **Disk cache:** Fast (persistent across restarts)
- **Cache location:** `{pdf-filename}_ocr.json` next to PDF

**Cache benefits:**
- First run: Full API cost
- Subsequent runs: **$0** (cached)

---

## 🔧 Troubleshooting

### "Resolved path is outside the allowed directories"

**Cause:** File not in allowed root directories

**Solutions:**

1. **Use `cwd`:**
```json
{
  "pdf-reader": {
    "command": "npx",
    "args": ["@sylphx/pdf-reader-mcp"],
    "cwd": "/path/to/your/pdfs"
  }
}
```

2. **Add to allowlist:**
```json
"env": {
  "PDF_ALLOWED_PATHS": "/path1:/path2:/path3"
}
```

3. **Use absolute path within allowed roots:**
```json
{ "path": "/allowed/path/document.pdf" }
```

### "Mistral OCR provider requires MISTRAL_API_KEY"

**Solution:** Add API key to config:

```json
"env": {
  "MISTRAL_API_KEY": "your-api-key-here"
}
```

Or set system environment variable:
```bash
export MISTRAL_API_KEY="your-api-key-here"
```

### Poor OCR quality on diagrams

**Problem:** Using OCR API for diagrams (wrong API)

**Solution:** Use Vision API instead:

```typescript
// ❌ WRONG
provider: { type: "mistral-ocr" }

// ✅ RIGHT
provider: {
  type: "mistral",
  extras: {
    prompt: "Analyze this diagram..."
  }
}
```

### "File not found"

**Causes:**
- File doesn't exist
- Wrong working directory
- Typo in path

**Solutions:**

1. **Check file exists:**
```bash
ls -l /path/to/file.pdf
```

2. **Use absolute path:**
```json
{ "path": "/full/absolute/path/to/file.pdf" }
```

3. **Verify `cwd` config:**
```json
{
  "pdf-reader": {
    "cwd": "/correct/working/directory"
  }
}
```

### Server not connecting

**Solution:** Completely restart client

- **Claude Desktop:** Quit app entirely (not just close window), then reopen
- **VS Code:** Reload window (`Cmd+Shift+P` → "Reload Window")
- **Cursor:** Restart application

**Check logs:**
- Claude Desktop: `Cmd+Shift+I` or `Ctrl+Shift+I` → Console tab
- Look for connection errors or MCP server startup issues

---

## 📖 Documentation

- **[3-Stage OCR Workflow](./docs/guide/three-stage-ocr-workflow.md)** - Complete workflow guide
- **[OCR Providers](./docs/guide/ocr-providers.md)** - Provider configuration
- **[Mistral OCR Capabilities](./docs/guide/mistral-ocr-capabilities.md)** - Full API reference
- **[OCR Comparison Test](./OCR_COMPARISON_TEST.md)** - Vision vs OCR test results
- **[Getting Started](./docs/guide/getting-started.md)** - Detailed setup guide
- **[Session Logs](./docs/sessions/)** - Development history

---

## 🙏 Credits

### Original Foundation

This project is built on the excellent foundation from **[Sylphx](https://github.com/SylphxAI)** - thank you for the solid architecture and production-ready base!

Original features from Sylphx:
- Fast parallel processing (5-10x speedup)
- Y-coordinate content ordering
- Flexible path handling
- Per-page error resilience
- Comprehensive test coverage

### Enhanced Features

We've massively extended the project with:
- **Vision API support** for diagrams and technical illustrations
- **Enhanced OCR API** with full response structure
- **Smart content routing** (Vision vs OCR)
- **Comprehensive testing** with real-world validation
- **Complete documentation** rewrite

### Contributors

- **Sylphx Team** - Original architecture and core PDF processing
- **Martin & Claude Sonnet 4.5** - Vision/OCR integration, testing, documentation

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file

Original work Copyright (c) 2024 Sylphx
Enhanced features Copyright (c) 2025 Contributors

---

## 🔗 Links

- **This Fork:** [BadlyDrawnBoy/pdf-reader-mcp](https://github.com/BadlyDrawnBoy/pdf-reader-mcp) (local build only)
- **Original Repository:** [SylphxAI/pdf-reader-mcp](https://github.com/SylphxAI/pdf-reader-mcp)
- **Original npm Package:** [@sylphx/pdf-reader-mcp](https://www.npmjs.com/package/@sylphx/pdf-reader-mcp) (without Vision/OCR enhancements)
- **Mistral API:** [mistral.ai](https://mistral.ai)
- **MCP Protocol:** [modelcontextprotocol.io](https://modelcontextprotocol.io)

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

<div align="center">

**Built with ❤️ on the Sylphx foundation**

[Report Bug](https://github.com/BadlyDrawnBoy/pdf-reader-mcp/issues) • [Request Feature](https://github.com/BadlyDrawnBoy/pdf-reader-mcp/issues)

</div>
