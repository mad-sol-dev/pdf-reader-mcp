import { array, bool, description, type InferOutput, object, optional } from '@sylphx/vex';
import type { PdfMetadataSummary, PdfSourceMetadataResult } from '../types/pdf.js';
import { pdfSourceSchema } from './pdfSource.js';

export const getMetadataArgsSchema = object({
  sources: array(pdfSourceSchema),
  include_metadata: optional(bool(description('Include document metadata and info objects.'))),
  include_page_count: optional(bool(description('Include total page count.'))),
  include_page_labels: optional(bool(description('Check for page labels and provide examples.'))),
  include_outline: optional(bool(description('Check for outline / table of contents presence.'))),
});

export type GetMetadataArgs = InferOutput<typeof getMetadataArgsSchema>;

export interface GetMetadataResponse {
  results: PdfSourceMetadataResult[];
}

export type MetadataData = PdfMetadataSummary;
