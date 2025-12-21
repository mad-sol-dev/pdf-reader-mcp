import { array, type InferOutput, object } from '@sylphx/vex';
import type { PdfSourceTocResult, PdfTocData } from '../types/pdf.js';
import { pdfSourceSchema } from './pdfSource.js';

export const getTocArgsSchema = object({
  sources: array(pdfSourceSchema),
});

export type GetTocArgs = InferOutput<typeof getTocArgsSchema>;

export interface GetTocResponse {
  results: PdfSourceTocResult[];
}

export type TocData = PdfTocData;
