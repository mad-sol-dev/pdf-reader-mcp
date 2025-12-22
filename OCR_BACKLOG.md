# OCR Implementation - Status & Backlog

**Status:** ✅ Implementation complete, ⚠️ Documentation incomplete
**Last Updated:** 2025-12-21
**API Version Checked:** Mistral API 2025-12 (mistral-large-2512, mistral-ocr-2512)

## 🆕 Update Summary (2025-12-21)
- ✅ Verified against current Mistral API documentation
- ✅ Updated model names (mistral-large-2512, mistral-medium-2508, etc.)
- ✅ Confirmed Vision API supports base64 data URIs
- ✅ Noted new OCR API features (ImageURLChunk, pages parameter)
- ✅ **Discovered FileChunk approach** - can upload PNG and use OCR API!
- ✅ Updated wrapper code with latest SDK usage (TWO implementations)
- ⚠️ OCR API ImageURLChunk requires HTTP URLs (but FileChunk works!)

## 💡 Recommended Approach

**For Production: Option A - Document AI / OCR API** (via FileChunk)
- ✅ Dedicated OCR model (`mistral-ocr-2512`) - best quality
- ✅ Specialized for documents (tables, layouts, formulas)
- ✅ Structured output (markdown + tables + hyperlinks + bbox)
- ⚠️ More complex (upload → OCR → delete)
- ⚠️ Higher latency (~2-3s per page vs ~1s)

**For Quick Prototyping: Option B - Vision API**
- ✅ Simpler code (~50 lines)
- ✅ Lower latency (1 API call)
- ✅ Direct base64 support
- ⚠️ General-purpose model (may miss complex layouts)

## Current State

### ✅ Implemented
- Generic HTTP OCR provider pattern
- Page OCR (`pdf_ocr_page`) with configurable scale
- Image OCR (`pdf_ocr_image`) for embedded images
- Fingerprint-based caching (text + provider key)
- Mock provider for testing
- Vex schema validation for provider config
- Cache management tools (`pdf_cache_stats`, `pdf_cache_clear`)

### ⚠️ Mistral Integration Status
**No Mistral-specific code exists** - uses generic HTTP provider.

**CRITICAL Finding:** Mistral has TWO different APIs:

#### 1. Mistral OCR API (Dedicated) - **Updated 2025-12**
```python
# Current API (mistral-ocr-2512 model)
ocr_response = client.ocr.process(
    model="mistral-ocr-2512",  # Latest model
    document={
        "type": "image_url",  # NEW: supports individual images!
        "image_url": {"url": "https://example.com/image.png"}
    },
    # Optional page filtering
    pages=[0, 1, 2],  # NEW: can specify pages!
    include_image_base64=True,
    extract_header=False,
    extract_footer=False,
    table_format="markdown"
)
```

**Response Structure (unchanged):**
```python
ocr_response.pages[i].index        # Page index (0-based)
ocr_response.pages[i].markdown     # OCR text as markdown
ocr_response.pages[i].images       # List of extracted images with bbox
ocr_response.pages[i].tables       # Table data
ocr_response.pages[i].hyperlinks   # Extracted links
ocr_response.pages[i].dimensions   # Page dimensions (dpi, height, width)
```

**⚠️ Still incompatible with pdf-reader-mcp:**
- ✅ **NEW:** Supports `ImageURLChunk` (single images)
- ✅ **NEW:** Supports `pages` parameter (page filtering)
- ❌ ImageURLChunk requires **HTTP/HTTPS URLs** (no base64 data URIs)
- ❌ Response is structured (markdown + images + tables), not simple `{ text: "..." }`
- ❌ Would require temp image hosting or file upload for each page

**Possible integration paths:**
1. **File upload approach**: Upload rendered page → get file_id → use FileChunk
2. **Temp hosting**: Host rendered page on HTTP server → use ImageURLChunk
3. **Use Vision API instead** (see below) - simpler, supports base64 directly

#### 2. Mistral Vision API (Chat with Images) - **Updated 2025-12**
```python
# Current API - supports BOTH URLs and base64!
chat_response = client.chat.complete(
    model="mistral-large-2512",  # or mistral-medium-2508, mistral-small-2506, pixtral-large-latest
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "Extract all text from this image, preserving layout."},
            {
                "type": "image_url",
                "image_url": f"data:image/png;base64,{base64}"  # ✅ Data URIs supported!
                # OR: "image_url": "https://example.com/image.png"  # HTTPS URLs also work
            }
        ]
    }],
    temperature=0.1,
    max_tokens=2000
)
```

