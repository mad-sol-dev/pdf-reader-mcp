# 3-Stage OCR Workflow

> **Status:** Partially Implemented
> **Last Updated:** 2025-12-23

## Overview

The PDF Reader MCP implements a 3-stage workflow for intelligent document processing, balancing speed, cost, and accuracy.

## Workflow Stages

### Stage 1: Text Extraction with Image Markers ✅

**Goal:** Extract native text and identify complex content areas

**Tool:** `pdf_read_pages` with markers enabled

**Implementation Status:** ✅ Complete

**Usage:**
```typescript
const result = await client.tools.pdf_read_pages({
  sources: [{
    path: "document.pdf",
    pages: [1, 2, 3]
  }],
  insert_markers: true,
  include_image_indexes: true,
  preserve_whitespace: false,
  trim_lines: true
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
        page_index: 0,
        page_label: null,
        text: "Title\n\n[IMAGE]\n\nSome text...\n\n[TABLE]\n\nMore text...",
        image_indexes: [0, 1], // Indexes of embedded images
        lines: [...],          // Structured line-by-line text
      }]
    }
  }]
}
```

**Features:**
- ✅ Extracts native PDF text (fast, no API calls)
- ✅ Inserts `[IMAGE]` markers at approximate image positions
- ✅ Inserts `[TABLE]` markers at detected table positions
- ✅ Returns image indexes for Stage 3
- ✅ Maintains reading order (Y-coordinate based)
- ✅ Cached results (fingerprint-based)

**Use Cases:**
- Identify pages with complex content
- Determine if OCR is needed
- Guide targeted OCR strategy
- Extract text-heavy pages without OCR costs

**Decision Points:**
```typescript
// Pseudo-code for decision logic
if (text.includes('[IMAGE]') && text.length < 100) {
  // Page is mostly image → Go to Stage 2 or 3
} else if (text.includes('[TABLE]') && complexLayout) {
  // Page has tables → Use Stage 3 with tableFormat
} else {
  // Text-heavy page → Stage 1 is sufficient
}
```

### Stage 2: Optional Classification (Vision API) 🔄

**Goal:** Semantic understanding and document classification

**Tool:** `pdf_ocr_page` with `provider.type: 'mistral'` (Vision API)

**Implementation Status:** 🔄 Partial - Basic Vision API works, missing advanced features

**Usage:**
```typescript
const result = await client.tools.pdf_ocr_page({
  source: { path: "document.pdf" },
  page: 890,
  provider: {
    type: "mistral",
    api_key: process.env.MISTRAL_API_KEY,
    model: "mistral-large-2512",
    extras: {
      prompt: "Analyze this technical diagram and describe its structure."
    }
  },
  scale: 1.5
});
```

**Output:**
```typescript
{
  source: "document.pdf",
  success: true,
  data: {
    text: "nuvoton\n\n[tbl-0.md](tbl-0.md)\n\n## 7.6 Power-on Sequence\n\n![img-0.jpeg](img-0.jpeg)",
    provider: "mistral",
    fingerprint: "85bfe922b1622347b58e7e645bf0f0be",
    from_cache: false,
    page: 890
  }
}
```

**Features:**
- ✅ Semantic understanding of page content
- ✅ Good for document classification
- ✅ Can describe diagrams and charts
- ✅ Returns structured markdown
- ❌ Not optimized for detailed text extraction
- ❌ More expensive than OCR API
- ❌ Doesn't extract fine-grained labels from diagrams

**Use Cases:**
- Classify document types (invoice, contract, diagram, etc.)
- Understand page structure before detailed extraction
- Describe complex visuals semantically
- Generate document summaries

**Current Limitations:**
- Uses Vision API endpoint, not dedicated OCR API
- Doesn't leverage Mistral OCR advanced features
- No structured output support (annotations)
- Limited to semantic understanding, not precise text extraction

**When to Use:**
- Need to understand *what* the page shows (not just *what it says*)
- Document classification tasks
- Diagram/chart description (not data extraction)
- Semantic search preprocessing

