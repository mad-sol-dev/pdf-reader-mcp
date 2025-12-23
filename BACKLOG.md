# PDF Reader MCP - Development Backlog

> **Last Updated:** 2025-12-23

## Current 3-Stage OCR Workflow

### Stage 1: Text Extraction with Image Markers ✅ IMPLEMENTED
**Tool:** `pdf_read_pages` with `insert_markers=true`

**Status:** ✅ Complete
- Extracts text from PDF pages
- Inserts `[IMAGE]` and `[TABLE]` markers at approximate positions
- Helps identify pages with complex content needing OCR
- Returns structured text with image indexes

**Usage:**
```typescript
const result = await client.tools.pdf_read_pages({
  sources: [{ path: "doc.pdf", pages: [1, 2, 3] }],
  insert_markers: true,
  include_image_indexes: true
});
```

### Stage 2: Optional Classification (Vision) 🔄 PARTIAL
**Tool:** `pdf_ocr_page` with provider type `mistral` (Vision API)

**Status:** 🔄 Implemented but limited
- Uses Mistral Vision API for semantic understanding
- Returns markdown with structure
- Good for document classification and understanding
- Limited for detailed label extraction from diagrams

**Current limitations:**
- Only uses Vision API, not dedicated OCR API
- Doesn't utilize full Mistral OCR capabilities
- No structured output support (annotations)

### Stage 3: OCR Image/Table/Layout 🔄 PARTIAL
**Tools:**
- `pdf_ocr_page` - OCR entire rendered page
- `pdf_ocr_image` - OCR specific embedded image
- `pdf_render_page` - Render page as PNG

**Status:** 🔄 Basic implementation exists
- Can OCR rendered pages
- Can OCR extracted images
- Supports Mistral OCR (dedicated API)
- Missing: Smart routing, table-specific OCR, layout analysis

**Current limitations:**
- No automatic routing between Vision vs OCR
- No table-specific extraction
- No layout analysis for complex documents
- Doesn't use Mistral OCR advanced features

## Backlog Items

### High Priority

#### 1. Enhanced Mistral OCR Integration
**Estimated effort:** Medium (2-3 days)

Enhance `mistral-ocr` provider to expose full API capabilities:

- [ ] Return full response structure (not just markdown)
  - [ ] Images array with bboxes and optional base64
  - [ ] Tables array with HTML/markdown
  - [ ] Hyperlinks array
  - [ ] Header/footer when extracted
  - [ ] Page dimensions
  - [ ] Usage info
- [ ] Support additional parameters via `extras`:
  - [ ] `extractHeader: boolean`
  - [ ] `extractFooter: boolean`
  - [ ] `includeImageBase64: boolean`
  - [ ] `includeFullResponse: boolean` (opt-in for backward compatibility)
- [ ] Support direct URL input (avoid upload when possible)
  - [ ] `document_url` for public PDFs
  - [ ] `image_url` for public images

**Files to modify:**
- `src/utils/ocr.ts` - Enhance `handleMistralOcrDedicated()`
- `src/schemas/ocr.ts` - Add new parameters
- `src/types/pdf.ts` - Define full response types
- `docs/guide/ocr-providers.md` - Document new capabilities

#### 2. Smart OCR Workflow Enhancement
**Estimated effort:** Small (1 day)

Improve the 3-stage workflow with automatic routing:

- [ ] Add `smart_ocr_strategy` parameter to `pdf_ocr_page`
  - `auto` - Automatically choose Vision vs OCR based on content
  - `vision` - Force Vision API (semantic understanding)
  - `ocr` - Force OCR API (text extraction)
  - `hybrid` - Use both and combine results
- [ ] Enhance decision heuristics:
  - Check for markers from Stage 1
  - Analyze image-to-text ratio
  - Detect diagrams vs scanned text
  - Route accordingly

**Files to modify:**
- `src/handlers/ocrPage.ts` - Add routing logic
- `src/utils/ocr.ts` - Decision heuristics
- `test/handlers/ocrPage.test.ts` - Test routing

#### 3. Table-Specific OCR Tool
**Estimated effort:** Medium (2 days)

New tool for optimized table extraction:

- [ ] `pdf_ocr_table` - Extract table from page region
  - Use Mistral OCR with `tableFormat: "html"`
  - Support bbox specification for table region
  - Return structured table data (HTML + markdown)
  - Map to actual table content using `tables` array
- [ ] Automatic table detection:
  - Use existing `tableDetection.ts` logic
  - Suggest table regions to user
  - Batch extract multiple tables

**New files:**
- `src/handlers/ocrTable.ts`
- `test/handlers/ocrTable.test.ts`

### Medium Priority

#### 4. Structured Data Extraction (Annotations)
**Estimated effort:** Large (4-5 days)

Add Mistral OCR Annotations support for structured data extraction:

- [ ] `pdf_extract_structured` - New tool
  - Accept Zod schema definition (JSON schema format)
  - Use `documentAnnotationFormat` for full document
  - Use `bboxAnnotationFormat` for specific regions
  - Return structured JSON matching schema
