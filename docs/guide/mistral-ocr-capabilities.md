# Mistral OCR API - Complete Capabilities Reference

> **Source:** [Mistral AI Documentation](https://docs.mistral.ai/capabilities/document_ai/basic_ocr)
> **Last Updated:** 2025-12-23

## Overview

Mistral Document AI API provides a dedicated OCR processor powered by `mistral-ocr-latest` model for extracting text and structured content from PDF documents.

## API Method

```typescript
const result = await client.ocr.process({
  model: "mistral-ocr-latest",
  document: {...},
  // Optional parameters
  tableFormat?: "markdown" | "html",
  extractHeader?: boolean,
  extractFooter?: boolean,
  includeImageBase64?: boolean,
  pages?: number[],
  documentAnnotationFormat?: {...},
  bboxAnnotationFormat?: {...}
});
```

## Key Features

### Text Extraction
- ✅ Extracts text while maintaining document structure and hierarchy
- ✅ Preserves formatting (headers, paragraphs, lists, tables)
- ✅ Returns results in markdown format
- ✅ Handles complex layouts (multi-column, mixed content)
- ✅ Returns hyperlinks when available
- ✅ High accuracy at scale

### Table Handling
- **Markdown format** (default): Tables as markdown
- **HTML format**: Tables as HTML with references `[tbl-3.html](tbl-3.html)`
- Available via `tableFormat` parameter
- Only available in OCR 2512 or newer

### Headers & Footers
- **Separate extraction**: `extractHeader` and `extractFooter` parameters
- **Default behavior**: Headers/footers included in main content
- **Response fields**: `header` and `footer` fields when extracted
- Only available in OCR 2512 or newer

### Image Support
- **Bounding boxes**: Image locations and dimensions
- **Base64 data**: Optional via `includeImageBase64`
- **Placeholders**: Images replaced with `![img-0.jpeg](img-0.jpeg)`
- **Mapping**: Use `images` array to map placeholders to actual data

### Advanced Features
- **Annotations**: Structured data extraction with schemas
- **Document annotation**: Extract specific fields from entire document
- **BBox annotation**: Annotate individual bboxes (charts, figures)
- **Vision LLM integration**: For chart-to-table conversion, image descriptions

## Document Input Formats

### 1. Document URL (Direct PDF)
```typescript
document: {
  type: "document_url",
  documentUrl: "https://arxiv.org/pdf/2201.04234"
}
```
**Supported formats:**
- PDF (.pdf)
- Word Documents (.docx)
- PowerPoint (.pptx)
- Text Files (.txt)
- EPUB (.epub)
- XML/DocBook (.xml)
- RTF (.rtf)
- OpenDocument Text (.odt)
- BibTeX/BibLaTeX (.bib)
- FictionBook (.fb2)
- Jupyter Notebooks (.ipynb)
- JATS XML (.xml)
- LaTeX (.tex)
- OPML (.opml)
- Troff (.1, .man)

### 2. Image URL (Base64 or URL)
```typescript
document: {
  type: "image_url",
  imageUrl: "data:image/jpeg;base64,..." // or https://...
}
```
**Supported formats:**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- AVIF (.avif)
- TIFF (.tiff)
- GIF (.gif)
- HEIC/HEIF (.heic, .heif)
- BMP (.bmp)
- WebP (.webp)

### 3. File Upload
```typescript
const uploaded = await client.files.upload({
  file: { fileName: 'doc.pdf', content: buffer },
  purpose: 'ocr'
});

document: { fileId: uploaded.id }
```

## Response Structure

```typescript
{
  pages: [
    {
      index: number,              // Page index (0-based)
      markdown: string,           // Main output - extracted text as markdown
      images: [                   // Image metadata
        {
          bbox: [x1, y1, x2, y2], // Bounding box coordinates
          width: number,
          height: number,
          base64?: string         // If includeImageBase64=true
        }
      ],
      tables: [                   // Table metadata (if tableFormat="html")
        {
          html: string,
          bbox: [x1, y1, x2, y2]
        }
      ],
      hyperlinks: string[],       // URLs found in page
      header: string | null,      // Header content (if extractHeader=true)
      footer: string | null,      // Footer content (if extractFooter=true)
      dimensions: {               // Page dimensions
        width: number,
        height: number
      }
    }
  ],
  model: string,                  // Model used (e.g., "mistral-ocr-latest")
  document_annotation: object | null,  // Structured data (if documentAnnotationFormat provided)
  usage_info: {                   // API usage statistics
    prompt_tokens: number,
    completion_tokens: number,
    total_tokens: number
  }
}
```

## Annotations (Advanced)

### Document Annotation
Extract structured data from entire document using Zod schemas:

```typescript
import { z } from 'zod';
import { responseFormatFromZodObject } from '@mistralai/mistralai/extra/structChat.js';

const DocumentSchema = z.object({
  language: z.string().describe("The language of the document."),
  chapter_titles: z.array(z.string()).describe("List of chapter titles."),
  urls: z.array(z.string()).describe("List of URLs found."),
});

const result = await client.ocr.process({
  model: "mistral-ocr-latest",
  document: { type: "document_url", documentUrl: "https://..." },
  documentAnnotationFormat: responseFormatFromZodObject(DocumentSchema)
});

// result.document_annotation contains structured data matching schema
```

**Use cases:**
- Form parsing and data extraction
- Invoice/receipt data capture
- Contract key clause extraction
- Document classification
- Metadata extraction

### BBox Annotation
Annotate individual bboxes (charts, figures, etc.):

```typescript
const BBoxSchema = z.object({
  chart_type: z.string(),
  data_description: z.string(),
  extracted_values: z.array(z.number())
});

const result = await client.ocr.process({
  model: "mistral-ocr-latest",
  document: { type: "document_url", documentUrl: "https://..." },
  bboxAnnotationFormat: responseFormatFromZodObject(BBoxSchema)
});
```

**Use cases:**
- Chart-to-table conversion
- Figure captioning and description
- Technical diagram analysis
- Signature detection
- Custom image type classification

## Processing Workflow

### For PDFs/Images
1. Convert pages to images
2. Send to Vision-capable LLM with annotation format
3. Return structured data

### For Office Docs (DOCX/PPTX)
1. Run OCR first to extract markdown
2. Send markdown to Vision-capable LLM with annotation format
3. Return structured data

## Limitations

- **File size**: Max 50 MB per document
- **Page count**: Max 1,000 pages per document
- **Timeout**: Default 15s (configurable)

## Current Implementation Status

### ✅ Implemented
- `client.ocr.process()` with file upload
- `tableFormat` parameter (via extras)
- Upload + cleanup workflow
- Basic markdown extraction

### ❌ Not Implemented (See BACKLOG.md)
- Full response structure (images, tables, hyperlinks, etc.)
- `extractHeader` / `extractFooter` parameters
- `includeImageBase64` parameter
- `pages` parameter (multi-page in single call)
- `documentAnnotationFormat` (structured extraction)
- `bboxAnnotationFormat` (bbox annotation)
- Direct URL support (document_url, image_url)
- Usage info tracking

## Related Documentation

- [OCR Providers Guide](./ocr-providers.md)
- [Getting Started](./getting-started.md)
- [Mistral Annotations Docs](https://docs.mistral.ai/capabilities/document_ai/annotations)
- [Mistral Document QnA](https://docs.mistral.ai/capabilities/document_ai/document_qna)
