import { array, bool, description, object, optional, type InferOutput } from '@sylphx/vex';
import { pdfSourceSchema } from './pdfSource.js';

export const getMetadataArgsSchema = object({
  sources: array(pdfSourceSchema),
  include_metadata: optional(bool(description('Include document metadata and info objects.'))),
  include_page_count: optional(bool(description('Include total page count.'))),
});

export type GetMetadataArgs = InferOutput<typeof getMetadataArgsSchema>;
