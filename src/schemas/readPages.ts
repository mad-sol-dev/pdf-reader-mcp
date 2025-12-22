import {
  array,
  bool,
  description,
  gte,
  type InferOutput,
  int,
  num,
  object,
  optional,
} from '@sylphx/vex';
import type { PdfSourcePagesResult } from '../types/pdf.js';
import { pdfSourceSchema } from './pdfSource.js';

export const readPagesArgsSchema = object({
  sources: array(pdfSourceSchema),
  include_image_indexes: optional(
    bool(description('Include image indexes for each page (no image data is returned).'))
  ),
  insert_markers: optional(
    bool(
      description(
        'Insert [IMAGE] and [TABLE] markers inline with text at their approximate positions. ' +
          'Helps identify pages with complex content that may need OCR.'
      )
    )
  ),
  max_chars_per_page: optional(
    num(int, gte(1), description('Maximum characters to return per page before truncating.'))
  ),
  preserve_whitespace: optional(bool(description('Preserve original whitespace from the PDF.'))),
  trim_lines: optional(bool(description('Trim leading/trailing whitespace for each text line.'))),
  allow_full_document: optional(
    bool(
      description(
        'When true, allows reading the entire document if no pages are specified. When false, only a small sample of pages will be processed.'
      )
    )
  ),
});

export type ReadPagesArgs = InferOutput<typeof readPagesArgsSchema>;

export interface ReadPagesResponse {
  results: PdfSourcePagesResult[];
}
