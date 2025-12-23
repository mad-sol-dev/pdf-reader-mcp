# PDF Reader MCP - LLM-Friendly Refactoring Plan

## Goal
Simplify the MCP server to 5 core tools + 1 advanced tool with clear workflow guidance for LLMs.

## Current State (13 tools)
- pdf_get_metadata
- pdf_get_page_stats
- pdf_get_toc
- pdf_list_images
- pdf_get_image
- pdf_render_page
- pdf_ocr_page
- pdf_ocr_image
- pdf_cache_stats
- pdf_cache_clear
- pdf_read_pages
- pdf_search
- read_pdf (legacy)

## Target State (6 tools)

### Core Tools
1. **pdf_info** - Quick metadata check (PRE-STAGE)
2. **pdf_read** - Text extraction with [IMAGE] markers (STAGE 1)
3. **pdf_extract_image** - Diagram extraction for vision (STAGE 2)
4. **pdf_ocr** - Text from images/scanned pages (STAGE 3)
5. **pdf_search** - Search shortcut

### Advanced Tools
6. **_pdf_cache_clear** - Cache management (edge cases)

---

# Implementation Plan

## Phase 1: Tool Consolidation & Schemas

### 1.1 Create New Handler: `pdfInfo.ts`

**File:** `src/handlers/pdfInfo.ts`

**Action:** Merge functionality from:
- `getMetadata.ts` (document info)
- `getToc.ts` (table of contents)
- `getPageStats.ts` (page/image counts)

**New Schema:** `src/schemas/pdfInfo.ts`
```typescript
export const pdfInfoArgsSchema = object({
  source: pdfSourceSchema,
  include: optional(array(str(description(
    'Optional info to include: "toc" (table of contents), "stats" (page statistics). ' +
    'Omit for basic metadata only.'
  ))))
});
```

**Handler Logic:**
```typescript
- Always return: pages, title, author, language, fingerprint
- If include.includes("toc"): Add has_toc, toc_entries
- If include.includes("stats"): Add has_images, image_count
- Add next_step suggestions based on content
```

**Description:**
```
QUICK CHECK: Get PDF metadata and overview

Use for fast answers without loading content:
- How many pages?
- Title/author/language?
- Has table of contents?
- Has images?

Returns basic metadata. Use pdf_read (Stage 1) to read actual content.
```

---

### 1.2 Rename `readPages.ts` → `pdfRead.ts`

**File:** `src/handlers/readPages.ts` → `src/handlers/pdfRead.ts`

**Changes:**
- Rename tool from `pdfReadPages` to `pdfRead`
- Update schema name to `readArgsSchema`
- Keep all existing functionality (insert_markers, etc.)

**Updated Description:**
```
★ STAGE 1: Read text from PDF pages - START HERE ★

This is your FIRST STEP for any PDF content analysis.

Returns:
- Text content with [IMAGE 0], [IMAGE 1] markers showing image positions
- Image metadata (size, count) when images present

Next steps:
- Text complete? → DONE
- Found [IMAGE]? → Use pdf_extract_image (Stage 2) for diagrams or pdf_ocr (Stage 3) for text
- No text/images? → Scanned document, use pdf_ocr on entire page

Examples:
  pdf_read({source: {path: "doc.pdf"}, pages: "1-10"})
  pdf_read({source: {path: "doc.pdf"}, pages: [1,5,10]})
```

**Add Response Enhancement:**
```typescript
// After processing pages, add workflow hints:
if (foundImages) {
  result.next_step = {
    suggestion: `Found ${imageCount} images. Use pdf_extract_image (Stage 2) for diagrams or pdf_ocr (Stage 3) for text extraction.`,
    tools: ["pdf_extract_image", "pdf_ocr"]
  };
}
```

---

### 1.3 Rename `getImage.ts` → `pdfExtractImage.ts`

**File:** `src/handlers/getImage.ts` → `src/handlers/pdfExtractImage.ts`

**Changes:**
- Rename tool from `pdfGetImage` to `pdfExtractImage`
- Keep all functionality

**Updated Description:**
```
STAGE 2: Extract diagrams/charts for visual analysis

WHEN TO USE:
✓ Flowcharts, schematics, timing diagrams
✓ Architecture diagrams, block diagrams
✗ Tables/text (use pdf_ocr instead - faster, cached)

PREREQUISITE: Run pdf_read (Stage 1) first to get [IMAGE] markers and index.

Returns: Base64-encoded PNG for your vision analysis.

Example:
  # After pdf_read shows "[IMAGE 0] [IMAGE 1]"
  pdf_extract_image({source: {path: "doc.pdf"}, page: 61, index: 1})
```

