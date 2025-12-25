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
  refine,
  str,
  union,
} from '@sylphx/vex';

// Schema for page specification (array of numbers or range string)
export const pageSpecifierSchema = union(array(num(int, gte(1))), str(min(1)));

// Base schema for a single PDF source (path or URL)
const basePdfSourceSchema = object({
  path: optional(
    str(min(1), description('Path to the local PDF file (absolute or relative to cwd).'))
  ),
  url: optional(str(min(1), description('URL of the PDF file.'))),
  pages: optional(pageSpecifierSchema),
});

// Schema with XOR validation: must have exactly one of path or url
export const pdfSourceSchema = refine(
  basePdfSourceSchema,
  (source) => {
    const hasPath = source.path !== undefined && source.path !== '';
    const hasUrl = source.url !== undefined && source.url !== '';

    if (hasPath && hasUrl) {
      return 'Cannot specify both "path" and "url". Provide exactly one.';
    }
    if (!hasPath && !hasUrl) {
      return 'Must specify either "path" or "url".';
    }
    return true;
  },
  description('PDF source: either a local path or a URL, but not both.')
);

export type PdfSource = InferOutput<typeof pdfSourceSchema>;
