/**
 * PDF.js Internal API Contract Test
 *
 * This test validates that the internal PDF.js APIs we depend on for image extraction
 * remain available across version updates. These are undocumented internal APIs that
 * could break on minor version updates.
 */

import { describe, expect, it, afterAll } from 'vitest';
import { loadPdfDocument } from '../../src/pdf/loader.js';

describe('PDF.js internal API contract', () => {
  it('validates required internal APIs exist for image extraction', async () => {
    // Use sample PDF with at least one image (if available)
    const doc = await loadPdfDocument({ path: 'test/fixtures/sample.pdf' }, 'internal-api-test');

    try {
      const page = await doc.getPage(1);

      // These internal APIs must exist for image extraction to work
      expect(page).toHaveProperty('objs');
      expect(typeof (page as any).objs?.get).toBe('function');

      expect(page).toHaveProperty('commonObjs');
      expect(typeof (page as any).commonObjs?.get).toBe('function');

      // Verify getOperatorList exists (used for finding images)
      expect(typeof page.getOperatorList).toBe('function');
      const opList = await page.getOperatorList();
      expect(opList).toHaveProperty('fnArray');
      expect(opList).toHaveProperty('argsArray');
      expect(Array.isArray(opList.fnArray)).toBe(true);
      expect(Array.isArray(opList.argsArray)).toBe(true);
    } finally {
      await doc.destroy();
    }
  });
});