### Stage 3: OCR Image/Table/Layout 🔄

**Goal:** Precise text extraction from images, tables, and complex layouts

**Tools:**
- `pdf_ocr_page` - OCR entire rendered page
- `pdf_ocr_image` - OCR specific embedded image
- `pdf_render_page` - Render page as PNG

**Implementation Status:** 🔄 Partial - Basic OCR works, missing optimizations

#### 3a. OCR Entire Page

**Usage:**
```typescript
const result = await client.tools.pdf_ocr_page({
  source: { path: "document.pdf" },
  page: 890,
  provider: {
    type: "mistral-ocr",  // Dedicated OCR API
    api_key: process.env.MISTRAL_API_KEY,
    model: "mistral-ocr-latest",
    extras: {
      tableFormat: "html"  // or "markdown"
    }
  },
  scale: 1.5,  // Higher scale = better quality
  cache: true
});
```

**Features:**
- ✅ Dedicated OCR API (better accuracy than Vision)
- ✅ Table format control (html/markdown)
- ✅ Caching support
- ✅ Upload + cleanup workflow
- ❌ Only returns markdown text (discards images, tables, hyperlinks)
- ❌ No header/footer extraction
- ❌ No image base64 support
- ❌ No structured output (annotations)

**When to Use:**
- Scanned documents (no native text)
- Complex layouts with mixed content
- Tables that need structured extraction
- Handwritten or low-quality text

#### 3b. OCR Specific Image

**Usage:**
```typescript
// First, get image indexes from Stage 1
const { pages } = await client.tools.pdf_read_pages({
  sources: [{ path: "doc.pdf", pages: [1] }],
  include_image_indexes: true
});

// Then OCR specific image
const result = await client.tools.pdf_ocr_image({
  source: { path: "doc.pdf" },
  page: 1,
  index: 0,  // First image on page
  provider: {
    type: "mistral-ocr",
    api_key: process.env.MISTRAL_API_KEY
  },
  cache: true
});
```

**Features:**
- ✅ Targets specific embedded images
- ✅ More efficient than full-page OCR
- ✅ Good for diagrams with labels
- ✅ Caching support
- ❌ Limited to embedded images (not rendered content)

**When to Use:**
- Extract text from specific diagram/chart
- Process only images (skip surrounding text)
- Targeted extraction after Stage 1 identified images

#### 3c. Render Page for OCR

**Usage:**
```typescript
const result = await client.tools.pdf_render_page({
  source: { path: "document.pdf" },
  page: 890,
  scale: 2.0  // Higher scale for OCR accuracy
});

// Returns base64 PNG image
// Can then be processed with any OCR provider
```

**Features:**
- ✅ High-quality PNG rendering
- ✅ Configurable scale (1.0 - 3.0)
- ✅ Fixed PDF rendering (pdfjs-dist 4.4.168)
- ✅ Works with embedded images

**When to Use:**
- Need rasterized page for external OCR
- Custom OCR provider integration
- Maximum quality extraction

## Decision Tree

```
┌─────────────────────────────────────┐
│  Start: pdf_read_pages             │
│  (Stage 1: Text + Markers)         │
└──────────────┬──────────────────────┘
               │
               ▼
       ┌───────────────┐
       │ Has native    │  Yes  ┌────────────────┐
       │ text?         ├──────►│ Use Stage 1    │
       │ (>100 chars)  │       │ text directly  │
       └───────┬───────┘       └────────────────┘
               │ No
               ▼
       ┌───────────────┐
       │ Need semantic │  Yes  ┌────────────────┐
       │ understanding?├──────►│ Stage 2:       │
       │ (classify/    │       │ Vision API     │
       │  describe)    │       └────────────────┘
       └───────┬───────┘
               │ No
               ▼
       ┌───────────────┐
       │ Text           │  Full ┌────────────────┐
       │ extraction     │  Page │ Stage 3a:      │
       │ needed?        ├──────►│ OCR full page  │
       └───────┬───────┘       └────────────────┘
               │
               │ Specific
               │ Image
               ▼
       ┌────────────────┐
       │ Stage 3b:      │
       │ OCR image      │
       └────────────────┘
```

