import { description, gte, type InferOutput, num, object, optional } from '@sylphx/vex';
import { pdfSourceSchema } from './pdfSource.js';

export const renderPageArgsSchema = object({
  source: pdfSourceSchema,
  page: num(gte(1), description('1-based page number to render.')),
  scale: optional(num(gte(0.1), description('Rendering scale factor (1.0 = 100%).'))),
});

export type RenderPageArgs = InferOutput<typeof renderPageArgsSchema>;
