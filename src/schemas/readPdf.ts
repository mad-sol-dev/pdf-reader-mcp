// Vex validation schemas for PDF reading

import { array, bool, description, type InferOutput, object, optional } from '@sylphx/vex';
import { pageSpecifierSchema, pdfSourceSchema, type PdfSource as SharedPdfSource } from './pdfSource.js';

// Schema for the read_pdf tool arguments
export const readPdfArgsSchema = object({
  sources: array(pdfSourceSchema),
  include_full_text: optional(
    bool(
      description(
        "Include the full text content of each PDF (only if 'pages' is not specified for that source)."
      )
    )
  ),
  include_metadata: optional(bool(description('Include metadata and info objects for each PDF.'))),
  include_page_count: optional(
    bool(description('Include the total number of pages for each PDF.'))
  ),
  include_images: optional(
    bool(
      description('Extract and include embedded images from the PDF pages as base64-encoded data.')
    )
  ),
});

export type ReadPdfArgs = InferOutput<typeof readPdfArgsSchema>;
export type PdfSource = SharedPdfSource;