**Add Response Note:**
```json
{
  "image_base64": "...",
  "width": 918,
  "height": 482,
  "stage": "2-vision",
  "note": "Diagram extracted for vision analysis. For text extraction, use pdf_ocr (Stage 3)."
}
```

---

### 1.4 Merge OCR Tools: Create `pdfOcr.ts`

**File:** `src/handlers/pdfOcr.ts` (new unified handler)

**Action:** Merge functionality from:
- `ocrPage.ts` (page OCR)
- `ocrImage.ts` (image OCR)

**New Schema:** `src/schemas/pdfOcr.ts`
```typescript
export const pdfOcrArgsSchema = object({
  source: pdfSourceSchema,
  page: num(gte(1), description('1-based page number')),
  image: optional(num(gte(0), description('0-based image index. Omit to OCR entire page.'))),
  language: optional(str(description('Language hint: "en", "de", "zh", etc.'))),
  return_image: optional(union(
    bool,
    str,
    description(
      'Image return mode: ' +
      'true = only image (skip OCR), ' +
      '"with_ocr" = both text and image, ' +
      'false/omit = only OCR text (default)'
    )
  ))
});
```

**Handler Logic:**
```typescript
// 1. Check return_image parameter
if (return_image === true) {
  return extractImageOnly();
}

// 2. Get configured provider
const provider = getConfiguredProvider();

if (!provider) {
  // Auto-fallback to image
  return {
    image_base64: await extractImage(),
    ocr_available: false,
    note: "OCR not configured. Image provided for vision. Set MISTRAL_API_KEY for OCR."
  };
}

// 3. Perform OCR
const result = image !== undefined
  ? await ocrImage(source, page, image, provider, language)
  : await ocrPage(source, page, provider, language);

// 4. Include image if requested
if (return_image === 'with_ocr') {
  result.image_base64 = await extractImage();
}

return result;
```

**Updated Description:**
```
STAGE 3: Extract text from images/scanned pages using OCR

WHEN TO USE:
✓ Tables, forms, scanned documents
✓ Text embedded in images
✗ PDFs with selectable text (use pdf_read Stage 1)
✗ Pure diagrams (use pdf_extract_image Stage 2)

PREREQUISITE: Run pdf_read (Stage 1) first to check if text already available.

AUTO-BEHAVIOR:
- OCR configured? → Returns text (fast, cached)
- No OCR? → Returns image for your vision (fallback)
- return_image=true? → Returns image for manual analysis

Examples:
  # OCR specific image (after finding [IMAGE 2] in pdf_read)
  pdf_ocr({source: {path: "doc.pdf"}, page: 61, image: 2})

  # OCR entire scanned page
  pdf_ocr({source: {path: "scan.pdf"}, page: 1})

  # Get both OCR text and image for verification
  pdf_ocr({source: {path: "doc.pdf"}, page: 5, return_image: "with_ocr"})
```

---

### 1.5 Keep `searchPdf.ts` as `pdf_search`

**File:** `src/handlers/searchPdf.ts`

**Changes:** Only update description

**Updated Description:**
```
SHORTCUT: Search for specific text across PDF

Use when you know WHAT you're looking for (keywords, pin numbers, etc.).
Faster than reading all pages manually.

Returns: Page numbers with text context around matches.

Supports regex patterns (use carefully).

Example:
  pdf_search({source: {path: "doc.pdf"}, query: "GPE\\[10\\]", max_results: 10})
```

---

### 1.6 Rename `cache.ts` tools

**File:** `src/handlers/cache.ts`

**Changes:**
- Remove `pdfCacheStats` tool entirely (not needed by LLM)
- Rename `pdfCacheClear` to `_pdfCacheClear` (underscore prefix)

**Updated Description for `_pdfCacheClear`:**
```
[ADVANCED] Clear OCR cache

Rarely needed - cache is automatically managed.

Use only when:
- Document was updated and you need fresh OCR
- OCR gave incorrect results and you want to retry

Omit source parameter to clear entire cache.

Example:
  _pdf_cache_clear({source: {path: "doc.pdf"}})
  _pdf_cache_clear()  # Clear all
```

---

### 1.7 Remove Deprecated Tools

**Files to remove:**
- `src/handlers/renderPage.ts` (used internally by OCR, not exposed)
- `src/handlers/listImages.ts` (functionality merged into pdf_read + pdf_info)
- `src/handlers/readPdf.ts` (legacy, replaced by pdf_read)

---

## Phase 2: Provider Configuration Simplification