## Implementation Status

### ✅ Stage 1: Complete
- [x] Text extraction with markers
- [x] Image index tracking
- [x] Table detection markers
- [x] Caching
- [x] Y-coordinate ordering

### 🔄 Stage 2: Partial
- [x] Basic Vision API integration
- [x] Custom prompts
- [ ] Structured outputs (annotations)
- [ ] Advanced semantic analysis
- [ ] Document classification helpers

### 🔄 Stage 3: Partial
- [x] Full-page OCR (basic)
- [x] Image-specific OCR
- [x] Page rendering
- [x] Basic Mistral OCR integration
- [ ] Full Mistral OCR response structure
- [ ] Table-specific extraction
- [ ] Header/footer extraction
- [ ] Image base64 support
- [ ] Multi-page batch processing
- [ ] Smart routing (auto-select best approach)

## Next Steps

See [BACKLOG.md](../../BACKLOG.md) for detailed implementation roadmap.

**High Priority:**
1. Enhanced Mistral OCR Integration - Expose full API capabilities
2. Smart OCR Workflow - Auto-routing between Vision/OCR
3. Table-Specific OCR Tool - Optimized table extraction

**Medium Priority:**
4. Structured Data Extraction (Annotations)
5. Advanced OCR Result Caching
6. Multi-Page OCR Optimization

## Examples

### Example 1: Mixed Content Document

```typescript
// Stage 1: Quick scan
const scan = await pdf_read_pages({
  sources: [{ path: "report.pdf", pages: "1-50" }],
  insert_markers: true
});

// Analyze results
const pagesNeedingOcr = scan.results[0].data.pages
  .filter(p => p.text.includes('[IMAGE]') && p.text.length < 200)
  .map(p => p.page_number);

// Stage 3: OCR only pages with significant images
for (const pageNum of pagesNeedingOcr) {
  const ocr = await pdf_ocr_page({
    source: { path: "report.pdf" },
    page: pageNum,
    provider: { type: "mistral-ocr" }
  });
  // Process OCR result...
}
```

### Example 2: Technical Diagram Analysis

```typescript
// Stage 1: Check if page has native text
const { pages } = await pdf_read_pages({
  sources: [{ path: "datasheet.pdf", pages: [890] }],
  insert_markers: true,
  include_image_indexes: true
});

const page = pages[0];

if (page.text.length < 100 && page.image_indexes?.length > 0) {
  // Stage 2: Understand diagram semantically
  const vision = await pdf_ocr_page({
    source: { path: "datasheet.pdf" },
    page: 890,
    provider: {
      type: "mistral",
      extras: { prompt: "Describe this timing diagram structure" }
    }
  });

  // Stage 3b: Extract detailed labels from diagram
  const ocr = await pdf_ocr_image({
    source: { path: "datasheet.pdf" },
    page: 890,
    index: 0,  // First image
    provider: { type: "mistral-ocr" }
  });

  // Combine semantic understanding + detailed text
}
```

### Example 3: Invoice Processing

```typescript
// Stage 1: Fast text extraction
const { pages } = await pdf_read_pages({
  sources: [{ path: "invoice.pdf", pages: [1] }],
  insert_markers: true
});

// Check if native text is sufficient
if (pages[0].text.length > 500) {
  // Use Stage 1 text directly
  const data = extractInvoiceData(pages[0].text);
} else {
  // Stage 3: OCR with table support
  const ocr = await pdf_ocr_page({
    source: { path: "invoice.pdf" },
    page: 1,
    provider: {
      type: "mistral-ocr",
      extras: { tableFormat: "html" }
    }
  });

  // TODO: Use annotations for structured extraction (see BACKLOG.md)
}
```

## Related Documentation

- [Mistral OCR Capabilities](./mistral-ocr-capabilities.md)
- [OCR Providers Guide](./ocr-providers.md)
- [BACKLOG.md](../../BACKLOG.md)
