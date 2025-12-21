import { array, type InferOutput, object } from '@sylphx/vex';
import type { PdfImageListResult } from '../types/pdf.js';
import { pdfSourceSchema } from './pdfSource.js';

export const listImagesArgsSchema = object({
  sources: array(pdfSourceSchema),
});

export type ListImagesArgs = InferOutput<typeof listImagesArgsSchema>;

export interface ListImagesResponse {
  results: PdfImageListResult[];
}
