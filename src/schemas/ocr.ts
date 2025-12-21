import {
  bool,
  description,
  gte,
  type InferOutput,
  num,
  object,
  optional,
  record,
  str,
} from '@sylphx/vex';
import { pdfSourceSchema } from './pdfSource.js';

export const ocrProviderSchema = object({
  name: optional(str(description('Friendly provider identifier for logs.'))),
  type: optional(str(description('Provider type: http or mock.'))),
  endpoint: optional(str(description('OCR HTTP endpoint.'))),
  api_key: optional(str(description('Bearer token for the OCR provider.'))),
  model: optional(str(description('Model name or identifier.'))),
  language: optional(str(description('Preferred language for OCR.'))),
  extras: optional(record(str(), str(), description('Additional provider-specific options.'))),
});

export const ocrPageArgsSchema = object({
  source: pdfSourceSchema,
  page: num(gte(1), description('1-based page number to OCR.')),
  scale: optional(num(gte(0.1), description('Rendering scale applied before OCR.'))),
  provider: optional(ocrProviderSchema),
  cache: optional(bool(description('Use cached OCR result when available.'))),
});

export const ocrImageArgsSchema = object({
  source: pdfSourceSchema,
  page: num(gte(1), description('1-based page number hosting the image.')),
  index: num(gte(0), description('0-based image index within the page.')),
  provider: optional(ocrProviderSchema),
  cache: optional(bool(description('Use cached OCR result when available.'))),
});

export type OcrPageArgs = InferOutput<typeof ocrPageArgsSchema>;
export type OcrImageArgs = InferOutput<typeof ocrImageArgsSchema>;
