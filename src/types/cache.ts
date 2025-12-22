/**
 * OCR disk cache structure
 *
 * Stores OCR results persistently as {pdf_basename}_ocr.json
 * alongside the source PDF for cost-effective reuse.
 */

export interface OcrDiskCache {
  /** SHA-256 fingerprint of the PDF (first 64KB) */
  fingerprint: string;
  /** Original PDF path */
  pdf_path: string;
  /** Cache creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
  /** OCR provider identifier (e.g., "mistral-ocr-2512") */
  ocr_provider: string;
  /** OCR results per page */
  pages: Record<string, OcrPageResult>;
  /** OCR results per embedded image (key: "page/imageIndex") */
  images: Record<string, OcrImageResult>;
}

export interface OcrPageResult {
  /** Extracted text (plain or markdown) */
  text: string;
  /** Markdown output (Mistral OCR specific) */
  markdown?: string;
  /** Structured table data (Mistral OCR specific) */
  tables?: unknown[];
  /** Extracted hyperlinks (Mistral OCR specific) */
  hyperlinks?: unknown[];
  /** Page dimensions (Mistral OCR specific) */
  dimensions?: {
    dpi?: number;
    height?: number;
    width?: number;
  };
  /** Provider configuration hash */
  provider_hash: string;
  /** When this result was cached */
  cached_at: string;
  /** Scale factor used during rendering */
  scale?: number;
}

export interface OcrImageResult {
  /** Extracted text (plain or markdown) */
  text: string;
  /** Markdown output (Mistral OCR specific) */
  markdown?: string;
  /** Provider configuration hash */
  provider_hash: string;
  /** When this result was cached */
  cached_at: string;
}