### 2.1 Server-Side Provider Config

**File:** `src/utils/ocr.ts`

**Add new function:**
```typescript
/**
 * Get configured OCR provider from environment.
 * Returns null if no provider is configured.
 */
export function getConfiguredProvider(): OcrProvider | null {
  const mistralKey = process.env.MISTRAL_API_KEY;

  if (mistralKey) {
    return {
      type: 'mistral-ocr',
      apiKey: mistralKey,
      model: process.env.MISTRAL_OCR_MODEL || 'pixtral-12b-2409',
      endpoint: process.env.MISTRAL_OCR_ENDPOINT,
      timeout: process.env.MISTRAL_OCR_TIMEOUT
        ? parseInt(process.env.MISTRAL_OCR_TIMEOUT)
        : 30000
    };
  }

  // Check for custom HTTP endpoint
  const httpEndpoint = process.env.OCR_HTTP_ENDPOINT;
  if (httpEndpoint) {
    return {
      type: 'http',
      endpoint: httpEndpoint,
      apiKey: process.env.OCR_HTTP_API_KEY,
      timeout: process.env.OCR_HTTP_TIMEOUT
        ? parseInt(process.env.OCR_HTTP_TIMEOUT)
        : 30000
    };
  }

  return null;
}
```

### 2.2 Remove Provider Parameter from OCR Schema

**File:** `src/schemas/ocr.ts` (becomes `src/schemas/pdfOcr.ts`)

**Remove:**
```typescript
export const ocrProviderSchema = object({...});  // DELETE THIS
```

**Simplify to:**
```typescript
export const pdfOcrArgsSchema = object({
  source: pdfSourceSchema,
  page: num(gte(1), description('1-based page number')),
  image: optional(num(gte(0), description('0-based image index'))),
  language: optional(str(description('Language hint: "en", "de", "zh"'))),
  return_image: optional(...)
});
```

---

## Phase 3: Response Enhancements

### 3.1 Add `next_step` Helper

**File:** `src/utils/workflow.ts` (new file)

```typescript
interface NextStep {
  suggestion: string;
  tools?: string[];
  example?: Record<string, unknown>;
}

export function buildNextStep(context: {
  stage: 'info' | 'read' | 'extract' | 'ocr';
  hasImages?: boolean;
  imageCount?: number;
  hasText?: boolean;
  hasToc?: boolean;
}): NextStep | undefined {

  if (context.stage === 'info') {
    return {
      suggestion: 'To read content, use pdf_read (Stage 1). To search, use pdf_search.',
      tools: ['pdf_read', 'pdf_search']
    };
  }

  if (context.stage === 'read') {
    if (!context.hasText && !context.hasImages) {
      return {
        suggestion: 'No text or images found. This may be a scanned document. Use pdf_ocr on entire page.',
        tools: ['pdf_ocr'],
        example: {page: 1}
      };
    }

    if (context.hasImages) {
      return {
        suggestion: `Found ${context.imageCount} images. Use pdf_extract_image (Stage 2) for diagrams or pdf_ocr (Stage 3) for text extraction.`,
        tools: ['pdf_extract_image', 'pdf_ocr']
      };
    }

    if (context.hasText) {
      return {
        suggestion: 'Text extraction complete. No further stages needed.'
      };
    }
  }

  if (context.stage === 'extract') {
    return {
      suggestion: 'Diagram extracted. Analyze with your vision. For text extraction from other images, use pdf_ocr (Stage 3).',
      tools: ['pdf_ocr']
    };
  }

  if (context.stage === 'ocr') {
    return {
      suggestion: 'Text extraction complete via OCR.'
    };
  }

  return undefined;
}
```

### 3.2 Integrate into Handlers

Update each handler to use `buildNextStep()`:

**pdfInfo.ts:**
```typescript
return text(JSON.stringify({
  ...metadata,
  next_step: buildNextStep({stage: 'info', hasToc, hasImages})
}));
```

**pdfRead.ts:**
```typescript
return text(JSON.stringify({
  pages,
  next_step: buildNextStep({
    stage: 'read',
    hasImages: imageCount > 0,
    imageCount,
    hasText: totalTextLength > 0
  })
}));
```

---

## Phase 4: Tool Registration Update

### 4.1 Update `src/index.ts`

