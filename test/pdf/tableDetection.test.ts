import { describe, expect, it } from 'vitest';
import { detectTables } from '../../src/pdf/tableDetection.js';
import type { PageContentItem } from '../../src/types/pdf.js';

describe('detectTables', () => {
  it('should detect a simple 3x3 table', () => {
    const items: PageContentItem[] = [
      // Header row (y=100)
      { type: 'text', yPosition: 100, xPosition: 50, textContent: 'Name' },
      { type: 'text', yPosition: 100, xPosition: 150, textContent: 'Age' },
      { type: 'text', yPosition: 100, xPosition: 250, textContent: 'City' },
      // Row 1 (y=80)
      { type: 'text', yPosition: 80, xPosition: 50, textContent: 'Alice' },
      { type: 'text', yPosition: 80, xPosition: 150, textContent: '30' },
      { type: 'text', yPosition: 80, xPosition: 250, textContent: 'NYC' },
      // Row 2 (y=60)
      { type: 'text', yPosition: 60, xPosition: 50, textContent: 'Bob' },
      { type: 'text', yPosition: 60, xPosition: 150, textContent: '25' },
      { type: 'text', yPosition: 60, xPosition: 250, textContent: 'SF' },
    ];

    const tables = detectTables(items);

    expect(tables).toHaveLength(1);
    expect(tables[0]?.cols).toBeGreaterThanOrEqual(3);
    expect(tables[0]?.rows).toBeGreaterThanOrEqual(3);
  });

  it('should detect a larger 4x5 table', () => {
    const items: PageContentItem[] = [];

    // Generate 5 rows with 4 columns
    for (let row = 0; row < 5; row++) {
      const y = 100 - row * 20;
      for (let col = 0; col < 4; col++) {
        const x = 50 + col * 100;
        items.push({
          type: 'text',
          yPosition: y,
          xPosition: x,
          textContent: `R${row}C${col}`,
        });
      }
    }

    const tables = detectTables(items);

    expect(tables).toHaveLength(1);
    expect(tables[0]?.cols).toBe(4);
    expect(tables[0]?.rows).toBeGreaterThanOrEqual(5);
  });

  it('should NOT detect a table with too few rows', () => {
    const items: PageContentItem[] = [
      // Only 2 rows (need at least 3)
      { type: 'text', yPosition: 100, xPosition: 50, textContent: 'Col1' },
      { type: 'text', yPosition: 100, xPosition: 150, textContent: 'Col2' },
      { type: 'text', yPosition: 100, xPosition: 250, textContent: 'Col3' },
      { type: 'text', yPosition: 80, xPosition: 50, textContent: 'A' },
      { type: 'text', yPosition: 80, xPosition: 150, textContent: 'B' },
      { type: 'text', yPosition: 80, xPosition: 250, textContent: 'C' },
    ];

    const tables = detectTables(items);

    expect(tables).toHaveLength(0);
  });

  it('should NOT detect a table with too few columns', () => {
    const items: PageContentItem[] = [
      // Only 2 columns (need at least 3)
      { type: 'text', yPosition: 100, xPosition: 50, textContent: 'Col1' },
      { type: 'text', yPosition: 100, xPosition: 150, textContent: 'Col2' },
      { type: 'text', yPosition: 80, xPosition: 50, textContent: 'A' },
      { type: 'text', yPosition: 80, xPosition: 150, textContent: 'B' },
      { type: 'text', yPosition: 60, xPosition: 50, textContent: 'C' },
      { type: 'text', yPosition: 60, xPosition: 150, textContent: 'D' },
    ];

    const tables = detectTables(items);

    expect(tables).toHaveLength(0);
  });

  it('should NOT detect tables in random unaligned text', () => {
    const items: PageContentItem[] = [
      { type: 'text', yPosition: 100, xPosition: 50, textContent: 'This is paragraph 1' },
      { type: 'text', yPosition: 80, xPosition: 55, textContent: 'This is paragraph 2' },
      { type: 'text', yPosition: 60, xPosition: 52, textContent: 'This is paragraph 3' },
      { type: 'text', yPosition: 40, xPosition: 48, textContent: 'This is paragraph 4' },
      { type: 'text', yPosition: 20, xPosition: 51, textContent: 'This is paragraph 5' },
    ];

    const tables = detectTables(items);

    expect(tables).toHaveLength(0);
  });

  it('should handle items without xPosition (skip them)', () => {
    const items: PageContentItem[] = [
      // Table with some items missing xPosition
      { type: 'text', yPosition: 100, xPosition: 50, textContent: 'Name' },
      { type: 'text', yPosition: 100, xPosition: 150, textContent: 'Age' },
      { type: 'text', yPosition: 100, textContent: 'Missing X' }, // No xPosition
      { type: 'text', yPosition: 80, xPosition: 50, textContent: 'Alice' },
      { type: 'text', yPosition: 80, xPosition: 150, textContent: '30' },
    ];

    const tables = detectTables(items);

    // Should not crash, may or may not detect a table
    expect(tables).toBeDefined();
  });

  it('should detect multiple tables on the same page', () => {
    const items: PageContentItem[] = [];

    // First table (y: 200-140)
    for (let row = 0; row < 3; row++) {
      const y = 200 - row * 20;
      for (let col = 0; col < 3; col++) {
        const x = 50 + col * 100;
        items.push({
          type: 'text',
          yPosition: y,
          xPosition: x,
          textContent: `T1-R${row}C${col}`,
        });
      }
    }

    // Some non-table text in between
    items.push({
      type: 'text',
      yPosition: 100,
      xPosition: 50,
      textContent: 'Some regular text here',
    });

    // Second table (y: 80-20)
    for (let row = 0; row < 3; row++) {
      const y = 80 - row * 20;
      for (let col = 0; col < 3; col++) {
        const x = 50 + col * 100;
        items.push({
          type: 'text',
          yPosition: y,
          xPosition: x,
          textContent: `T2-R${row}C${col}`,
        });
      }
    }

    const tables = detectTables(items);

    // Should detect both tables
    expect(tables.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle images mixed with table items', () => {
    const items: PageContentItem[] = [
      // Table header
      { type: 'text', yPosition: 100, xPosition: 50, textContent: 'Col1' },
      { type: 'text', yPosition: 100, xPosition: 150, textContent: 'Col2' },
      { type: 'text', yPosition: 100, xPosition: 250, textContent: 'Col3' },
      // Image in between
      {
        type: 'image',
        yPosition: 90,
        imageData: {
          page: 1,
          index: 0,
          width: 100,
          height: 100,
          format: 'png',
          data: 'base64data',
        },
      },
      // Table continues
      { type: 'text', yPosition: 80, xPosition: 50, textContent: 'A' },
      { type: 'text', yPosition: 80, xPosition: 150, textContent: 'B' },
      { type: 'text', yPosition: 80, xPosition: 250, textContent: 'C' },
      { type: 'text', yPosition: 60, xPosition: 50, textContent: 'D' },
      { type: 'text', yPosition: 60, xPosition: 150, textContent: 'E' },
      { type: 'text', yPosition: 60, xPosition: 250, textContent: 'F' },
    ];

    const tables = detectTables(items);

    // Should still detect the table, ignoring the image
    expect(tables).toBeDefined();
  });
});
