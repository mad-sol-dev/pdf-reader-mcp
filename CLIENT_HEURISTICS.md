# Client-Side Heuristics for Intelligent OCR Decision

This guide shows how clients can use `pdf-reader-mcp` tools to make intelligent decisions about when to apply OCR processing, minimizing costs while maximizing coverage.

## Quick Start: Smart OCR Workflow

```typescript
// Step 1: Get document overview
const metadata = await mcp.call('pdf_get_metadata', {
  sources: [{ path: 'document.pdf' }],
  include_page_count: true
});

const totalPages = metadata.results[0].data.num_pages;
console.log(`Document has ${totalPages} pages`);

// Step 2: Analyze page statistics to find OCR candidates
const stats = await mcp.call('pdf_get_page_stats', {
  sources: [{ path: 'document.pdf' }],
  include_images: true,
  allow_full_document: true  // Required for full document analysis
});

// Identify pages that likely need OCR
const ocrCandidates = stats.results[0].data.page_stats.filter(page =>
  page.text_length < 100 ||    // Very little text = likely scanned
  page.image_count > 2          // Many images = complex layout
);

console.log(`Found ${ocrCandidates.length} pages needing OCR out of ${totalPages}`);

// Step 3: Extract text with markers for OCR candidates
const textResult = await mcp.call('pdf_read_pages', {
  source: { path: 'document.pdf' },
  pages: ocrCandidates.map(p => p.page).join(','),
  insert_markers: true  // Enable content markers
});

// Step 4: Decide which pages need OCR based on markers
for (const page of textResult.results[0].data.pages) {
  const hasComplexContent =
    page.text.includes('[TABLE DETECTED]') ||
    (page.text.match(/\[IMAGE \d+:/g) || []).length > 2;

  if (hasComplexContent || page.text.length < 200) {
    console.log(`Page ${page.page_number} needs OCR`);
    // Apply OCR only to these pages
    const ocrResult = await mcp.call('pdf_ocr_page', {
      source: { path: 'document.pdf' },
      page: page.page_number,
      provider: { /* OCR config */ }
    });
  }
}
```

## Heuristic Strategies

### 1. Text Length Heuristic

**Use case:** Identify scanned pages (images of documents)

```typescript
const isLikelyScanned = (page: PdfPageText): boolean => {
  return page.text.length < 100;  // Scanned pages have very little extractable text
};

// Alternative: Use character-to-image ratio
const hasLowTextDensity = (textLength: number, imageCount: number): boolean => {
  if (imageCount === 0) return false;
  return textLength / imageCount < 50;  // Less than 50 chars per image
};
```

**Thresholds:**
- `< 50 chars`: Almost certainly scanned
- `50-200 chars`: Possibly scanned or sparse layout
- `> 200 chars`: Likely has selectable text

### 2. Image Count Heuristic

**Use case:** Identify pages with complex visual layouts

```typescript
const hasComplexLayout = (imageCount: number): boolean => {
  return imageCount >= 3;  // Multiple images/diagrams
};

const hasSingleLargeImage = (page: PageStats): boolean => {
  // If page has 1 image and very little text, it's likely a full-page scan
  return page.image_count === 1 && page.text_length < 100;
};
```

**Thresholds:**
- `0 images`: Text-only page (no OCR needed unless text_length is low)
- `1-2 images`: Normal page with figures
- `≥ 3 images`: Complex layout, may benefit from OCR

### 3. Content Marker Heuristic

**Use case:** Detect specific content types that benefit from OCR

```typescript
const needsOCR = (pageText: string): {
  reason: string;
  confidence: 'high' | 'medium' | 'low';
} => {
  // Check for table markers
  if (pageText.includes('[TABLE DETECTED]')) {
    return { reason: 'Contains table', confidence: 'high' };
  }

  // Check for multiple images
  const imageCount = (pageText.match(/\[IMAGE \d+:/g) || []).length;
  if (imageCount >= 3) {
    return { reason: 'Multiple images/diagrams', confidence: 'high' };
  }
  if (imageCount >= 1 && pageText.length < 200) {
    return { reason: 'Image-heavy with little text', confidence: 'medium' };
  }

  // Check text density
  if (pageText.length < 100) {
    return { reason: 'Very sparse text', confidence: 'medium' };
  }

  return { reason: 'Standard text page', confidence: 'low' };
};
```

### 4. Pattern-Based Heuristic

**Use case:** Detect specific document types

```typescript
const detectDocumentType = (text: string): string => {
  // Financial statements often have tables
  if (text.includes('[TABLE DETECTED]') &&
      /\$([\d,]+)|\d{1,3}(,\d{3})*(\.\d{2})?/.test(text)) {
    return 'financial';
  }

  // Scientific papers have figures and formulas
  if ((text.match(/\[IMAGE \d+:/g) || []).length > 5 &&
      /Figure \d+|Table \d+/.test(text)) {
    return 'scientific';
  }

  // Invoices/receipts are often scanned
  if (text.length < 150 && /invoice|receipt|total|amount/i.test(text)) {
    return 'invoice';
  }

  return 'general';
};

const shouldOCRByType = (docType: string): boolean => {
  const ocrTypes = ['financial', 'invoice', 'form'];
  return ocrTypes.includes(docType);
};
```

## Cost Optimization Examples