```typescript
import { Server } from '@sylphx/mcp-server-sdk';

// Core Tools (in order of typical usage)
import { pdfInfo } from './handlers/pdfInfo.js';
import { pdfRead } from './handlers/pdfRead.js';
import { pdfExtractImage } from './handlers/pdfExtractImage.js';
import { pdfOcr } from './handlers/pdfOcr.js';
import { pdfSearch } from './handlers/searchPdf.js';

// Advanced Tools
import { pdfCacheClear } from './handlers/cache.js';

const server = new Server({
  name: 'pdf-reader-mcp',
  version: '3.0.0'
});

// Register tools in order of importance
server.addTool(pdfInfo);           // Quick check
server.addTool(pdfRead);           // Stage 1
server.addTool(pdfExtractImage);   // Stage 2
server.addTool(pdfOcr);            // Stage 3
server.addTool(pdfSearch);         // Shortcut
server.addTool(pdfCacheClear);     // Advanced (_prefix)

server.start();
```

---

## Phase 5: Environment Configuration

### 5.1 Update `.env.example`

```bash
# OCR Provider Configuration (Optional)
# If not set, OCR tools will return images for manual vision analysis

# Mistral OCR (Recommended)
MISTRAL_API_KEY=your-mistral-api-key-here
MISTRAL_OCR_MODEL=pixtral-12b-2409
# MISTRAL_OCR_ENDPOINT=https://api.mistral.ai/v1/chat/completions
# MISTRAL_OCR_TIMEOUT=30000

# Custom HTTP Endpoint (Alternative)
# OCR_HTTP_ENDPOINT=https://your-ocr-service.com/api/ocr
# OCR_HTTP_API_KEY=your-api-key
# OCR_HTTP_TIMEOUT=30000

# Path Security
PDF_ALLOWED_PATHS=/home/user/documents:/mnt/pdfs
# PDF_ALLOW_UNSAFE_ABSOLUTE=false
```

---

## Phase 6: Testing

### 6.1 Update Test Files

**Files to update:**
- `test/handlers/readPages.test.ts` → `test/handlers/pdfRead.test.ts`
- `test/handlers/getImage.test.ts` → `test/handlers/pdfExtractImage.test.ts`
- Create: `test/handlers/pdfInfo.test.ts`
- Create: `test/handlers/pdfOcr.test.ts`
- Update: `test/handlers/searchPdf.test.ts`

**Files to remove:**
- `test/handlers/getMetadata.test.ts`
- `test/handlers/getToc.test.ts`
- `test/handlers/getPageStats.test.ts`
- `test/handlers/listImages.test.ts`
- `test/handlers/ocrPage.test.ts`
- `test/handlers/ocrImage.test.ts`
- `test/handlers/readPdf.test.ts`

### 6.2 Integration Test Scenarios

**File:** `test/integration/workflow.test.ts` (new)

Test the 3-stage workflow:
```typescript
describe('3-Stage Workflow', () => {
  it('should guide through stages for document with images', async () => {
    // Stage 1
    const readResult = await pdfRead({source, pages: [1]});
    expect(readResult.next_step).toBeDefined();
    expect(readResult.next_step.tools).toContain('pdf_extract_image');

    // Stage 2
    const extractResult = await pdfExtractImage({source, page: 1, index: 0});
    expect(extractResult.stage).toBe('2-vision');

    // Stage 3
    const ocrResult = await pdfOcr({source, page: 1, image: 1});
    expect(ocrResult.text).toBeDefined();
  });

  it('should handle scanned documents', async () => {
    // Stage 1 finds no text
    const readResult = await pdfRead({source: scannedDoc, pages: [1]});
    expect(readResult.next_step.tools).toContain('pdf_ocr');

    // Stage 3 directly
    const ocrResult = await pdfOcr({source: scannedDoc, page: 1});
    expect(ocrResult.text).toBeDefined();
  });
});
```

---

## Phase 7: Documentation Updates

### 7.1 Update README.md

**Sections to update:**
- Tool count: "6 specialized tools" (was 13)
- Remove detailed API reference for old tools
- Add simplified workflow diagram
- Update examples to use new tool names
- Update environment configuration section

### 7.2 Update CHANGELOG.md

