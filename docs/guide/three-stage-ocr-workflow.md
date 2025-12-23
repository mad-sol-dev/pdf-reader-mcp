# 3-Stage OCR Workflow

> **Status:** Implemented & Tested
> **Last Updated:** 2025-12-23

## Overview

The PDF Reader MCP implements a 3-stage workflow for intelligent document processing, balancing speed, cost, and accuracy. **Critical insight:** Vision APIs (not OCR APIs) are required for diagrams and charts.

## Quick Decision Tree

```
Stage 1: Read PDF text + markers
  ↓
Found [IMAGE] marker?
  ├─ Is it a diagram/chart/graphic?
  │   └─ YES → Stage 2: Vision API (mistral or claude)
  │
  └─ Is it scanned text/form?
      └─ YES → Stage 3: OCR API (mistral-ocr)

Found [TABLE] marker?
  └─ Stage 3: OCR API with tableFormat="html"
```

---

## Stage 1: Text Extraction with Markers ✅

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
        text: "Title\n\n[IMAGE]\n\nSome text...\n\n[TABLE]\n\nMore text...",
        image_indexes: [0, 1], // Indexes for Stage 2/3
        lines: [...]
      }]
    }
  }]
}
```

**Features:**
- ✅ Extracts native PDF text (fast, no API calls)
- ✅ Inserts `[IMAGE]` markers at approximate image positions
- ✅ Inserts `[TABLE]` markers at detected table positions
- ✅ Returns image indexes for targeted OCR
- ✅ Maintains reading order (Y-coordinate based)
- ✅ Cached results (fingerprint-based)

**Decision Logic:**
```typescript
if (text.includes('[IMAGE]')) {
  // Check image type → Route to Vision or OCR
  const imageType = identifyImageType(image);
  if (imageType === 'diagram' || imageType === 'chart') {
    // → Stage 2: Vision API
  } else if (imageType === 'scanned_text') {
    // → Stage 3: OCR API
  }
}

if (text.includes('[TABLE]')) {
  // → Stage 3: OCR API with tableFormat
}

