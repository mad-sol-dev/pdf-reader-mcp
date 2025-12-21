// Shared schemas for PDF sources and page selection

import {
  array,
  description,
  gte,
  type InferOutput,
  int,
  min,
  num,
  object,
  optional,
  str,
  union,
} from '@sylphx/vex';

// Schema for page specification (array of numbers or range string)
export const pageSpecifierSchema = union(array(num(int, gte(1))), str(min(1)));

// Schema for a single PDF source (path or URL)
// Note: XOR validation (path OR url, not both) is done in handlers
export const pdfSourceSchema = object({
  path: optional(
    str(min(1), description('Path to the local PDF file (absolute or relative to cwd).'))
  ),
  url: optional(str(min(1), description('URL of the PDF file.'))),
  pages: optional(pageSpecifierSchema),
});

export type PdfSource = InferOutput<typeof pdfSourceSchema>;
