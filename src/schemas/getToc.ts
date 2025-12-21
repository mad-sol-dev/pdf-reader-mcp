import { array, object, type InferOutput } from '@sylphx/vex';
import { pdfSourceSchema } from './pdfSource.js';
import type { PdfSourceTocResult, PdfTocData } from '../types/pdf.js';

export const getTocArgsSchema = object({
  sources: array(pdfSourceSchema),
});

export type GetTocArgs = InferOutput<typeof getTocArgsSchema>;

export interface GetTocResponse {
  results: PdfSourceTocResult[];
}

export type TocData = PdfTocData;
