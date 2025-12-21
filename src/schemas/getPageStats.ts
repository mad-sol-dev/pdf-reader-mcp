import { array, bool, description, type InferOutput, object, optional } from '@sylphx/vex';
import type { PdfPageStats, PdfSourcePageStatsResult } from '../types/pdf.js';
import { pdfSourceSchema } from './pdfSource.js';

export const getPageStatsArgsSchema = object({
  sources: array(pdfSourceSchema),
  include_images: optional(
    bool(description('Count images found on each page while computing statistics.'))
  ),
  allow_full_document: optional(
    bool(
      description(
        'When true, allows computing stats for the entire document if no pages are specified. When false, only a small sample of pages will be processed.'
      )
    )
  ),
});

export type GetPageStatsArgs = InferOutput<typeof getPageStatsArgsSchema>;

export interface GetPageStatsResponse {
  results: PdfSourcePageStatsResult[];
}

export type PageStatsData = PdfPageStats;
