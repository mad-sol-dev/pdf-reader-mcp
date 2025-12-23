import { bool, description, gte, type InferOutput, int, num, object, optional } from '@sylphx/vex';
import { pdfSourceSchema } from './pdfSource.js';

export const pdfOcrArgsSchema = object({
  source: pdfSourceSchema,
  page: num(int, gte(1), description('1-based page number.')),
  index: optional(
    num(
      int,
      gte(0),
      description(
        '0-based image index within the page. If provided, OCR will be performed on the specific image. If omitted, OCR will be performed on the entire rendered page.'
      )
    )
  ),
  scale: optional(
    num(gte(0.1), description('Rendering scale applied before OCR (only for page OCR).'))
  ),
  cache: optional(bool(description('Use cached OCR result when available. Defaults to true.'))),
  smart_ocr: optional(
    bool(
      description(
        'Enable smart OCR decision step to skip OCR when likely unnecessary (only for page OCR).'
      )
    )
  ),
});

export type PdfOcrArgs = InferOutput<typeof pdfOcrArgsSchema>;