**Available Vision Models:**
- `mistral-large-2512` (Mistral Large 3)
- `mistral-medium-2508` (Mistral Medium 3.1)
- `mistral-small-2506` (Mistral Small 3.2)
- `pixtral-large-latest` (dedicated vision model)

**Response:** `chat_response.choices[0].message.content` (text string)

**✅ BEST fit for pdf-reader-mcp:**
- ✅ Works per-page (send rendered page as base64 data URI)
- ✅ Accepts base64 directly (no file upload/hosting needed)
- ✅ Returns plain text (simple response)
- ❌ **BUT:** API format differs from pdf-reader-mcp (needs wrapper)
- ⚠️ Uses chat API (not specialized OCR) - might be less accurate for complex layouts

#### Integration Options

**Option A: Document AI / OCR API via FileChunk** (Best Quality)
- Upload rendered page PNG to Mistral Files API (`purpose: "ocr"`)
- Call OCR API with file_id using FileChunk type
- Extract `.markdown` from structured response
- Delete temporary file
- **Pros:** Dedicated OCR model, better accuracy, structured output (tables, bbox)
- **Cons:** 3 API calls (upload → OCR → delete), higher latency (~2-3s vs ~1s)

**Option B: Vision API (Chat.complete)** (Simpler, Faster)
- Direct base64 → Mistral Vision API (chat.complete)
- Single API call with data URI
- Plain text response
- **Pros:** Simple wrapper (~50 lines), low latency, no file handling
- **Cons:** General-purpose vision model (not OCR-specialized), may miss complex layouts

**Option C: Extend pdf-reader-mcp** (Most Flexible)
- Add provider-specific handlers (`handleMistralOCR`, `handleMistralVision`, `handleOpenAIVision`)
- Keep generic HTTP as fallback
- **Pros:** Native support, no wrapper needed
- **Cons:** Increases codebase complexity, maintenance burden

### ❌ Documentation Gaps

1. **No provider examples** (Mistral, OpenAI Vision, Google Vision, etc.)
2. **Mock provider undocumented** (exists in code, not in docs)
3. **Caching details missing** (cache key construction, invalidation)
4. **`extras` field unexplained** (no concrete use cases)
5. **No troubleshooting guide** (error handling, debugging)
6. **Provider contract unclear** (required response format: `{ text }` or `{ ocr }`)

## Backlog

### High Priority

- [ ] **Add content markers to text extraction** 🆕
  - Insert `[IMAGE n]` and `[TABLE DETECTED]` markers in extracted text
  - Helps clients decide when OCR is needed (scanned pages, complex layouts)
  - Use case: 800-page PDF → OCR only pages with markers
  - **Implementation options:**
    - Option A: `insert_markers` parameter in `pdf_read_pages`
    - Option B: Separate `content_map` structure (non-invasive)
  - **Code locations:** `src/pdf/extractor.ts`, `src/pdf/text.ts`, `src/handlers/readPages.ts`
  - **Alternative:** Enhance `pdf_get_page_stats` with `has_suspected_tables` flag

- [ ] **Build Mistral Vision wrapper service**
  - Simple Express.js/Node.js HTTP server
  - Translates pdf-reader-mcp format → Mistral Vision API
  - Deploy as separate service or Docker container
  - Template code already drafted in this backlog (see Implementation Example)

- [ ] **Add provider examples** to README/docs
  - Mistral Vision wrapper (with setup instructions)
  - OpenAI Vision API wrapper (similar pattern)
  - Google Cloud Vision wrapper
  - Document that Mistral OCR API is incompatible (document-level vs page-level)

- [ ] **Create `docs/guide/ocr-providers.md`**
  - Architecture overview: pdf-reader-mcp → wrapper → vision APIs
  - Step-by-step wrapper setup (Mistral, OpenAI, Google)
  - Environment variables and API keys
  - Testing and troubleshooting

- [ ] **Document mock provider**
  - When to use (testing, development)
  - Default behavior (returns placeholder text)
  - How to test without real API calls

