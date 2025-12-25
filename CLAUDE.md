# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Test Commands

```bash
# Build the project
bun run build

# Run all tests
bun run test
# or via Vitest directly
bunx vitest run

# Run tests in watch mode
bun run test:watch

# Generate coverage report
bun run test:cov

# Run benchmarks
bun run benchmark

# Type checking
bun run typecheck
```

## Code Quality Commands

```bash
# Run linting and formatting checks
bun run check

# Auto-fix linting and formatting issues
bun run check:fix

# Lint only
bun run lint

# Format only
bun run format

# Complete validation (lint + format + tests)
bun run validate
```

## Running the MCP Server

```bash
# Run the built server
bun run start
# or
node dist/index.js

# Run with MCP Inspector for debugging
bun run inspector
```

## Architecture Overview

### Core Design Philosophy

This is an **MCP (Model Context Protocol) server** that provides PDF processing capabilities to AI agents. The architecture emphasizes:

- **Specialized tool handlers** - Each MCP tool (pdf_info, pdf_read, pdf_vision, pdf_ocr, etc.) has a dedicated handler in `src/handlers/`
- **Parallel processing** - Uses Promise.all for 5-10x speedup when processing multiple pages or PDFs
- **Y-coordinate ordering** - Content is ordered by Y-position to preserve natural reading flow
- **Per-page error isolation** - Individual page failures don't crash entire documents
- **Fingerprint-based caching** - Text, Vision, and OCR results are cached using document fingerprints (memory + disk)
- **Guardrails** - Large document operations require explicit opt-in (allow_full_document flag) to prevent accidental resource exhaustion
- **Vision & OCR separation** - Dedicated tools for diagrams (pdf_vision) vs text extraction (pdf_ocr)

### Layer Structure

```
src/
├── index.ts              # MCP server setup and tool registration
├── handlers/             # MCP tool implementations (one per tool)
│   ├── pdfInfo.ts       # Metadata extraction (pdf_info)
│   ├── pdfRead.ts       # Text extraction with markers (pdf_read)
│   ├── pdfVision.ts     # Vision API for diagrams (pdf_vision) - NEW!
│   ├── pdfOcr.ts        # OCR for scanned docs (pdf_ocr)
│   ├── extractImage.ts  # Raw image extraction (pdf_extract_image)
│   ├── searchPdf.ts     # Text search (pdf_search)
│   └── cache.ts         # Cache management (_pdf_cache_clear)
├── pdf/                  # PDF processing core
│   ├── loader.ts        # Document loading (files/URLs)
│   ├── parser.ts        # Page selection and parsing logic
│   ├── extractor.ts     # Content extraction (text + images)
│   ├── text.ts          # Text normalization and ordering
│   └── render.ts        # Page rendering to PNG
├── schemas/              # @sylphx/vex validation schemas
│   ├── pdfSource.ts     # Shared source/pages schemas
│   ├── pdfInfo.ts       # pdf_info schema
│   ├── pdfRead.ts       # pdf_read schema
│   ├── pdfVision.ts     # pdf_vision schema - NEW!
│   ├── pdfOcr.ts        # pdf_ocr schema
│   ├── pdfSearch.ts     # pdf_search schema
│   └── extractImage.ts  # pdf_extract_image schema
├── utils/                # Shared utilities
│   ├── cache.ts         # In-memory fingerprint-based caching
│   ├── diskCache.ts     # Persistent disk cache for OCR/Vision - NEW!
│   ├── fingerprint.ts   # Document identity hashing
│   ├── pathUtils.ts     # Path resolution (absolute/relative)
│   ├── ocr.ts           # OCR/Vision provider integration
│   ├── errors.ts        # Custom error types
│   └── logger.ts        # Structured logging
└── types/                # TypeScript type definitions
    ├── pdf.ts           # Domain types
    └── cache.ts         # Cache types
```

### Handler Pattern

Each handler follows this structure:
1. **Define schema** using @sylphx/vex in `schemas/`
2. **Export tool** using `tool()` from @sylphx/mcp-server-sdk
3. **Process sources** in parallel with Promise.all
4. **Return results** as array of {source, success, data?, error?}

Example:
```typescript
export const pdfRead = tool()
  .description('Extract structured text from PDF pages')
  .input(pdfReadArgsSchema)
  .handler(async ({ input }) => {
    const results = await Promise.all(
      input.sources.map(async (source) => {
        // Per-source error handling
        // Return { source, success, data/error }
      })
    );
    return [text(JSON.stringify({ results }))];
  });
```

