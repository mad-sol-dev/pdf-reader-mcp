// PDF-related TypeScript type definitions

export interface PdfInfo {
  PDFFormatVersion?: string;
  IsLinearized?: boolean;
  IsAcroFormPresent?: boolean;
  IsXFAPresent?: boolean;
  [key: string]: unknown;
}

export type PdfMetadata = Record<string, unknown>;

export interface ExtractedPageText {
  page: number;
  text: string;
}

export interface ExtractedImage {
  page: number;
  index: number;
  width: number;
  height: number;
  format: string;
  data: string; // base64 encoded image data
}

// Content item with position for ordering
export interface PageContentItem {
  type: 'text' | 'image';
  yPosition: number;
  textContent?: string;
  imageData?: ExtractedImage;
}

export interface PdfResultData {
  info?: PdfInfo;
  metadata?: PdfMetadata;
  num_pages?: number;
  full_text?: string;
  page_texts?: ExtractedPageText[];
  page_contents?: Array<{ page: number; items: PageContentItem[] }>;
  images?: ExtractedImage[];
  warnings?: string[];
}

export interface PdfMetadataSummary extends PdfResultData {
  fingerprint?: string;
  has_page_labels?: boolean;
  has_outline?: boolean;
  sample_page_labels?: string[];
}

export interface PdfSourceResult {
  source: string;
  success: boolean;
  data?: PdfResultData | undefined;
  error?: string;
}

export interface PdfPageText {
  page_number: number;
  page_index: number;
  page_label?: string | null;
  lines: string[];
  text: string;
  truncated?: boolean;
  image_indexes?: number[];
}

export interface PdfPagesData {
  pages: PdfPageText[];
  warnings?: string[];
  truncated_pages?: number[];
}

export interface PdfSourcePagesResult {
  source: string;
  success: boolean;
  data?: PdfPagesData | undefined;
  error?: string;
}

export interface PdfImageInfo {
  page: number;
  index: number;
  width: number;
  height: number;
  format: string;
}

export interface PdfImageListData {
  images: PdfImageInfo[];
  total_images: number;
  warnings?: string[];
}

export interface PdfImageListResult {
  source: string;
  success: boolean;
  data?: PdfImageListData | undefined;
  error?: string;
}

export interface PdfRenderResult {
  source: string;
  success: boolean;
  data?: {
    page: number;
    width: number;
    height: number;
    scale: number;
    fingerprint: string;
    image_base64: string;
  };
  error?: string;
}

export interface OcrResult {
  source: string;
  success: boolean;
  data?: {
    text: string;
    provider: string;
    fingerprint: string;
    from_cache: boolean;
    page?: number;
    image?: { page: number; index: number };
  };
  error?: string;
}

export interface CacheStats {
  text_entries: number;
  ocr_entries: number;
  text_keys: string[];
  ocr_keys: string[];
}

export interface PdfSourceMetadataResult {
  source: string;
  success: boolean;
  data?: PdfMetadataSummary | undefined;
  error?: string;
}

export interface PageStat {
  page: number;
  text_length: number;
  image_count: number;
  has_text: boolean;
  has_images: boolean;
}

export interface PdfPageStats {
  num_pages: number;
  page_stats: PageStat[];
  warnings?: string[];
}

export interface PdfSourcePageStatsResult {
  source: string;
  success: boolean;
  data?: PdfPageStats | undefined;
  error?: string;
}

export interface PdfTocItem {
  title: string;
  page?: number;
  depth: number;
}

export interface PdfTocData {
  has_outline: boolean;
  toc: PdfTocItem[];
}

export interface PdfSourceTocResult {
  source: string;
  success: boolean;
  data?: PdfTocData | undefined;
  error?: string;
}

export interface PdfSearchHit {
  page_number: number;
  page_index: number;
  page_label?: string | null;
  match: string;
  context: string;
}

export interface PdfSearchData {
  hits: PdfSearchHit[];
  total_hits: number;
  warnings?: string[];
  truncated_pages?: number[];
}

export interface PdfSourceSearchResult {
  source: string;
  success: boolean;
  data?: PdfSearchData | undefined;
  error?: string;
}

export interface PdfSource {
  path?: string | undefined;
  url?: string | undefined;
  pages?: string | number[] | undefined;
}

export interface ReadPdfOptions {
  include_full_text: boolean;
  include_metadata: boolean;
  include_page_count: boolean;
  include_images: boolean;
}
