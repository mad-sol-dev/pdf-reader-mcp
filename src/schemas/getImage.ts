import { description, gte, type InferOutput, int, num, object } from '@sylphx/vex';
import { pdfSourceSchema } from './pdfSource.js';

export const getImageArgsSchema = object({
  source: pdfSourceSchema,
  page: num(int, gte(1), description('1-based page number containing the image.')),
  index: num(int, gte(0), description('0-based image index within the page.')),
});

export type GetImageArgs = InferOutput<typeof getImageArgsSchema>;
