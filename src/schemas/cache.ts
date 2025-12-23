import { description, type InferOutput, object, optional, str } from '@sylphx/vex';

export const cacheClearArgsSchema = object({
  scope: optional(str(description('Cache scope: text, ocr, or all. Defaults to all.'))),
});

export type CacheClearArgs = InferOutput<typeof cacheClearArgsSchema>;

export interface CacheClearResponse {
  cleared_text: boolean;
  cleared_ocr: boolean;
}
