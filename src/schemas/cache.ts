import { description, type InferOutput, object, optional, str } from '@sylphx/vex';
import type { CacheStats } from '../types/pdf.js';

export const cacheStatsArgsSchema = object({});

export const cacheClearArgsSchema = object({
  scope: optional(str(description('Cache scope: text, ocr, or all. Defaults to all.'))),
});

export type CacheStatsArgs = InferOutput<typeof cacheStatsArgsSchema>;
export type CacheClearArgs = InferOutput<typeof cacheClearArgsSchema>;

export interface CacheStatsResponse {
  stats: CacheStats;
}

export interface CacheClearResponse {
  cleared_text: boolean;
  cleared_ocr: boolean;
}
