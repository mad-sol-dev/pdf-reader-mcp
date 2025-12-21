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

- **Specialized tool handlers** - Each MCP tool (pdf_get_metadata, pdf_read_pages, etc.) has a dedicated handler in `src/handlers/`
- **Parallel processing** - Uses Promise.all for 5-10x speedup when processing multiple pages or PDFs
- **Y-coordinate ordering** - Content is ordered by Y-position to preserve natural reading flow
- **Per-page error isolation** - Individual page failures don't crash entire documents
- **Fingerprint-based caching** - Text and OCR results are cached using document fingerprints
- **Guardrails** - Large document operations require explicit opt-in (allow_full_document flag) to prevent accidental resource exhaustion

### Layer Structure

```
src/
├── index.ts              # MCP server setup and tool registration
├── handlers/             # MCP tool implementations (one per tool)
│   ├── readPdf.ts       # Legacy all-in-one tool (backward compatible)
│   ├── getMetadata.ts   # Metadata extraction
│   ├── readPages.ts     # Structured page reading
│   ├── searchPdf.ts     # Text search
│   ├── renderPage.ts    # Page rasterization
│   ├── ocrPage.ts       # OCR for rendered pages
│   ├── cache.ts         # Cache management
│   └── ...
├── pdf/                  # PDF processing core
│   ├── loader.ts        # Document loading (files/URLs)
│   ├── parser.ts        # Page selection and parsing logic
│   ├── extractor.ts     # Content extraction (text + images)
│   ├── text.ts          # Text normalization and ordering
│   └── render.ts        # Page rendering to PNG
├── schemas/              # @sylphx/vex validation schemas
│   ├── pdfSource.ts     # Shared source/pages schemas
│   ├── readPages.ts     # Per-tool input schemas
│   └── ...
├── utils/                # Shared utilities
│   ├── cache.ts         # Fingerprint-based caching
│   ├── fingerprint.ts   # Document identity hashing
│   ├── pathUtils.ts     # Path resolution (absolute/relative)
│   ├── errors.ts        # Custom error types
│   └── logger.ts        # Structured logging
└── types/                # TypeScript type definitions
    └── pdf.ts           # Domain types
```

### Handler Pattern

Each handler follows this structure:
1. **Define schema** using @sylphx/vex in `schemas/`
2. **Export tool** using `tool()` from @sylphx/mcp-server-sdk
3. **Process sources** in parallel with Promise.all
4. **Return results** as array of {source, success, data?, error?}

Example:
```typescript
export const pdfReadPages = tool({
  description: 'Extract structured text from PDF pages',
  inputSchema: readPagesArgsSchema,
  handler: async (args) => {
    // Parallel processing of all sources
    const results = await Promise.all(
      args.sources.map(async (source) => {
        // Per-source error handling
        // Return { source, success, data/error }
      })
    );
    return text(JSON.stringify({ results }));
  }
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

Two separate caches with fingerprint-based keys:
- **Text cache**: `fingerprint#page#options` → PdfPageText
- **OCR cache**: `fingerprint#page/image#provider` → OcrResult

Fingerprints are SHA-256 hashes of first 64KB of PDF (fast uniqueness check).

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

### Guardrail System

Large documents (>DEFAULT_SAMPLE_PAGE_LIMIT pages) trigger sampling warnings unless:
- `pages` parameter is explicitly provided, OR
- `allow_full_document=true` is set

This prevents accidental full reads of 1000+ page PDFs. The warning is added to the `warnings` array in results.

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