- [ ] Use cases:
  - Invoice/receipt data extraction
  - Form parsing
  - Contract clause extraction
  - Document classification

**New files:**
- `src/handlers/extractStructured.ts`
- `src/schemas/structuredExtraction.ts`
- `test/handlers/extractStructured.test.ts`
- `docs/guide/structured-extraction.md`

**Dependencies:**
- `@mistralai/mistralai/extra/structChat.js` (already in package)
- `zod` (need to add dependency)

#### 5. Advanced OCR Result Caching
**Estimated effort:** Medium (2-3 days)

Enhance caching to support full Mistral OCR responses:

- [ ] Cache full response structure (not just text)
- [ ] Separate cache keys for different parameters:
  - `tableFormat`
  - `extractHeader` / `extractFooter`
  - `includeImageBase64`
- [ ] Cache invalidation strategies
- [ ] Cache statistics and management
- [ ] Disk cache size limits

**Files to modify:**
- `src/utils/cache.ts` - Enhanced cache logic
- `src/handlers/cache.ts` - Cache management tools

#### 6. Multi-Page OCR Optimization
**Estimated effort:** Medium (2-3 days)

Optimize OCR for processing multiple pages:

- [ ] Use Mistral OCR `pages` parameter for batch processing
  - Send multiple pages in single API call
  - Reduce API overhead
  - Better for documents with 10+ pages
- [ ] Parallel processing with rate limiting
- [ ] Progress tracking for long documents
- [ ] Smart batching (group similar pages)

**Files to modify:**
- `src/handlers/ocrPage.ts` - Batch processing logic
- `src/utils/ocr.ts` - Multi-page support

### Low Priority

#### 7. OCR Quality Metrics
**Estimated effort:** Small (1-2 days)

Add quality metrics and confidence scores:

- [ ] Text confidence scores (if available from provider)
- [ ] Layout complexity metrics
- [ ] Suggested follow-up actions
  - "Low confidence detected, try Vision API"
  - "Complex diagram detected, consider pdf_ocr_image"
  - "Table detected, use tableFormat=html"

#### 8. OCR Provider Comparison Tool
**Estimated effort:** Small (1 day)

Tool to compare different OCR providers side-by-side:

- [ ] `pdf_compare_ocr` - Run multiple providers on same page
- [ ] Return results from all providers
- [ ] Useful for quality assessment
- [ ] Help users choose best provider

#### 9. Vision API Enhancement
**Estimated effort:** Medium (2-3 days)

Enhance Mistral Vision API provider:

- [ ] Support custom prompts via `extras.prompt`
- [ ] Support structured outputs (tool use)
- [ ] Better diagram/chart understanding prompts
- [ ] Combine with OCR results

### Future / Ideas

#### 10. Layout Analysis Tool
Extract document structure without full OCR:

- [ ] `pdf_analyze_layout` - Detect structure
  - Headers, footers, columns
  - Tables, images, charts
  - Reading order
  - Section hierarchy
- [ ] Return layout map with bboxes
- [ ] Guide targeted OCR

#### 11. Hybrid OCR Strategy
Combine multiple approaches:

- [ ] Text regions → Fast text extraction
- [ ] Table regions → OCR with tableFormat=html
- [ ] Diagram regions → Vision API for description
- [ ] Chart regions → Annotations for data extraction

#### 12. OCR Result Post-Processing
Improve OCR output quality:

- [ ] Spelling correction
- [ ] Layout reconstruction
- [ ] Markdown formatting cleanup
- [ ] Table structure validation

## Completed Features

### December 2025

- ✅ **PDF Rendering Fix** (2025-12-22)
  - Downgraded pdfjs-dist to 4.4.168
  - Added @napi-rs/canvas with global polyfills
  - Fixed embedded image rendering
  - Added debug logging

- ✅ **Smart OCR Decision System** (2025-12-22)
  - Intelligent OCR decision with opt-in flag
  - Heuristics: text length, non-ASCII ratio, image-to-text ratio
  - Decision cache for consistency
  - Cost savings on large documents

- ✅ **Mistral OCR API Provider** (2025-12-22)
  - Dedicated OCR API using `client.ocr.process()`
  - 3-step workflow: Upload → OCR → Cleanup
  - Basic structured output (markdown)
  - Parallel to existing Mistral Vision API

- ✅ **Dynamic Table Detection** (2025-12-22)
  - Font-size-based tolerance
  - Adaptive to document characteristics
  - Font size propagation from PDF extraction

## Notes

- All backlog items should maintain backward compatibility
- New features should be opt-in via parameters
- Comprehensive tests required for all new tools
- Documentation must be updated alongside implementation
- Consider API cost implications for multi-page processing

## Priority Legend

- 🔴 **High Priority** - Critical for core workflow
- 🟡 **Medium Priority** - Important but not blocking
- 🟢 **Low Priority** - Nice to have, enhancement
- 💡 **Future / Ideas** - Brainstorming, needs refinement