### Medium Priority

- [ ] **Add troubleshooting guide** (`docs/troubleshooting/ocr.md`)
  - Common errors (missing endpoint, auth failures)
  - Response format validation errors
  - Cache debugging

- [ ] **Document caching behavior**
  - Cache key structure: `page-${page}#scale-${scale}#provider-${hash}`
  - Provider key hashing algorithm
  - Cache invalidation rules

- [ ] **Add `extras` field examples**
  - Temperature/top_p for vision models
  - Provider-specific options
  - Table detection flags

### Low Priority

- [ ] **Consider provider-specific handlers**
  - Mistral payload formatter
  - OpenAI payload formatter
  - Keep generic HTTP as fallback

- [ ] **Add integration tests**
  - Mock OCR service for CI
  - Test cache hits/misses
  - Test provider configuration validation

## Code References

- **OCR core:** `src/utils/ocr.ts` (HTTP provider, mock provider)
- **Page handler:** `src/handlers/ocrPage.ts` (render + OCR + cache)
- **Image handler:** `src/handlers/ocrImage.ts` (extract + OCR + cache)
- **Schemas:** `src/schemas/ocr.ts` (Vex validation)
- **Cache:** `src/utils/cache.ts` (`buildOcrProviderKey`)

## Implementation Examples

### Option A: Document AI / OCR Wrapper (Best Quality)

```typescript
// mistral-ocr-wrapper-dedicated.ts
import express from 'express';
import { Mistral } from '@mistralai/mistralai';

const app = express();
app.use(express.json({ limit: '50mb' }));

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

app.post('/v1/ocr', async (req, res) => {
  const { image, model, language, extras } = req.body;

  let fileId: string | null = null;

  try {
    // Step 1: Convert base64 to buffer/blob
    const base64Data = image.startsWith('data:')
      ? image.split(',')[1]
      : image;
    const buffer = Buffer.from(base64Data, 'base64');

    // Step 2: Upload to Mistral Files API
    console.log('Uploading page image to Mistral...');
    const uploadResult = await client.files.upload({
      file: {
        fileName: `page-${Date.now()}.png`,
        content: buffer
      },
      purpose: 'ocr'
    });
    fileId = uploadResult.id;
    console.log(`File uploaded: ${fileId}`);

    // Step 3: Process with OCR API
    console.log('Running OCR processing...');
    const ocrResult = await client.ocr.process({
      model: model || 'mistral-ocr-2512',
      document: {
        type: 'file',
        file_id: fileId
      },
      include_image_base64: false,
      table_format: extras?.table_format || 'markdown',
      extract_header: extras?.extract_header ?? false,
      extract_footer: extras?.extract_footer ?? false
    });

    // Step 4: Extract markdown text from first page
    const markdown = ocrResult.pages?.[0]?.markdown || '';

    // Step 5: Return text
    res.json({ text: markdown });

  } catch (error) {
    console.error('OCR processing error:', error);
    res.status(500).json({
      error: error.message || 'OCR processing failed'
    });
  } finally {
    // Step 6: Cleanup - delete temporary file
    if (fileId) {
      try {
        await client.files.delete({ fileId });
        console.log(`Deleted temp file: ${fileId}`);
      } catch (deleteError) {
        console.warn(`Failed to delete temp file ${fileId}:`, deleteError);
      }
    }
  }
});

app.listen(3000, () => console.log('Mistral OCR wrapper (dedicated) on http://localhost:3000'));
```

**Trade-offs:**
- ✅ Uses dedicated `mistral-ocr-2512` model (best quality)
- ✅ Structured output available (tables, hyperlinks, bbox)
- ✅ Header/footer extraction options
- ❌ Higher latency (3 API calls: upload → OCR → delete)
- ❌ More complex error handling

---

