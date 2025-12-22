import fs from 'node:fs/promises';
import path from 'node:path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it, vi } from 'vitest';
import { loadPdfDocument } from '../../src/pdf/loader.js';
import { PdfError } from '../../src/utils/errors.js';

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
  },
}));

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: vi.fn(),
}));

describe('loadPdfDocument path guard', () => {
  it('should reject traversal paths outside project root', async () => {
    const userPath = '..' + path.sep + 'outside.pdf';

    await expect(loadPdfDocument({ path: userPath }, userPath)).rejects.toThrow(PdfError);
    expect(fs.readFile).not.toHaveBeenCalled();
    expect(pdfjsLib.getDocument).not.toHaveBeenCalled();
  });
});
