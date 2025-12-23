import { array, description, type InferOutput, object, optional, str } from '@sylphx/vex';
import { pdfSourceSchema } from './pdfSource.js';

export const pdfInfoArgsSchema = object({
  source: pdfSourceSchema,
  include: optional(
    array(
      str(),
      description(
        'Optional info to include: "toc" (table of contents), "stats" (page/image statistics). ' +
          'Omit for basic metadata only (pages, title, author, language).'
      )
    )
  ),
});

export type PdfInfoArgs = InferOutput<typeof pdfInfoArgsSchema>;

export interface PdfInfoResponse {
  source: string;
  success: boolean;
  data?: {
    pages: number;
    title?: string;
    author?: string;
    language?: string | null;
    fingerprint?: string;
    has_toc?: boolean;
    toc_entries?: number;
    has_images?: boolean;
    image_count?: number;
    next_step?: {
      suggestion: string;
      tools?: string[];
    };
  };
  error?: string;
}