### Option B: Vision API Wrapper (Simpler, Faster)
```typescript
// mistral-ocr-wrapper.ts
import express from 'express';
import { Mistral } from '@mistralai/mistralai';

const app = express();
app.use(express.json({ limit: '50mb' }));

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

app.post('/v1/ocr', async (req, res) => {
  const { image, model, language, extras } = req.body;

  // Construct data URI if not already present
  const imageUrl = image.startsWith('data:')
    ? image
    : `data:image/png;base64,${image}`;

  // Build prompt (can be customized via extras)
  const defaultPrompt = 'Extract and transcribe all text from this image. ' +
    'Preserve the layout, structure, headings, lists, tables, and formatting as much as possible. ' +
    'Return the text in markdown format.';
  const prompt = extras?.prompt || defaultPrompt;

  try {
    const response = await client.chat.complete({
      model: model || 'mistral-large-2512',  // Updated: use latest vision-capable model
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: imageUrl }  // Simplified: direct string
        ]
      }],
      temperature: extras?.temperature ?? 0.0,  // Lower temp for OCR accuracy
      maxTokens: extras?.max_tokens ?? 4000     // Higher limit for long pages
    });

    res.json({
      text: response.choices[0].message.content
    });
  } catch (error) {
    console.error('Mistral API error:', error);
    res.status(500).json({
      error: error.message || 'OCR processing failed'
    });
  }
});

app.listen(3000, () => console.log('Mistral OCR wrapper running on http://localhost:3000'));
```

**Setup:**
```bash
npm init -y
npm install express @mistralai/mistralai dotenv
echo "MISTRAL_API_KEY=your_key_here" > .env
npx tsx mistral-ocr-wrapper.ts
```

### Usage in pdf-reader-mcp
```json
{
  "source": { "path": "./document.pdf" },
  "page": 5,
  "provider": {
    "type": "http",
    "endpoint": "http://localhost:3000/v1/ocr",
    "model": "mistral-large-2512",
    "language": "en",
    "extras": {
      "prompt": "Extract all text from this PDF page, preserving tables and formatting.",
      "temperature": 0.0,
      "max_tokens": 8000
    }
  },
  "cache": true
}
```

**Model Options:**
- `mistral-large-2512` - Best quality, slower, higher cost
- `mistral-medium-2508` - Balanced quality/speed
- `mistral-small-2506` - Faster, lower cost
- `pixtral-large-latest` - Dedicated vision model (alternative)

## Reference Implementation

See `/home/martinm/programme/python_projects/mistral_ocr_processor/mistral_ocr_processor_multiview_PbP_chunking_logging.py` for full Mistral integration example (Python):
- Lines 186-234: `get_image_description()` - Vision API usage
- Lines 417-422: OCR API usage (document-level)
- Lines 200-206: Data URI construction for images

## Feature Request: Content Markers in Text Extraction

### Problem Statement

**Current behavior:**
```json
// pdf_read_pages response
{
  "pages": [{
    "page": 5,
    "text": "Introduction...\n\n\n\nFurther discussion...",
    "image_indexes": [0, 1]  // Separate metadata
  }]
}
```

**Issue:** Client can't see WHERE images/tables are in the text flow. Must correlate `image_indexes` separately.

**Impact:** For 800-page documents, client can't efficiently decide which pages need OCR without additional logic.

### Proposed Solution

#### Option A: Insert Markers (Inline approach)

```json
{
  "source": { "path": "doc.pdf" },
  "pages": "5",
  "insert_markers": true  // ← NEW parameter
}

// Response:
{
  "pages": [{
    "page": 5,
    "text": "Introduction...\n\n[IMAGE 0: 1200x800px, png]\n\nFurther discussion...\n\n[TABLE DETECTED: 3 cols × 5 rows]\ncol1 | col2 | col3\nval1 | val2 | val3",
    "image_indexes": [0, 1]
  }]
}
```

**Pros:**
- Simple to use, markers inline with text
- Works with existing text processing pipelines
- Client can immediately see context

**Cons:**
- Modifies text output (breaking change if not opt-in)
- Marker format needs to be well-defined

#### Option B: Content Map (Metadata approach)

```json
{
  "pages": [{
    "page": 5,
    "text": "Introduction...\n\nFurther discussion...",
    "content_map": [  // ← NEW field
      { "type": "text", "line_start": 0, "line_end": 2 },
      { "type": "image", "index": 0, "line": 3, "width": 1200, "height": 800 },
      { "type": "text", "line_start": 4, "line_end": 6 },
      { "type": "table", "line_start": 7, "line_end": 12, "cols": 3, "rows": 5 }
    ]
  }]
}
```