### PDF Processing Flow

1. **Load document** (loader.ts) - Handles both files and URLs, validates size (<100MB)
2. **Parse page spec** (parser.ts) - Converts "1-5,10" or [1,2,3] to page numbers
3. **Apply guardrails** (parser.ts) - Enforces sampling limits unless allow_full_document=true
4. **Extract content** (extractor.ts) - Pulls text/images with Y-coordinates
5. **Order content** (text.ts) - Sorts by Y-position and groups into lines
6. **Cache results** (cache.ts) - Stores using fingerprint + page + options as key

### Validation with @sylphx/vex

The project uses **@sylphx/vex** (not Zod/Joi) for schema validation:

```typescript
import { object, str, bool, optional, array } from '@sylphx/vex';

const schema = object({
  path: optional(str(min(1))),
  include_metadata: optional(bool),
});
```

Vex schemas are used both for:
- MCP tool input validation (via inputSchema)
- Internal validation with safeParse()

### Caching Strategy

**Three-layer cache architecture:**

1. **In-Memory Cache** (`utils/cache.ts`):
   - Text cache: `fingerprint#page#options` → PdfPageText
   - OCR cache: `fingerprint#page/image#provider` → OcrResult
   - Fast repeated access within same session

2. **Disk Cache** (`utils/diskCache.ts`):
   - Persistent storage: `{pdf_basename}_ocr.json` next to PDF
   - Survives MCP server restarts
   - Vision/OCR results only (expensive API calls)
   - Fingerprint validation prevents stale data

Fingerprints are SHA-256 hashes of first 64KB of PDF (fast uniqueness check).

**Cache workflow:** Memory → Disk → API call

### Testing with Vitest

Tests use Vitest (not Bun test runner despite using Bun for builds):

```typescript
import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock pdfjs-dist
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({...}));

describe('handler name', () => {
  it('should handle X', async () => {
    // Test using mocked PDF.js
  });
});
```

Run single test file:
```bash
bunx vitest run test/handlers/readPdf.test.ts
```

Pre-commit runs `bun run test` (Vitest), matching the test suite's APIs.

### Guardrail System

Large documents (>DEFAULT_SAMPLE_PAGE_LIMIT pages) trigger sampling warnings unless:
- `pages` parameter is explicitly provided, OR
- `allow_full_document=true` is set

This prevents accidental full reads of 1000+ page PDFs. The warning is added to the `warnings` array in results.

### Vision & OCR Tools

**Major feature split:**
- `pdf_vision` - Uses Mistral Vision API for technical diagrams, charts, flowcharts
- `pdf_ocr` - Uses Mistral OCR API for scanned documents, forms, tables

**Key differences:**
- Vision API: Semantic understanding of visual content (~$0.003/image)
- OCR API: Text extraction from scans (~$0.002/page)
- Auto-fallback: Returns PNG image if MISTRAL_API_KEY not configured
- Both support page-level and image-level extraction

See `TESTING_NOTES.md` for real-world validation (897-page chip datasheets).

## Important Notes

### PDF.js Integration
- Uses pdfjs-dist v5.x with legacy build for Node.js
- CMap files resolved relative to pdfjs-dist package location
- Canvas package required for page rendering

### Path Handling
- Supports both absolute and relative paths (v1.3.0+)
- Windows paths work with both `\` and `/`
- Relative paths resolved against process.cwd()
- resolvePath() in pathUtils.ts handles all normalization

### Biome Configuration
- Extends @sylphx/biome-config
- Cognitive complexity limited to 10 (relaxed for pdf/handlers)
- No explicit `any` types allowed (error level)
- Line width: 100 characters
- Single quotes, semicolons, 2-space indent

### Conventional Commits
Required format for commits:
```
feat(images): add WebP support
fix(paths): handle UNC paths correctly
docs(readme): update API examples
test(loader): add URL loading tests
```

Enforced via commitlint (if lefthook is installed).

### Package Manager
Project uses **Bun 1.3.x** as package manager (see packageManager in package.json).
Install dependencies with `bun install`.

### Build System
- `bunup` for TypeScript compilation (not tsc directly)
- Outputs to `dist/` directory
- ESM modules only (type: "module")
- Node.js >=22.0.0 required