```markdown
## [3.0.0] - 2025-XX-XX

### BREAKING CHANGES
- Consolidated 13 tools into 6 for improved LLM usability
- Renamed tools: `pdf_read_pages` → `pdf_read`, `pdf_get_image` → `pdf_extract_image`
- Removed tools: `pdf_get_metadata`, `pdf_get_toc`, `pdf_get_page_stats`, `pdf_list_images`, `read_pdf` (merged into new tools)
- Removed `provider` parameter from OCR tools - provider now configured server-side via environment variables
- OCR tools now automatically fallback to returning images when no OCR provider is configured

### Added
- `pdf_info`: Quick metadata check combining metadata, TOC, and stats
- `pdf_ocr`: Unified OCR tool merging page and image OCR with intelligent fallbacks
- Automatic workflow guidance via `next_step` in responses
- Stage labels (1-3) in tool descriptions for clear workflow
- Smart fallback: OCR tools return images when no provider configured

### Changed
- Tool descriptions now include clear STAGE labels and prerequisites
- Responses include workflow hints and next-step suggestions
- Simplified schemas: removed complex provider configurations
- OCR provider selection now server-side only (via MISTRAL_API_KEY env var)

### Removed
- `provider` parameter from OCR tools (breaking change)
- `pdf_cache_stats` tool (not needed by LLMs)
- Complex provider configuration from LLM-facing API
```

### 7.3 Create MIGRATION.md

```markdown
# Migration Guide: v2.x → v3.0

## Tool Name Changes

| Old Tool | New Tool | Notes |
|----------|----------|-------|
| `pdf_read_pages` | `pdf_read` | Renamed for simplicity |
| `pdf_get_image` | `pdf_extract_image` | Clearer purpose |
| `pdf_get_metadata` | `pdf_info` | Merged with TOC/stats |
| `pdf_get_toc` | `pdf_info` | Use `include: ["toc"]` |
| `pdf_get_page_stats` | `pdf_info` | Use `include: ["stats"]` |
| `pdf_list_images` | `pdf_read` | Use `find_images: true` |
| `pdf_ocr_page` | `pdf_ocr` | Merged, omit `image` param |
| `pdf_ocr_image` | `pdf_ocr` | Merged, provide `image` param |
| `pdf_cache_stats` | ❌ Removed | Not needed |
| `read_pdf` | `pdf_read` | Legacy removed |

## Parameter Changes

### OCR Tools (Breaking!)

**Before (v2.x):**
```typescript
pdf_ocr_image({
  source,
  page,
  index,
  provider: {
    type: "mistral-ocr",
    api_key: "xxx",
    extras: {tableFormat: "markdown"}
  }
})
```

**After (v3.0):**
```typescript
pdf_ocr({
  source,
  page,
  image: index,  // Note: renamed from 'index' to 'image'
  language: "en"
})
```

**Configuration now in environment:**
```bash
MISTRAL_API_KEY=xxx
```

## Workflow Changes

### Old Workflow
```
1. pdf_get_metadata → Check page count
2. pdf_read_pages → Read text
3. pdf_list_images → Find images
4. pdf_get_image → Extract image
5. Analyze with vision OR pdf_ocr_image
```

### New Workflow (Simpler!)
```
1. pdf_info → Quick check (optional)
2. pdf_read → Get text + [IMAGE] markers
3. pdf_extract_image (diagrams) OR pdf_ocr (text)
```

## Environment Setup

Add to your MCP config or `.env`:
```bash
MISTRAL_API_KEY=your-key-here
```

Tools will automatically use configured provider or fallback to returning images.
```

---

## Phase 8: Deployment Checklist

### Pre-Release
- [ ] All tests passing (`bun run test`)
- [ ] Type check clean (`bun run typecheck`)
- [ ] Linting clean (`bun run lint`)
- [ ] Build successful (`bun run build`)
- [ ] MCP Inspector testing shows 6 tools
- [ ] Manual testing with Claude Desktop

### Release
- [ ] Update version to 3.0.0 in `package.json`
- [ ] Update CHANGELOG.md with release date
- [ ] Tag release: `git tag v3.0.0`
- [ ] Push with tags: `git push --tags`
- [ ] Update README with v3.0 badge
- [ ] Notify users of breaking changes

---

## Rollback Plan

If issues arise:
1. Keep v2.x branch: `git branch v2-stable`
2. Document rollback process in README
3. Provide migration path back if needed

---

## Timeline Estimate

- **Phase 1-2** (Tool consolidation + schemas): 4-6 hours
- **Phase 3** (Response enhancements): 2-3 hours
- **Phase 4** (Registration): 1 hour
- **Phase 5** (Environment): 1 hour
- **Phase 6** (Testing): 3-4 hours
- **Phase 7** (Documentation): 2-3 hours
- **Phase 8** (Deployment): 1 hour

**Total: ~14-19 hours**

---

## Success Criteria

✅ Tool count reduced from 13 to 6
✅ All tools have clear stage labels
✅ Provider configuration is server-side only
✅ Responses include next_step guidance
✅ OCR tools auto-fallback to images when no provider
✅ All tests passing
✅ Documentation updated
✅ Backward incompatibility clearly documented