if (text.length > 500 && !text.includes('[IMAGE]')) {
  // Text-heavy page → Stage 1 sufficient
}
```

---

## Stage 2: Vision Analysis (Diagrams/Charts) ✅

**Goal:** Semantic understanding of visual content (diagrams, charts, photos)

**Tool:** `pdf_ocr_image` or `pdf_ocr_page` with `provider.type: 'mistral'` (Vision API)

**Implementation Status:** ✅ Complete & Tested

**⚠️ CRITICAL:** Use Vision API for diagrams, NOT OCR API!

**Test Results:** See [OCR_COMPARISON_TEST.md](../../OCR_COMPARISON_TEST.md)
- **Mistral Vision:** 95%+ accuracy on timing diagrams ✅
- **Mistral OCR:** <10% accuracy on timing diagrams ❌

### Vision API for Diagrams

**Usage:**
```typescript
// Extract from specific image (recommended)
const result = await client.tools.pdf_ocr_image({
  source: { path: "technical-doc.pdf" },
  page: 890,
  index: 1,  // From Stage 1 image_indexes
  provider: {
    type: "mistral",  // Vision API, NOT "mistral-ocr"
    extras: {
      prompt: "Analyze this timing diagram. Extract all signal names, voltage thresholds, timing parameters, and labels. Be precise and comprehensive."
    }
  },
  cache: true
});
```

**Output:**
```typescript
{
  source: "technical-doc.pdf",
  success: true,
  data: {
    text: "The timing diagram shows:\n\nSignals:\n1. VDD33 (3.3V IO Power)\n2. 1.8V Core Power\n3. RESET (External)\n4. Internal RESET\n\nThresholds:\n- 1.62V (VDD33/2)\n- 3.3V nominal\n- 1.8V nominal\n\nTiming:\n- More than 4T where T is XTAL cycle\n- 75ms from valid power to reset release\n\nAnnotations:\n- Valid power on setting value\n...",
    provider: "mistral",
    fingerprint: "...",
    from_cache: false,
    image: { page: 890, index: 1 }
  }
}
```

**Features:**
- ✅ Semantic understanding of diagrams
- ✅ Extracts labels, annotations, timing parameters
- ✅ Works with technical diagrams (timing, circuit, flowchart)
- ✅ Custom prompts for specific analysis
- ✅ Cached results
- ✅ 5x cheaper than Claude Vision (~$0.003 vs ~$0.015)
- ✅ Comparable accuracy to Claude Vision

**Use Cases:**
- ✅ Timing diagrams
- ✅ Circuit diagrams
- ✅ Flowcharts
- ✅ Charts and graphs
- ✅ Complex technical illustrations
- ✅ Architectural diagrams

**When NOT to Use:**
- ❌ Scanned text documents (use OCR API)
- ❌ Forms and invoices (use OCR API)
- ❌ Tables (use OCR API)

**Alternative: Claude Vision**

```typescript
// For highest accuracy (more expensive)
const result = await client.tools.pdf_ocr_image({
  source: { path: "diagram.pdf" },
  page: 1,
  index: 0,
  provider: {
    type: "claude-vision", // Hypothetical - not implemented
  }
});
```

**Cost Comparison:**
- Mistral Vision: ~$0.003 per image ✅ Best value
- Claude Vision: ~$0.015 per image (5x more expensive)

---

## Stage 3: OCR Extraction (Text/Tables) ✅

**Goal:** Precise text extraction from scanned documents, forms, and tables

**Tool:** `pdf_ocr_page` or `pdf_ocr_image` with `provider.type: 'mistral-ocr'` (OCR API)

**Implementation Status:** ✅ Complete & Tested

**⚠️ CRITICAL:** Use OCR API for text documents, NOT for diagrams!

### 3a. Full Page OCR (Scanned Documents)

**Usage:**
```typescript
const result = await client.tools.pdf_ocr_page({
  source: { path: "scanned-invoice.pdf" },
  page: 1,
  provider: {
    type: "mistral-ocr",  // OCR API, NOT "mistral"
    extras: {
      tableFormat: "html",
      includeFullResponse: "true",  // Get full structure
      extractHeader: "true",
      extractFooter: "true"
    }
  },
  scale: 2.0,  // Higher scale for better accuracy
  cache: true
});
```

**Output (with `includeFullResponse: "true"`):**
```typescript
{
  source: "scanned-invoice.pdf",
  success: true,
  data: {
    text: "Invoice #12345\n\nDate: 2025-12-23...",
    provider: "mistral-ocr",
    model: "mistral-ocr-latest",
    fingerprint: "...",
    from_cache: false,
    page: 1,
    pages: [{
      index: 0,
      markdown: "Invoice #12345...",
      header: "Company Name",
      footer: "Page 1 of 3",
      dimensions: { width: 1224, height: 1584, dpi: 200 },
      tables: [{
        id: "tbl-0.html",
        content: "<table><tr><td>Item</td><td>Price</td></tr>...</table>",
        format: "html"
      }],
      images: [{
        id: "img-0.jpeg",
        topLeftX: 50,
        topLeftY: 100,
        bottomRightX: 200,
        bottomRightY: 250
      }],
      hyperlinks: ["https://example.com"]
    }]
  }
}
```

**Features:**
- ✅ Dedicated OCR model (optimized for text extraction)
- ✅ Table format control (html/markdown)
- ✅ Header/footer extraction
- ✅ Full response structure with images, tables, hyperlinks
- ✅ Caching support (disk + memory)
- ✅ Best for text documents

**Use Cases:**
- ✅ Scanned documents
- ✅ Invoices and receipts
- ✅ Forms and applications
- ✅ Tables with structured data
- ✅ Text-heavy PDFs

**When NOT to Use:**
- ❌ Technical diagrams (use Vision API)
- ❌ Charts and graphs (use Vision API)
- ❌ Complex illustrations (use Vision API)

### 3b. Image-Specific OCR

**Usage:**
```typescript
// OCR a specific embedded image (if it contains scanned text)
const result = await client.tools.pdf_ocr_image({
  source: { path: "document.pdf" },
  page: 5,
  index: 2,  // From Stage 1 image_indexes
  provider: {
    type: "mistral-ocr",  // For scanned text in image
    extras: {
      tableFormat: "html",
      includeFullResponse: "true"
    }
  },
  cache: true
});
```

**When to Use:**
- Image contains scanned text (not a diagram)
- Form embedded as image
- Table embedded as image

**When NOT to Use:**
- Image is a diagram/chart (use `type: "mistral"` Vision API)

---

## Smart OCR Decision

**Optional:** `smart_ocr` parameter automatically decides if OCR is needed

**Usage:**
```typescript
const result = await client.tools.pdf_ocr_page({
  source: { path: "document.pdf" },
  page: 1,
  provider: { type: "mistral-ocr" },
  smart_ocr: true  // Auto-decide if OCR needed
});
```

**Heuristics:**
- Text too short (<50 chars) → Run OCR
- Text too long (>1000 chars) → Skip OCR (use native text)
- High non-ASCII ratio → Run OCR (likely garbled text)
- High image-to-text ratio → Run OCR (mostly images)

**Benefits:**
- Saves API costs on text-heavy pages
- Faster processing
- Automatic optimization

---

## Complete Example Workflow

```typescript
// Stage 1: Extract text + markers
const stage1 = await client.tools.pdf_read_pages({
  sources: [{ path: "technical-doc.pdf", pages: [890] }],
  insert_markers: true,
  include_image_indexes: true
});

