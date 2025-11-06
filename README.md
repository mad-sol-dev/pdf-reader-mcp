# PDF Reader MCP Server

[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/sylphxltd-pdf-reader-mcp-badge.png)](https://mseep.ai/app/sylphxltd-pdf-reader-mcp)
[![CI/CD Pipeline](https://github.com/sylphxltd/pdf-reader-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/sylphxltd/pdf-reader-mcp/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/sylphxltd/pdf-reader-mcp/graph/badge.svg?token=VYRQFB40UN)](https://codecov.io/gh/sylphxltd/pdf-reader-mcp)
[![npm version](https://badge.fury.io/js/%40sylphx%2Fpdf-reader-mcp.svg)](https://badge.fury.io/js/%40sylphx%2Fpdf-reader-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![smithery badge](https://smithery.ai/badge/@sylphx/pdf-reader-mcp)](https://smithery.ai/server/@sylphx/pdf-reader-mcp)

<a href="https://glama.ai/mcp/servers/@sylphx/pdf-reader-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@sylphx/pdf-reader-mcp/badge" alt="PDF Reader Server MCP server" />
</a>

> 🚀 **The most powerful and reliable PDF reading server for AI agents** - Battle-tested, production-ready, and loved by developers worldwide.

**Supercharge your AI agents** with enterprise-grade PDF processing capabilities through the Model Context Protocol (MCP). Extract text, images, and metadata with unmatched performance and reliability.

## ⚡ Why Choose PDF Reader MCP?

- 🏆 **Production-Ready**: 94%+ test coverage, rigorous CI/CD, zero-compromise quality
- ⚡ **Blazingly Fast**: Parallel processing achieves 5-10x speedup on multi-page documents
- 🎯 **Intelligent Ordering**: Y-coordinate based content extraction preserves document layout
- 🖼️ **Advanced Image Extraction**: Extract embedded images with full metadata support
- 🔒 **Enterprise Security**: Both absolute and relative path support with flexible configuration
- 🌐 **Universal Compatibility**: Works with local files and remote URLs seamlessly
- 🎨 **Format Support**: RGB, RGBA, Grayscale images • JPEG, PNG, and more
- 📦 **Zero Config**: Works out of the box with sensible defaults
- 🔄 **Batch Processing**: Handle multiple PDFs in parallel for maximum efficiency
- 🛠️ **Developer Experience**: TypeScript-native, comprehensive error handling, detailed logging

## ✨ Features

### Core Capabilities
- 📄 **Text Extraction** - Full document or specific pages with intelligent parsing
- 🖼️ **Image Extraction** - Base64-encoded images with complete metadata
- 📐 **Content Ordering** - Preserve exact document layout using Y-coordinates
- 📊 **Metadata Extraction** - Author, title, creation date, and custom properties
- 🔢 **Page Counting** - Fast page enumeration without full content loading
- 🌐 **Dual Source Support** - Local files (absolute or relative paths) and HTTP/HTTPS URLs
- 🔄 **Batch Operations** - Process multiple PDFs concurrently
- 📦 **Flexible Deployment** - npm, npx, or Smithery installation

### Advanced Features
- ⚡ **5-10x Performance** - Parallel page processing with Promise.all
- 🎯 **Smart Pagination** - Extract specific pages or ranges (e.g., "1-5,10-15,20")
- 🖼️ **Multi-Format Images** - RGB, RGBA, Grayscale with automatic format detection
- 📍 **Y-Coordinate Ordering** - Content parts in natural reading sequence
- 🛡️ **Flexible Security** - Absolute/relative paths with configurable working directory
- 🔍 **Error Resilience** - Per-page error isolation, detailed error messages
- 📏 **Large File Handling** - Efficient streaming and memory management

## 🆕 Latest Updates

### v1.3.0 - Absolute Path Support (November 2025) 🎉
- ✅ **Absolute Paths Now Supported**: Windows (`C:\Users\...`) and Unix (`/home/...`) paths work flawlessly
- ✅ **Flexible Path Resolution**: Use absolute paths directly or relative paths resolved against `cwd`
- ✅ **Windows Native Support**: Proper handling of backslashes and drive letters
- ✅ **Enhanced Developer Experience**: No more "Absolute paths are not allowed" errors
- ✅ **Backward Compatible**: Existing relative path configurations continue to work
- 🐛 **Bug Fixes**: Improved Zod validation error handling

### v1.2.0 - Content Ordering
- ✅ **Y-Coordinate Based Ordering**: Text and images in exact document sequence
- ✅ **Natural Reading Flow**: AI understands content context with preserved layout
- ✅ **Intelligent Line Grouping**: Multi-line text blocks automatically merged
- ✅ **AI-Optimized**: Perfect for vision-enabled models

### v1.1.0 - Image Extraction & Performance
- ✅ **Image Extraction**: Base64-encoded images with metadata (width, height, format)
- ✅ **10x Faster**: Parallel page processing with Promise.all
- ✅ **Deep Refactoring**: Modular architecture with 94%+ test coverage
- ✅ **Format Support**: JPEG, PNG, RGB, RGBA, Grayscale

## 📦 Installation

### Quick Start (Recommended)

The fastest way to get started - no installation required:

```bash
npx @sylphx/pdf-reader-mcp
```

### Option 1: Using Smithery (Easiest for Claude Desktop)

Install automatically for Claude Desktop:

```bash
npx -y @smithery/cli install @sylphx/pdf-reader-mcp --client claude
```

### Option 2: Using npm/pnpm (Most Flexible)

Install the package:

```bash
# Using pnpm (recommended)
pnpm add @sylphx/pdf-reader-mcp

# Using npm
npm install @sylphx/pdf-reader-mcp
```

Configure your MCP client (e.g., Claude Desktop, Cursor, Cline):

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

**Pro Tip**: Set a custom working directory for your projects:

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

### Option 3: Local Development Build

```bash
git clone https://github.com/sylphxltd/pdf-reader-mcp.git
cd pdf-reader-mcp
pnpm install
pnpm run build
```

## 🚀 Quick Start Examples

### Example 1: Extract Text with Absolute Paths (NEW in v1.3.0!)

```json
{
  "sources": [
    {
      "path": "C:\\Users\\John\\Documents\\report.pdf"
    }
  ],
  "include_full_text": true,
  "include_metadata": true
}
```

**Windows Users**: Both forward slashes and backslashes work! The server handles path normalization automatically.

### Example 2: Extract Specific Pages

```json
{
  "sources": [
    {
      "path": "documents/annual-report.pdf",
      "pages": "1-5,10,15-20"
    }
  ],
  "include_full_text": true
}
```

### Example 3: Extract Images with Natural Ordering

```json
{
  "sources": [
    {
      "path": "presentation.pdf",
      "pages": [1, 2, 3]
    }
  ],
  "include_images": true,
  "include_full_text": true
}
```

**Response includes**:
- Text and images in exact document order (top to bottom)
- Base64-encoded images with metadata (width, height, format)
- Natural reading flow preserved for AI comprehension

### Example 4: Read from URL

```json
{
  "sources": [
    {
      "url": "https://arxiv.org/pdf/2301.00001.pdf"
    }
  ],
  "include_full_text": true,
  "include_metadata": true
}
```

### Example 5: Batch Process Multiple PDFs

```json
{
  "sources": [
    { "path": "C:\\Reports\\Q1.pdf", "pages": "1-10" },
    { "path": "/home/user/docs/Q2.pdf", "pages": "1-10" },
    { "url": "https://example.com/Q3.pdf" }
  ],
  "include_full_text": true,
  "include_metadata": true
}
```

**Processes all PDFs in parallel** - Maximum performance for bulk operations!

### Example 6: Metadata and Page Count Only (Lightning Fast)

```json
{
  "sources": [{ "path": "large-document.pdf" }],
  "include_metadata": true,
  "include_page_count": true,
  "include_full_text": false
}
```

Perfect for quickly scanning PDF properties without loading content.

## 📖 Advanced Usage

### Page Specification Formats

Flexible page selection with multiple formats:

- **Array**: `[1, 3, 5, 7]` - Specific pages (1-based indexing)
- **Range**: `"1-10"` - Continuous range
- **Mixed**: `"1-5,10-15,20,25-30"` - Combine ranges and individual pages
- **All pages**: Omit `pages` field entirely

### Content Ordering (v1.2.0+)

**Revolutionary Y-coordinate based ordering** ensures AI models receive content in natural reading sequence:

```
Document Layout:
┌─────────────────────┐
│ [Title Text]        │ ← Y: 100
│ [Image: Chart]      │ ← Y: 150
│ [Analysis Text]     │ ← Y: 400
│ [Image: Photo A]    │ ← Y: 500
│ [Image: Photo B]    │ ← Y: 550
│ [Conclusion]        │ ← Y: 750
└─────────────────────┘

Content Parts Returned (Ordered by Y-coordinate):
[
  { type: "text", text: "Title Text" },
  { type: "image", data: "base64..." },      // Chart
  { type: "text", text: "Analysis Text" },
  { type: "image", data: "base64..." },      // Photo A
  { type: "image", data: "base64..." },      // Photo B
  { type: "text", text: "Conclusion" }
]
```

**Benefits**:
- ✅ AI understands spatial relationships between text and images
- ✅ Natural document comprehension for vision models
- ✅ Automatic multi-line text grouping
- ✅ Perfect for complex layouts with mixed content

### Image Extraction Deep Dive

Extract embedded images with complete control:

```json
{
  "sources": [{ "path": "technical-manual.pdf" }],
  "include_images": true
}
```

**Image Response Format**:
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

**Supported Formats**:
- ✅ **RGB** - Standard color (most common)
- ✅ **RGBA** - With transparency/alpha channel
- ✅ **Grayscale** - Black and white
- ✅ **JPEG, PNG** - Automatic format detection

**Performance Tips**:
- 🔸 Images increase response size significantly
- 🔸 Use `pages` parameter to limit extraction scope
- 🔸 Set `include_images: false` (default) for text-only extraction
- 🔸 Perfect for AI models with vision capabilities (GPT-4V, Claude 3, etc.)

### Path Configuration Guide (v1.3.0+)

**Absolute Paths** (NEW - No longer restricted!):

```json
// Windows
{ "path": "C:\\Users\\John\\Documents\\report.pdf" }
{ "path": "C:/Users/John/Documents/report.pdf" }  // Also works!

// Unix/Mac
{ "path": "/home/john/documents/report.pdf" }
{ "path": "/Users/john/Documents/report.pdf" }
```

**Relative Paths**:

```json
// Resolved against process.cwd() or configured cwd
{ "path": "documents/report.pdf" }
{ "path": "./reports/2024/Q1.pdf" }
{ "path": "../shared/archive.pdf" }
```

**Best Practices**:
- ✅ Use absolute paths for user-specified files (drag & drop, file picker)
- ✅ Use relative paths for project files (version controlled, portable)
- ✅ Configure `cwd` in MCP settings for workspace-relative paths
- ✅ Windows: Both `\` and `/` work - use what's comfortable!

### Working with Large PDFs

**Strategy 1**: Extract specific pages to avoid context limits

```json
{
  "sources": [
    { "path": "500-page-manual.pdf", "pages": "1-20" }
  ]
}
```

**Strategy 2**: Get metadata first, then fetch specific sections

```json
// Step 1: Get page count
{
  "sources": [{ "path": "large.pdf" }],
  "include_page_count": true,
  "include_full_text": false
}

// Step 2: Extract sections as needed
{
  "sources": [
    { "path": "large.pdf", "pages": "50-75" }
  ]
}
```

**Strategy 3**: Process in batches with parallel execution

```json
{
  "sources": [
    { "path": "large.pdf", "pages": "1-50" },
    { "path": "large.pdf", "pages": "51-100" },
    { "path": "large.pdf", "pages": "101-150" }
  ]
}
```

## 🔧 Troubleshooting

### Issue: "Absolute paths are not allowed" (FIXED in v1.3.0)

**Upgrade to v1.3.0+** to use absolute paths:

```bash
npm update @sylphx/pdf-reader-mcp
# or
npx @sylphx/pdf-reader-mcp@latest
```

Then restart your MCP client. Absolute paths now work perfectly!

### Issue: "File not found" errors

**Possible Causes**:
1. Incorrect working directory
2. File doesn't exist at specified path
3. Permission issues

**Solutions**:

**For absolute paths** (v1.3.0+):
```json
{
  "sources": [
    { "path": "C:\\Full\\Path\\To\\file.pdf" }
  ]
}
```

**For relative paths**, configure `cwd`:
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

**Verify file exists**:
```bash
# Windows
dir "C:\Path\To\file.pdf"

# Unix/Mac
ls -la /path/to/file.pdf
```

### Issue: "No tools" showing up

**Solution**: Clear cache and reinstall:

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install @sylphx/pdf-reader-mcp@latest
```

Then **restart your MCP client completely** (not just reload).

### Issue: Large response size with images

**Solutions**:
- Use `pages` parameter to limit extraction
- Set `include_images: false` if images not needed
- Extract text and images in separate requests
- Use pagination for large documents

### Issue: Slow performance on large PDFs

**Optimization checklist**:
- ✅ Extract specific pages instead of full document
- ✅ Disable image extraction if not needed
- ✅ Use batch processing for multiple PDFs
- ✅ Get metadata/page count only when full text not required
- ✅ Server automatically uses parallel processing (5-10x faster)

## ⚡ Performance Benchmarks

**Real-world performance** on production workloads:

| Operation                          | Ops/sec | Relative Speed |
| :--------------------------------- | :------ | :------------- |
| Error handling (non-existent file) | ~12,933 | ⚡⚡⚡⚡⚡         |
| Extract full text                  | ~5,575  | ⚡⚡⚡⚡          |
| Extract specific page              | ~5,329  | ⚡⚡⚡⚡          |
| Extract multiple pages             | ~5,242  | ⚡⚡⚡⚡          |
| Metadata + page count              | ~4,912  | ⚡⚡⚡           |

**Parallel Processing Benefits**:
- 10-page PDF: **5-8x faster** than sequential
- 50-page PDF: **10x faster** than sequential
- 100+ page PDF: **Linear scalability** with CPU cores

_Performance varies based on PDF complexity, image count, and system resources._

See [Performance Documentation](./docs/performance/index.md) for detailed benchmarks.

## 🏗️ Architecture & Tech Stack

### Technology
- **Runtime**: Node.js 22+ (ESM modules)
- **PDF Engine**: PDF.js (pdfjs-dist) - Mozilla's battle-tested engine
- **Validation**: Zod with automatic JSON Schema generation
- **Protocol**: MCP SDK (@modelcontextprotocol/sdk)
- **Language**: TypeScript (strict mode)
- **Testing**: Vitest with 94%+ coverage (103 tests)
- **Code Quality**: Biome (50x faster than ESLint + Prettier)
- **CI/CD**: GitHub Actions with automated testing and publishing

### Design Principles

1. 🔒 **Security First** - Flexible path handling with secure defaults
2. 🎯 **Simple Interface** - Single tool handles all PDF operations elegantly
3. 📊 **Structured Output** - Predictable JSON format optimized for AI parsing
4. ⚡ **Performance** - Parallel processing, efficient memory management
5. 🛡️ **Reliability** - Comprehensive error handling, per-page isolation
6. 🧪 **Test Coverage** - 103 tests, 94%+ coverage, zero compromises
7. 📝 **Type Safety** - Full TypeScript, no any types, strict mode
8. 🔄 **Backward Compatible** - Smooth upgrades, no breaking changes

See [Design Philosophy](./docs/design/index.md) for architectural deep dive.

## 🧪 Development

### Prerequisites
- Node.js >= 22.0.0
- pnpm (recommended) or npm

### Setup
```bash
git clone https://github.com/sylphxltd/pdf-reader-mcp.git
cd pdf-reader-mcp
pnpm install
pnpm run build
```

### Development Scripts
```bash
pnpm run build          # Build TypeScript → dist/
pnpm run watch          # Build in watch mode
pnpm run test           # Run all 103 tests
pnpm run test:watch     # Tests in watch mode
pnpm run test:cov       # Coverage report (94%+)
pnpm run check          # Lint + format check (Biome)
pnpm run check:fix      # Auto-fix all issues
pnpm run typecheck      # TypeScript validation
pnpm run benchmark      # Performance benchmarks
pnpm run validate       # Full validation (check + test)
```

### Testing & Quality
- **103 tests** covering all functionality
- **94%+ code coverage** (lines, statements)
- **98%+ function coverage**
- **Zero lint errors** enforced by CI
- **Strict TypeScript** mode enabled

```bash
pnpm run test         # All tests must pass
pnpm run test:cov     # Generate coverage report
pnpm run check        # Code quality check
```

### Contributing

We welcome contributions! 🎉

**Quick Start**:
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/awesome-feature`
3. Make your changes and ensure tests pass: `pnpm test`
4. Format code: `pnpm run check:fix`
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/)
6. Open a Pull Request

**Commit Format**:
```
type(scope): description

feat(images): add WebP format support
fix(paths): handle Windows UNC paths
docs(readme): update installation guide
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## 📚 Documentation

- 📖 **[Full Documentation](https://sylphxltd.github.io/pdf-reader-mcp/)** - Complete guides and API reference
- 🚀 **[Getting Started](./docs/guide/getting-started.md)** - Quick start guide
- 📘 **[API Reference](./docs/api/README.md)** - Detailed API documentation
- 🏗️ **[Design Philosophy](./docs/design/index.md)** - Architecture decisions
- ⚡ **[Performance](./docs/performance/index.md)** - Benchmarks and optimization
- 🔍 **[Comparison](./docs/comparison/index.md)** - vs. other PDF solutions

## 🗺️ Roadmap

**Completed** ✅
- [x] Image extraction (v1.1.0)
- [x] Parallel processing 5-10x speedup (v1.1.0)
- [x] Y-coordinate content ordering (v1.2.0)
- [x] Absolute path support (v1.3.0)

**Coming Soon** 🚀
- [ ] OCR integration for scanned PDFs (Tesseract.js)
- [ ] PDF annotation extraction
- [ ] Form field data extraction
- [ ] Table structure detection
- [ ] Streaming support for 100+ MB files
- [ ] Advanced caching with LRU
- [ ] PDF generation/manipulation

## 🤝 Support & Community

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/sylphxltd/pdf-reader-mcp/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/sylphxltd/pdf-reader-mcp/discussions)
- 📖 **Contributing**: [CONTRIBUTING.md](./CONTRIBUTING.md)
- 📧 **Email**: contact@sylphx.com

### Show Your Support

If you find this project valuable:

- ⭐ **Star the repository** - Show your appreciation!
- 👀 **Watch for updates** - Stay informed about new features
- 🐛 **Report bugs** - Help us improve quality
- 💡 **Suggest features** - Shape the roadmap
- 🔀 **Contribute code** - Join the development
- 📢 **Spread the word** - Share with your network

## 📊 Project Stats

- 🌟 **Stars**: Growing community of users
- 🔧 **Commits**: Active development
- ✅ **Tests**: 103 tests, 94%+ coverage
- 📦 **Downloads**: Trusted by developers worldwide
- 🚀 **Releases**: Regular updates and improvements

## 🏆 Recognition

- Featured on [Smithery](https://smithery.ai/server/@sylphx/pdf-reader-mcp)
- Listed on [Glama MCP Servers](https://glama.ai/mcp/servers/@sylphx/pdf-reader-mcp)
- Security validated by [MseeP.ai](https://mseep.ai/app/sylphxltd-pdf-reader-mcp)
- Production-ready with enterprise adoption

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

Free for personal and commercial use. Attribution appreciated but not required.

---

<p align="center">
  <strong>Made with ❤️ by <a href="https://sylphx.com">Sylphx</a></strong><br>
  <sub>Building the future of AI-powered document processing</sub>
</p>

<p align="center">
  <a href="#-installation">Installation</a> •
  <a href="#-quick-start-examples">Quick Start</a> •
  <a href="#-advanced-usage">Advanced Usage</a> •
  <a href="#-documentation">Documentation</a> •
  <a href="#-support--community">Support</a>
</p>
