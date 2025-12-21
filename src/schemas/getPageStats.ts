import { array, bool, description, object, optional, type InferOutput } from '@sylphx/vex';
import { pdfSourceSchema } from './pdfSource.js';

export const getPageStatsArgsSchema = object({
  sources: array(pdfSourceSchema),
  include_images: optional(
    bool(description('Count images found on each page while computing statistics.'))
  ),
});

export type GetPageStatsArgs = InferOutput<typeof getPageStatsArgsSchema>;