const page = stage1.results[0].data.pages[0];

// Check if page has images
if (page.text.includes('[IMAGE]')) {
  // Stage 2: Analyze each image
  for (const imageIndex of page.image_indexes) {
    // Determine image type (diagram vs scanned text)
    const imageType = identifyImageType(page.text, imageIndex);

    if (imageType === 'diagram' || imageType === 'chart') {
      // Use Vision API for diagrams
      const vision = await client.tools.pdf_ocr_image({
        source: { path: "technical-doc.pdf" },
        page: 890,
        index: imageIndex,
        provider: {
          type: "mistral",  // Vision API
          extras: {
            prompt: "Analyze this technical diagram..."
          }
        }
      });
      console.log('Diagram analysis:', vision.data.text);

    } else if (imageType === 'scanned_text') {
      // Use OCR API for scanned text
      const ocr = await client.tools.pdf_ocr_image({
        source: { path: "technical-doc.pdf" },
        page: 890,
        index: imageIndex,
        provider: { type: "mistral-ocr" }
      });
      console.log('Extracted text:', ocr.data.text);
    }
  }
}

// Check if page has tables
if (page.text.includes('[TABLE]')) {
  // Stage 3: OCR page with table extraction
  const table = await client.tools.pdf_ocr_page({
    source: { path: "technical-doc.pdf" },
    page: 890,
    provider: {
      type: "mistral-ocr",  // OCR API for tables
      extras: {
        tableFormat: "html",
        includeFullResponse: "true"
      }
    }
  });

  // Access structured table data
  const tables = table.data.pages[0].tables;
  console.log('Tables:', tables);
}
```

---

## Cost Analysis

### Per-Image Processing Costs

| Content Type | Recommended API | Provider | Cost/Image | Quality |
|--------------|----------------|----------|------------|---------|
| **Technical Diagram** | Vision | Mistral Vision | ~$0.003 | ✅ Excellent |
| **Technical Diagram** | Vision | Claude Vision | ~$0.015 | ✅ Excellent |
| **Scanned Text** | OCR | Mistral OCR | ~$0.002 | ✅ Excellent |
| **Table** | OCR | Mistral OCR | ~$0.002 | ✅ Excellent |
| **Form** | OCR | Mistral OCR | ~$0.002 | ✅ Excellent |

### Cost Savings Examples

**100-page technical manual with 50 diagrams:**
- ❌ Wrong: All pages with Mistral OCR = $0.20 (poor diagram results)
- ✅ Right: 50 diagrams with Mistral Vision + 50 pages with OCR = $0.25 (excellent results)
- 💰 Claude Vision alternative: $0.85 (3.4x more expensive)

**Cached re-processing:**
- First run: Full cost
- Subsequent runs: $0 (cached)

---

## Summary

### API Selection Rules

1. **Diagrams/Charts** → Vision API (`type: "mistral"`)
2. **Scanned Text/Forms/Tables** → OCR API (`type: "mistral-ocr"`)
3. **Text-heavy pages** → Stage 1 (no OCR needed)

### Common Mistakes

❌ **WRONG:** Using OCR API for diagrams
```typescript
provider: { type: "mistral-ocr" }  // Only extracts "Voltage (V)"
```

✅ **RIGHT:** Using Vision API for diagrams
```typescript
provider: { type: "mistral" }  // Extracts all signals, thresholds, timing
```

### Best Practices

1. Always run Stage 1 first (fast, free, identifies content)
2. Use Vision APIs for diagrams (semantic understanding)
3. Use OCR APIs for text documents (precise extraction)
4. Enable caching (saves cost on re-processing)
5. Use `smart_ocr` to auto-optimize
6. Prefer Mistral Vision over Claude Vision (5x cheaper, comparable quality)

---

## Related Documentation

- [OCR Providers](./ocr-providers.md) - Provider configuration
- [Mistral OCR Capabilities](./mistral-ocr-capabilities.md) - Full API reference
- [OCR_COMPARISON_TEST.md](../../OCR_COMPARISON_TEST.md) - Test results
- [BACKLOG.md](../../BACKLOG.md) - Planned enhancements
