import { text, tool, toolError } from '@sylphx/mcp-server-sdk';
import { cacheClearArgsSchema, cacheStatsArgsSchema } from '../schemas/cache.js';
import { clearCache, getCacheStats } from '../utils/cache.js';

export const pdfCacheStats = tool()
  .description('Inspect cache usage for text and OCR results.')
  .input(cacheStatsArgsSchema)
  .handler(async () => {
    const stats = getCacheStats();
    return [text(JSON.stringify({ stats }, null, 2))];
  });

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
