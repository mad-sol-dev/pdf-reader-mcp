# Getting Started

The PDF Reader MCP server ships a focused toolkit of specialized tools instead of a single monolithic extractor. Use the quick-start workflow below to orient yourself, then pick the tool that best matches your task with the sample inputs/outputs provided.

## Quick start workflow

1. **Probe the document** with `pdf_get_metadata` to learn page counts, page labels, and whether a TOC exists.
2. **Map the structure** using `pdf_get_toc` and `pdf_get_page_stats` to find text-heavy or image-heavy sections before pulling pages.
3. **Extract content** with `pdf_read_pages` (text), `pdf_search` (keyword/regex), `pdf_render_page` (raster), or `pdf_get_image` (embedded image).
4. **Run OCR when needed** via `pdf_ocr_page` or `pdf_ocr_image`, leaning on built-in caches for repeat calls.
5. **Inspect or reset caches** with `pdf_cache_stats` and `pdf_cache_clear`.

> Looking for design rationale? See the [Design Philosophy](../design/index.md#design-philosophy) page for how these tools align with the core principles.

## Tool-by-tool examples

### Metadata & navigation

**`pdf_get_metadata` — document probe**

Minimal request to gather metadata, page count, page labels, and outline presence:

```json
{
  "sources": [
    { "path": "./docs/report.pdf" }
  ]
}
```

Output highlights per source:

```json
{
  "results": [
    {
      "source": "./docs/report.pdf",
      "success": true,
      "data": {
        "num_pages": 42,
        "info": { "Title": "Quarterly Report" },
        "metadata": { "custom:tag": "finance" },
        "has_page_labels": true,
        "sample_page_labels": ["i", "ii", "1", "2"],
        "has_outline": true
      }
    }
  ]
}
```

**`pdf_get_toc` — flattened table of contents**

```json
{
  "sources": [{ "path": "./docs/report.pdf" }]
}
```

Returns `toc` entries with depth and resolved page numbers:

```json
{
  "results": [
    {
      "data": {
        "has_outline": true,
        "toc": [
          { "title": "Executive Summary", "page": 1, "depth": 0 },
          { "title": "Financials", "page": 5, "depth": 0 },
          { "title": "Q1", "page": 6, "depth": 1 }
        ]
      }
    }
  ]
}
```

**`pdf_get_page_stats` — length & density preview**

```json
{
  "sources": [{ "path": "./docs/report.pdf" }],
  "include_images": true
}
```

Outputs character counts and image counts per page so you can prioritize heavy sections:

```json
{
  "results": [
    {
      "data": {
        "num_pages": 42,
        "page_stats": [
          { "page": 1, "text_length": 1200, "image_count": 0, "has_text": true, "has_images": false },
          { "page": 5, "text_length": 400, "image_count": 2, "has_text": true, "has_images": true }
        ]
      }
    }
  ]
}
```

### Reading & search

**`pdf_read_pages` — structured text with optional image references**

```json
{
  "sources": [
    { "path": "./docs/report.pdf", "pages": "1-3, 10" }
  ],
  "include_image_indexes": true,
  "preserve_whitespace": false,
  "trim_lines": true
}
```

Each page includes ordered `lines`, combined `text`, optional `page_label`, and any `image_indexes` present on that page.

**`pdf_search` — regex or plain-text matches with context**

```json
{
  "sources": [{ "path": "./docs/report.pdf" }],
  "query": "revenue",
  "context_chars": 80,
  "max_hits": 5
}
```

Results return page indexes/labels plus `match` text and `context_before`/`context_after` strings sized by `context_chars` on either side of the hit.

### Images & OCR

**`pdf_list_images` — enumerate embedded images**

```json
{
  "sources": [{ "path": "./docs/report.pdf", "pages": "5,7-8" }]
}
```

Responds with `images` entries like `{ "page": 5, "index": 0, "width": 1200, "height": 900, "format": "png" }` without base64 payloads.

**`pdf_get_image` — fetch a single embedded image**

```json
{
  "source": { "path": "./docs/report.pdf" },
  "page": 5,
  "index": 0
}
```

Returns JSON metadata plus a PNG part containing the image data.

**`pdf_render_page` — rasterize a page for vision tasks**

```json
{
  "source": { "path": "./docs/report.pdf" },
  "page": 5,
  "scale": 1.5
}
```

Responds with page dimensions, scale, fingerprint, and a PNG part for the rendered page.

**`pdf_ocr_page` — OCR a rendered page with caching**

```json
{
  "source": { "path": "./docs/report.pdf" },
  "page": 5,
  "scale": 1.5,
  "provider": {
    "type": "http",
    "endpoint": "https://example-ocr.internal/v1/ocr",
    "api_key": "sk-ocr-demo",
    "model": "vision-large",
    "language": "en"
  },
  "cache": true
}
```

Outputs OCR `text`, provider info, whether it came `from_cache`, and page identifiers. Use `pdf_ocr_image` similarly when you already know the image index.

### Cache management

Inspect cache state or clear scopes between runs:

```json
{ "scope": "all" }
```

- `pdf_cache_stats` returns text/OCR cache counts and keys.
- `pdf_cache_clear` accepts `scope: "text" | "ocr" | "all"` and reports which caches were flushed.

### Compatibility tool

`read_pdf` remains available for legacy clients that expect a single payload containing `full_text` or `page_texts`, `metadata`, `num_pages`, optional `images`, and `warnings`. Prefer the specialized tools above for new integrations.