**Pros:**
- Non-breaking change (text unchanged)
- Structured metadata, easier to parse programmatically
- Extensible (can add more content types)

**Cons:**
- Client needs extra logic to correlate lines with content
- More complex response structure

### Implementation Guide

#### Code Changes Required

**1. Schema Update** (`src/schemas/readPages.ts`)
```typescript
export const readPagesArgsSchema = object({
  sources: array(pdfSourceWithPagesSchema),
  include_image_indexes: optional(bool()),
  insert_markers: optional(bool(description('Insert content type markers in text'))),  // NEW
  preserve_whitespace: optional(bool()),
  trim_lines: optional(bool()),
  max_chars_per_page: optional(num(gte(1)))
});
```

**2. Extractor Enhancement** (`src/pdf/extractor.ts:extractText()`)
```typescript
// Current: Only extracts text items
// New: Track images and their Y-positions alongside text

export const extractText = async (page, options) => {
  const textItems = await page.getTextContent();
  const images = options.includeImages ? await extractImages(page) : [];

  // Combine into unified content stream
  const contentItems = [
    ...textItems.items.map(t => ({ type: 'text', y: t.transform[5], content: t.str })),
    ...images.map(img => ({ type: 'image', y: img.y, index: img.index, ...img.dimensions }))
  ];

  // Sort by Y-position (preserve reading order)
  contentItems.sort((a, b) => b.y - a.y);

  return contentItems;
};
```

**3. Text Assembly** (`src/pdf/text.ts`)
```typescript
export const orderTextByYCoordinate = (contentItems, options) => {
  const lines = [];

  for (const item of contentItems) {
    if (item.type === 'text') {
      lines.push(item.content);
    } else if (item.type === 'image' && options.insertMarkers) {
      lines.push(`[IMAGE ${item.index}: ${item.width}x${item.height}px]`);
    }
  }

  return lines.join('\n');
};
```

**4. Table Detection** (heuristic)
```typescript
// In src/pdf/text.ts or new src/pdf/tableDetection.ts
const detectTables = (textItems) => {
  // Heuristic: Multiple items aligned vertically with consistent spacing
  const xPositions = textItems.map(t => t.x);
  const uniqueX = [...new Set(xPositions)];

  if (uniqueX.length >= 3) {  // At least 3 columns
    const rows = groupByYPosition(textItems);
    if (rows.length >= 3) {  // At least 3 rows
      return { detected: true, cols: uniqueX.length, rows: rows.length };
    }
  }

  return { detected: false };
};
```

### Use Case Example

```typescript
// Client workflow for 800-page document

// Step 1: Get page stats to identify candidates
const stats = await mcp.call('pdf_get_page_stats', {
  sources: [{ path: 'big_doc.pdf' }],
  include_images: true
});

// Step 2: Read text with markers for image-heavy pages
const suspiciousPages = stats.page_stats
  .filter(p => p.image_count > 2 || p.text_length < 200)
  .map(p => p.page);

const textResult = await mcp.call('pdf_read_pages', {
  source: { path: 'big_doc.pdf' },
  pages: suspiciousPages.join(','),
  insert_markers: true  // ← Get markers
});

// Step 3: Decide which pages need OCR
for (const page of textResult.pages) {
  const hasComplexContent =
    page.text.includes('[TABLE DETECTED]') ||
    page.text.match(/\[IMAGE \d+:/g)?.length > 2;

  if (hasComplexContent) {
    // Only OCR pages with complex content
    await mcp.call('pdf_ocr_page', {
      source: { path: 'big_doc.pdf' },
      page: page.page,
      provider: mistralOcrConfig
    });
  }
}
```

**Result:** OCR only ~50 pages instead of 800 → 94% cost reduction

## Notes

- Only CHANGELOG mention: "Fix schema validation with exclusiveMinimum for Mistral/Windsurf compatibility" (schema validation fix, not OCR integration)
- README roadmap lists "OCR for scanned PDFs" as future work, but OCR is already implemented
- HTTP provider requires response: `{ "text": "..." }` or `{ "ocr": "..." }` (line 65-70 in ocr.ts)
- Mistral Vision API uses OpenAI-compatible chat format (same as OpenAI Vision)
- Mistral OCR API is dedicated endpoint: `client.ocr.process()` - processes full documents
