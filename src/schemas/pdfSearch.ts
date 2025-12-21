import {
  array,
  bool,
  description,
  gte,
  type InferOutput,
  int,
  min,
  num,
  object,
  optional,
  str,
} from '@sylphx/vex';
import type { PdfSourceSearchResult } from '../types/pdf.js';
import { pdfSourceSchema } from './pdfSource.js';

export const pdfSearchArgsSchema = object({
  sources: array(pdfSourceSchema),
  query: str(min(1), description('Plain text or regular expression to search for within pages.')),
  use_regex: optional(bool(description('Treat the query as a regular expression.'))),
  case_sensitive: optional(bool(description('Enable case sensitive matching.'))),
  context_chars: optional(
    num(int, gte(0), description('Number of characters to include before/after each match.'))
  ),
  max_hits: optional(
    num(int, gte(1), description('Maximum number of matches to return across all pages.'))
  ),
  max_chars_per_page: optional(
    num(int, gte(1), description('Truncate each page before searching to control payload size.'))
  ),
  preserve_whitespace: optional(
    bool(description('Preserve original whitespace when building text.'))
  ),
  trim_lines: optional(bool(description('Trim leading/trailing whitespace for each text line.'))),
  allow_full_document: optional(
    bool(
      description(
        'When true, allows searching the entire document if no pages are specified. When false, only a small sample of pages will be processed.'
      )
    )
  ),
});

export type PdfSearchArgs = InferOutput<typeof pdfSearchArgsSchema>;

export interface PdfSearchResponse {
  results: PdfSourceSearchResult[];
}
