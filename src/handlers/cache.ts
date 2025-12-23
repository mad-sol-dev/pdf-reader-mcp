import { text, tool, toolError } from '@sylphx/mcp-server-sdk';
import { cacheClearArgsSchema } from '../schemas/cache.js';
import { clearCache } from '../utils/cache.js';

export const pdfCacheClear = tool()
  .description('Clear text and/or OCR caches.')
  .input(cacheClearArgsSchema)
  .handler(async ({ input }) => {
    const scope = (input.scope as 'text' | 'ocr' | 'all' | undefined) ?? 'all';

    if (!['text', 'ocr', 'all'].includes(scope)) {
      return toolError(`Invalid scope '${scope}'. Expected one of: text, ocr, all.`);
    }

    const result = clearCache(scope);
    return [text(JSON.stringify(result, null, 2))];
  });