### Example 1: 800-Page Book

```typescript
// Before: OCR all pages → 800 API calls ≈ $160 (at $0.20/page)
// After: Smart heuristics

const ocrNeeded = [];

for (const page of allPages) {
  // Most book pages are text-only
  if (page.text.includes('[IMAGE')) {
    ocrNeeded.push(page.page_number);
  }
}

// Result: ~50 pages with images → 50 API calls ≈ $10
// Savings: 94% ($150)
```

### Example 2: Mixed Scanned/Digital Document

```typescript
const stats = await getPageStats(document);

// Batch 1: Normal text extraction (fast, free)
const textPages = stats.filter(p => p.text_length > 200);
const normalText = await readPages(textPages);

// Batch 2: OCR for scanned pages (slow, paid)
const scannedPages = stats.filter(p => p.text_length < 100);
const ocrText = await Promise.all(
  scannedPages.map(p => ocrPage(p.page))
);

// Result: 70% text extraction (free) + 30% OCR (paid)
// Cost: 30% of full OCR approach
```

### Example 3: Scientific Paper

```typescript
const pages = await readPages(document, { insert_markers: true });

const needsOCR = pages.filter(page => {
  // Skip text-only introduction/conclusion
  if (!page.text.includes('[IMAGE') && !page.text.includes('[TABLE')) {
    return false;
  }

  // OCR pages with complex figures or tables
  const imageCount = (page.text.match(/\[IMAGE/g) || []).length;
  const hasTable = page.text.includes('[TABLE DETECTED]');

  return imageCount >= 2 || hasTable;
});

// Result: ~20 pages with figures/tables out of 12 pages
// Cost: $4 instead of $2.40 if we did all pages
// But: Better quality for complex content
```

## Decision Tree

```
START
  │
  ├─ text_length < 50?
  │   └─ YES → OCR (likely scanned) [HIGH CONFIDENCE]
  │
  ├─ Contains [TABLE DETECTED]?
  │   └─ YES → OCR (complex tables) [HIGH CONFIDENCE]
  │
  ├─ image_count >= 3?
  │   └─ YES → OCR (complex layout) [MEDIUM CONFIDENCE]
  │
  ├─ image_count >= 1 AND text_length < 200?
  │   └─ YES → OCR (image-heavy) [MEDIUM CONFIDENCE]
  │
  └─ ELSE → Normal text extraction [LOW CONFIDENCE]
```

## Best Practices

### 1. Two-Pass Strategy

```typescript
// Pass 1: Quick assessment with page_stats (fast)
const stats = await getPageStats({ include_images: true });
const potentialOcrPages = stats.filter(p =>
  p.text_length < 100 || p.image_count > 2
);

// Pass 2: Detailed check with markers (slower, but only for candidates)
const detailedPages = await readPages(potentialOcrPages, {
  insert_markers: true
});

// Final decision based on markers
const finalOcrPages = detailedPages.filter(p =>
  needsOCR(p.text).confidence !== 'low'
);
```

### 2. Sampling for Large Documents

```typescript
// For very large documents (> 1000 pages), sample first
const sampleSize = 50;
const samplePages = stats.slice(0, sampleSize);

const sampleStats = {
  avgTextLength: samplePages.reduce((s, p) => s + p.text_length, 0) / sampleSize,
  avgImageCount: samplePages.reduce((s, p) => s + p.image_count, 0) / sampleSize,
};

// Estimate OCR needs based on sample
if (sampleStats.avgTextLength < 150) {
  console.log('Document appears to be mostly scanned - consider full OCR');
} else if (sampleStats.avgImageCount > 2) {
  console.log('Image-heavy document - apply selective OCR');
} else {
  console.log('Text-based document - minimal OCR needed');
}
```

### 3. Caching Strategy

```typescript
// Cache marker analysis to avoid re-reading pages
const markerCache = new Map<number, boolean>();

const shouldOcrCached = async (pageNum: number): Promise<boolean> => {
  if (markerCache.has(pageNum)) {
    return markerCache.get(pageNum)!;
  }

  const page = await readPage(pageNum, { insert_markers: true });
  const decision = needsOCR(page.text).confidence !== 'low';
  markerCache.set(pageNum, decision);

  return decision;
};
```

## Tools Comparison

| Tool | Speed | Cost | Use Case |
|------|-------|------|----------|
| `pdf_get_page_stats` | ⚡ Fast | Free | Initial screening |
| `pdf_read_pages` (no markers) | ⚡ Fast | Free | Text extraction |
| `pdf_read_pages` (with markers) | 🔶 Medium | Free | Detailed analysis |
| `pdf_ocr_page` | 🐌 Slow | Paid | Complex content |

**Recommended workflow:**
1. `pdf_get_page_stats` → Filter candidates
2. `pdf_read_pages` + markers → Confirm OCR need
3. `pdf_ocr_page` → Apply OCR selectively

## Summary

**Key metrics to track:**
- `text_length`: < 100 chars → likely scanned
- `image_count`: ≥ 3 images → complex layout
- `[TABLE DETECTED]` → structured data
- `[IMAGE n]` markers → visual content

**Cost optimization:**
- Use free tools first (page_stats, read_pages)
- Apply OCR only when markers indicate complex content
- Target 10-20% OCR rate for mixed documents (80-90% cost savings)
