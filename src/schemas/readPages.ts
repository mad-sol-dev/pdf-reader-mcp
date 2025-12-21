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
  max_chars_per_page: optional(
    num(int, gte(1), description('Maximum characters to return per page before truncating.'))
  ),
  preserve_whitespace: optional(bool(description('Preserve original whitespace from the PDF.'))),
  trim_lines: optional(bool(description('Trim leading/trailing whitespace for each text line.'))),
});

export type ReadPagesArgs = InferOutput<typeof readPagesArgsSchema>;

export interface ReadPagesResponse {
  results: PdfSourcePagesResult[];
}
