<div align="center">

# 📄 PDF Reader MCP Server

### The Ultimate PDF Processing Engine for AI Agents

[![CI/CD](https://github.com/sylphxltd/pdf-reader-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/sylphxltd/pdf-reader-mcp/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/sylphxltd/pdf-reader-mcp/graph/badge.svg?token=VYRQFB40UN)](https://codecov.io/gh/sylphxltd/pdf-reader-mcp)
[![npm version](https://badge.fury.io/js/%40sylphx%2Fpdf-reader-mcp.svg)](https://www.npmjs.com/package/@sylphx/pdf-reader-mcp)
[![Downloads](https://img.shields.io/npm/dm/@sylphx/pdf-reader-mcp.svg)](https://www.npmjs.com/package/@sylphx/pdf-reader-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<a href="https://mseep.ai/app/sylphxltd-pdf-reader-mcp">
<img src="https://mseep.net/pr/sylphxltd-pdf-reader-mcp-badge.png" alt="MseeP.ai Security Assessment" width="240"/>
</a>

**Trusted by developers worldwide** • **Battle-tested** • **Production-ready**

[Features](#-features) • [Installation](#-installation) • [Quick Start](#-quick-start) • [Documentation](#-documentation)

</div>

---

## 🎯 Why Choose PDF Reader MCP?

> **Built for scale** - From hobbyist projects to enterprise production environments

### ⚡ Blazingly Fast
**5-10x speedup** with parallel processing. Process 50-page PDFs in seconds with automatic multi-core utilization.

### 🎯 Intelligent Content Ordering
**Y-coordinate based extraction** preserves document layout. Content flows naturally for AI models to understand spatial relationships.

### 🔒 Flexible & Secure
**Absolute & relative paths** supported. Works with any file location while maintaining security with configurable working directories.

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
- 🛡️ **Path Flexibility** - Windows, Unix, and relative paths all supported
- 🔍 **Error Resilience** - Per-page error isolation with detailed messages
- 📏 **Large File Support** - Efficient streaming and memory management
- 📝 **Type Safe** - Full TypeScript with strict mode enabled

---

## 🆕 What's New in v1.3.0

### 🎉 Absolute Paths Now Supported!

**No more** `"Absolute paths are not allowed"` **errors**

```json
// ✅ Windows - Both formats work!
{ "path": "C:\\Users\\John\\Documents\\report.pdf" }
{ "path": "C:/Users/John/Documents/report.pdf" }

// ✅ Unix/Mac
{ "path": "/home/john/documents/report.pdf" }
{ "path": "/Users/john/Documents/report.pdf" }

// ✅ Relative paths (still work as before)
{ "path": "documents/report.pdf" }
```

**Other Improvements:**
- 🐛 Fixed Zod validation error handling
- 📦 Updated all dependencies to latest versions
- ✅ 103 tests passing, 94%+ coverage maintained

<details>
<summary><strong>📋 View Full Changelog</strong></summary>

### v1.2.0 - Content Ordering
- Y-coordinate based text and image ordering
- Natural reading flow for AI models
- Intelligent line grouping

### v1.1.0 - Image Extraction & Performance
- Base64-encoded image extraction
- 10x speedup with parallel processing
- Comprehensive test coverage (94%+)

[View Full Changelog →](./CHANGELOG.md)

</details>

---

## 📦 Installation

### Quick Start (Recommended)

The fastest way to get started - **zero installation required**:

```bash
npx @sylphx/pdf-reader-mcp
```

### Using Package Managers

**For project integration:**

```bash
# Using pnpm (recommended)
pnpm add @sylphx/pdf-reader-mcp

# Using npm
npm install @sylphx/pdf-reader-mcp

# Using yarn
yarn add @sylphx/pdf-reader-mcp
```

### Using Smithery (Claude Desktop)

**Easiest way to install for Claude Desktop:**

```bash
npx -y @smithery/cli install @sylphx/pdf-reader-mcp --client claude
```

### Configuration

Add to your MCP client configuration (`claude_desktop_config.json`, Cursor settings, etc.):

```json
{
  "mcpServers": {
    "pdf-reader-mcp": {
      "command": "npx",
      "args": ["@sylphx/pdf-reader-mcp"]
    }
  }
}
```

<details>
<summary><strong>Advanced Configuration Options</strong></summary>

**Set custom working directory:**
```json
{
  "mcpServers": {
    "pdf-reader-mcp": {
      "command": "npx",
      "args": ["@sylphx/pdf-reader-mcp"],
      "cwd": "/path/to/your/documents"
    }
  }
}
```

**Use specific package version:**
```json
{
  "mcpServers": {
    "pdf-reader-mcp": {
      "command": "npx",
      "args": ["@sylphx/pdf-reader-mcp@1.3.0"]
    }
  }
}
```

**Local development setup:**
```bash
git clone https://github.com/sylphxltd/pdf-reader-mcp.git
cd pdf-reader-mcp
pnpm install && pnpm build
```

Then configure with: `"command": "node"` and `"args": ["/path/to/pdf-reader-mcp/dist/index.js"]`

</details>

---

## 🚀 Quick Start

Once installed, your AI agent can use the `read_pdf` tool. Here are common usage patterns:

### Basic Text Extraction

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

### With Absolute Paths (NEW!)

```json
// Windows
{
  "sources": [{
    "path": "C:\\Users\\John\\Downloads\\invoice.pdf"
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

### Extract Images with Content Ordering

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
- ✅ Text and images in **exact document order** (Y-coordinate sorted)
- ✅ Base64-encoded images with metadata (width, height, format)
- ✅ Natural reading flow preserved for AI comprehension

### Read from URLs

```json
{
  "sources": [{
    "url": "https://arxiv.org/pdf/2301.00001.pdf"
  }],
  "include_full_text": true
}
```

### Batch Processing (Parallel)

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

⚡ **All PDFs processed in parallel for maximum performance!**

### Metadata Only (Fast)

```json
{
  "sources": [{ "path": "large-document.pdf" }],
  "include_metadata": true,
  "include_page_count": true,
  "include_full_text": false
}
```

Perfect for quickly checking PDF properties without loading content.

---

## 📖 Advanced Usage

<details>
<summary><strong>📐 Content Ordering - Y-Coordinate Based</strong></summary>

<br/>

Our Y-coordinate based ordering ensures AI models receive content in natural reading sequence:

```
Document Layout (sorted by Y-coordinate):
┌─────────────────────────┐
│ [Title Text]      Y:100 │
│ [Chart Image]     Y:150 │
│ [Analysis Text]   Y:400 │
│ [Photo A]         Y:500 │
│ [Photo B]         Y:550 │
│ [Conclusion]      Y:750 │
└─────────────────────────┘

Content Parts Returned (Ordered):
[
  { type: "text", text: "Title..." },
  { type: "image", data: "base64..." },  // Chart
  { type: "text", text: "Analysis..." },
  { type: "image", data: "base64..." },  // Photo A
  { type: "image", data: "base64..." },  // Photo B
  { type: "text", text: "Conclusion..." }
]
```

**Benefits:**
- ✅ AI understands spatial relationships between text and images
- ✅ Natural document comprehension for vision-enabled models
- ✅ Automatic multi-line text grouping
- ✅ Perfect for complex layouts with mixed content

</details>

<details>
<summary><strong>🖼️ Image Extraction</strong></summary>

<br/>

**Enable image extraction:**

```json
{
  "sources": [{ "path": "technical-manual.pdf" }],
  "include_images": true
}
```

**Image Response Format:**
```json
{
  "images": [
    {
      "page": 1,
      "index": 0,
      "width": 1920,
      "height": 1080,
      "format": "rgb",
      "data": "iVBORw0KGgoAAAANSUhEUgAA..."
    }
  ]
}
```

**Supported Formats:**

| Format | Description | Use Case |
|--------|-------------|----------|
| RGB | Standard color | Photos, most images |
| RGBA | With transparency | Graphics, overlays |
| Grayscale | Black & white | Documents, scans |

**Auto-detected:** JPEG, PNG, and other embedded formats

**Performance Tips:**
- Use `pages` parameter to limit extraction scope
- Set `include_images: false` (default) for text-only extraction
- Images increase response size significantly
- Combine with pagination for large documents

</details>

<details>
<summary><strong>📂 Path Configuration Best Practices</strong></summary>

<br/>

### When to Use Each Path Type

**Absolute Paths** (v1.3.0+)
```json
// ✅ User file selections (drag & drop, file picker)
{ "path": "C:\\Users\\John\\Downloads\\invoice.pdf" }

// ✅ System-wide file access
{ "path": "/etc/documents/config.pdf" }
```

**Relative Paths**
```json
// ✅ Project files (version controlled, portable)
{ "path": "docs/architecture.pdf" }

// ✅ Workspace-relative files
{ "path": "./reports/2024/Q1.pdf" }
```

### Windows Path Normalization

Both forward slashes and backslashes work:

```json
{ "path": "C:\\Users\\John\\file.pdf" }  // ✅ Works
{ "path": "C:/Users/John/file.pdf" }     // ✅ Also works!
```

The server automatically normalizes paths across platforms.

</details>

<details>
<summary><strong>📊 Handling Large PDFs</strong></summary>

<br/>

### Strategy 1: Extract Page Ranges

```json
{
  "sources": [
    { "path": "500-page-manual.pdf", "pages": "1-20" }
  ]
}
```

### Strategy 2: Progressive Loading

```json
// Step 1: Get page count
{
  "sources": [{ "path": "large.pdf" }],
  "include_page_count": true,
  "include_full_text": false
}

// Step 2: Extract specific sections
{
  "sources": [{ "path": "large.pdf", "pages": "50-75" }]
}
```

### Strategy 3: Parallel Batching

```json
{
  "sources": [
    { "path": "large.pdf", "pages": "1-50" },
    { "path": "large.pdf", "pages": "51-100" },
    { "path": "large.pdf", "pages": "101-150" }
  ]
}
```

⚡ Server processes all batches in parallel automatically!

</details>

<details>
<summary><strong>📝 Page Specification Formats</strong></summary>

<br/>

Flexible page selection with multiple formats:

```json
// Array of specific pages (1-based indexing)
{ "pages": [1, 3, 5, 7] }

// Continuous range
{ "pages": "1-10" }

// Mixed ranges and individual pages
{ "pages": "1-5,10-15,20,25-30" }

// Omit for all pages
{ }
```

**Examples:**
- `"1-5"` → Pages 1, 2, 3, 4, 5
- `"1-5,10"` → Pages 1, 2, 3, 4, 5, 10
- `"1-3,7-9,15"` → Pages 1, 2, 3, 7, 8, 9, 15
- `[1, 5, 10]` → Pages 1, 5, 10

</details>

---

## 🔧 Troubleshooting

### ❌ "Absolute paths are not allowed"

**Solution:** Upgrade to v1.3.0+

```bash
npm update @sylphx/pdf-reader-mcp
# or
npx @sylphx/pdf-reader-mcp@latest
```

Then restart your MCP client completely.

---

### ❌ "File not found" errors

**Possible causes:**
1. File doesn't exist at the specified path
2. Incorrect working directory configuration
3. File permission issues

**Solutions:**

**Use absolute paths** (v1.3.0+):
```json
{ "path": "C:\\Full\\Path\\To\\file.pdf" }
```

**Or configure working directory for relative paths:**
```json
{
  "mcpServers": {
    "pdf-reader-mcp": {
      "command": "npx",
      "args": ["@sylphx/pdf-reader-mcp"],
      "cwd": "/path/to/your/documents"
    }
  }
}
```

**Verify file exists:**
```bash
# Windows
dir "C:\Path\To\file.pdf"

# Unix/Mac
ls -la /path/to/file.pdf
```

---

### ❌ "No tools" showing up

**Solution:** Clear cache and reinstall

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install @sylphx/pdf-reader-mcp@latest
```

**Important:** Restart your MCP client completely (not just reload window).

---

### ⚠️ Large response size with images

**Solutions:**
- Use `pages` parameter to limit extraction scope
- Set `include_images: false` if images not needed
- Extract text and images in separate requests
- Use pagination strategy for large documents

---

### ⚠️ Slow performance

**Optimization checklist:**
- ✅ Extract specific pages instead of full document
- ✅ Disable image extraction if not needed (`include_images: false`)
- ✅ Use batch processing for multiple PDFs (automatic parallelization)
- ✅ Get metadata/page count only when full text not required
- ✅ Server automatically uses parallel processing (5-10x faster)

---

## ⚡ Performance

### Real-World Benchmarks

| Operation | Ops/sec | Performance |
|:----------|:--------|:------------|
| Error handling (non-existent file) | ~12,933 | ⚡⚡⚡⚡⚡ |
| Extract full text | ~5,575 | ⚡⚡⚡⚡ |
| Extract specific page | ~5,329 | ⚡⚡⚡⚡ |
| Extract multiple pages | ~5,242 | ⚡⚡⚡⚡ |
| Metadata + page count | ~4,912 | ⚡⚡⚡ |

### Parallel Processing Benefits

| Document Size | Speedup vs Sequential |
|:--------------|:---------------------|
| 10-page PDF | **5-8x faster** |
| 50-page PDF | **10x faster** |
| 100+ page PDF | **Linear scalability** with CPU cores |

*Performance varies based on PDF complexity, image count, and system resources.*

---

## 🏗️ Architecture

### Tech Stack

| Component | Technology | Why |
|:----------|:-----------|:----|
| **Runtime** | Node.js 22+ ESM | Modern, fast, native ESM support |
| **PDF Engine** | PDF.js (Mozilla) | Battle-tested, reliable, used by Firefox |
| **Validation** | Zod + JSON Schema | Type-safe with auto-generated schemas |
| **Protocol** | MCP SDK | Official Model Context Protocol implementation |
| **Language** | TypeScript (strict) | Full type safety, zero compromises |
| **Testing** | Vitest | 103 tests, 94%+ coverage |
| **Code Quality** | Biome | 50x faster than ESLint, unified tooling |
| **CI/CD** | GitHub Actions | Automated testing and publishing |

### Design Principles

**🔒 Security First**
Flexible path handling with secure defaults and configurable working directories.

**🎯 Simple Interface**
Single tool handles all PDF operations with intuitive parameters.

**⚡ Performance**
Parallel processing, efficient memory management, and automatic optimization.

**🛡️ Reliability**
Comprehensive error handling, per-page isolation, detailed error messages.

**🧪 Quality**
103 tests, 94%+ coverage, strict TypeScript, zero lint errors.

**📝 Type Safety**
Full TypeScript, no `any` types, strict mode enabled throughout.

**🔄 Backward Compatible**
Smooth upgrades, no breaking changes, migration guides provided.

---

## 🧪 Development

<details>
<summary><strong>Setup & Available Scripts</strong></summary>

<br/>

### Prerequisites
- Node.js >= 22.0.0
- pnpm (recommended) or npm

### Setup
```bash
git clone https://github.com/sylphxltd/pdf-reader-mcp.git
cd pdf-reader-mcp
pnpm install && pnpm build
```

### Available Scripts
```bash
pnpm run build          # Build TypeScript → dist/
pnpm run watch          # Build in watch mode
pnpm run test           # Run all 103 tests
pnpm run test:watch     # Tests in watch mode
pnpm run test:cov       # Coverage report (94%+)
pnpm run check          # Lint + format check (Biome)
pnpm run check:fix      # Auto-fix all issues
pnpm run typecheck      # TypeScript type checking
pnpm run benchmark      # Performance benchmarks
pnpm run validate       # Full validation (check + test)
```

### Quality Standards
- ✅ 103 tests covering all functionality
- ✅ 94%+ code coverage (lines, statements)
- ✅ 98%+ function coverage
- ✅ Zero lint errors enforced by CI
- ✅ Strict TypeScript mode enabled

</details>

<details>
<summary><strong>Contributing Guidelines</strong></summary>

<br/>

We welcome contributions! 🎉

### Quick Start
1. Fork the repository
2. Create feature branch: `git checkout -b feature/awesome-feature`
3. Make changes and ensure tests pass: `pnpm test`
4. Format code: `pnpm run check:fix`
5. Commit with [Conventional Commits](https://www.conventionalcommits.org/)
6. Open Pull Request

### Commit Format
```
type(scope): description

Examples:
feat(images): add WebP format support
fix(paths): handle Windows UNC paths
docs(readme): update installation guide
test(parser): add edge case coverage
perf(extractor): optimize image processing
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

</details>

---

## 📚 Documentation

- 📖 [Full Documentation](https://sylphxltd.github.io/pdf-reader-mcp/) - Complete guides and API reference
- 🚀 [Getting Started](./docs/guide/getting-started.md) - Quick start guide
- 📘 [API Reference](./docs/api/README.md) - Detailed API documentation
- 🏗️ [Design Philosophy](./docs/design/index.md) - Architecture and decisions
- ⚡ [Performance Guide](./docs/performance/index.md) - Benchmarks and optimization
- 🔍 [Comparison](./docs/comparison/index.md) - vs. alternative solutions

---

## 🗺️ Roadmap

### ✅ Completed

- [x] Image extraction with metadata (v1.1.0)
- [x] Parallel processing 5-10x speedup (v1.1.0)
- [x] Y-coordinate content ordering (v1.2.0)
- [x] Absolute path support (v1.3.0)
- [x] Comprehensive test coverage 94%+ (v1.3.0)

### 🚀 Coming Soon

- [ ] OCR integration for scanned PDFs (Tesseract.js)
- [ ] PDF annotation extraction
- [ ] Form field data extraction
- [ ] Table structure detection and parsing
- [ ] Streaming support for 100+ MB files
- [ ] Advanced caching with LRU strategy
- [ ] PDF generation and manipulation tools

Vote on features at [GitHub Discussions](https://github.com/sylphxltd/pdf-reader-mcp/discussions)

---

## 🤝 Support & Community

### Get Help

[![GitHub Issues](https://img.shields.io/github/issues/sylphxltd/pdf-reader-mcp?style=for-the-badge&logo=github)](https://github.com/sylphxltd/pdf-reader-mcp/issues)
[![GitHub Discussions](https://img.shields.io/github/discussions/sylphxltd/pdf-reader-mcp?style=for-the-badge&logo=github)](https://github.com/sylphxltd/pdf-reader-mcp/discussions)

- 🐛 **Bug Reports:** [GitHub Issues](https://github.com/sylphxltd/pdf-reader-mcp/issues)
- 💬 **Questions & Discussions:** [GitHub Discussions](https://github.com/sylphxltd/pdf-reader-mcp/discussions)
- 📖 **Contributing:** [CONTRIBUTING.md](./CONTRIBUTING.md)
- 📧 **Email:** contact@sylphx.com

### Show Your Support

If you find this project valuable:

- ⭐ **Star the repository** to show appreciation
- 👀 **Watch** for updates on new features
- 🐛 **Report bugs** to help improve quality
- 💡 **Suggest features** to shape the roadmap
- 🔀 **Contribute code** to join development
- 📢 **Share** with your network and colleagues

---

## 📊 Project Stats

![GitHub Stars](https://img.shields.io/github/stars/sylphxltd/pdf-reader-mcp?style=social)
![GitHub Forks](https://img.shields.io/github/forks/sylphxltd/pdf-reader-mcp?style=social)
![npm Downloads](https://img.shields.io/npm/dm/@sylphx/pdf-reader-mcp)
![GitHub Contributors](https://img.shields.io/github/contributors/sylphxltd/pdf-reader-mcp)

**103 Tests** • **94%+ Coverage** • **Active Development** • **Production Ready**

---

## 🏆 Recognition

Featured on:
- [Smithery](https://smithery.ai/server/@sylphx/pdf-reader-mcp) - MCP server directory
- [Glama](https://glama.ai/mcp/servers/@sylphx/pdf-reader-mcp) - AI tools marketplace
- [MseeP.ai](https://mseep.ai/app/sylphxltd-pdf-reader-mcp) - Security validated

**Trusted by developers worldwide** • **Enterprise adoption** • **Battle-tested in production**

---

## 📄 License

MIT License - Free for personal and commercial use.

See [LICENSE](./LICENSE) for full details.

---

<div align="center">

**Built with ❤️ by [Sylphx](https://sylphx.com)**

*Building the future of AI-powered document processing*

---

[⬆ Back to Top](#-pdf-reader-mcp-server)

</div>
