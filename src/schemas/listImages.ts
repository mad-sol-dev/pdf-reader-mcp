import { array, bool, description, type InferOutput, object, optional } from '@sylphx/vex';
import type { PdfImageListResult } from '../types/pdf.js';
import { pdfSourceSchema } from './pdfSource.js';

export const listImagesArgsSchema = object({
  sources: array(pdfSourceSchema),
  allow_full_document: optional(
    bool(
      description(
        'When true, allows listing images from the entire document if no pages are specified. When false, only a small sample of pages will be processed.'
      )
    )
  ),
});

export type ListImagesArgs = InferOutput<typeof listImagesArgsSchema>;

export interface ListImagesResponse {
  results: PdfImageListResult[];
}
