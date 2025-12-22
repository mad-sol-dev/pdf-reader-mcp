import { describe, expect, it } from 'vitest';
import { buildNormalizedPageText } from '../../src/pdf/text.js';
import type { PageContentItem } from '../../src/types/pdf.js';

describe('buildNormalizedPageText with insert_markers', () => {
  it('should insert image markers when insertMarkers is true', () => {
    const items: PageContentItem[] = [
      {
        type: 'text',
        y: 500,
        x: 100,
        textContent: 'Introduction to the system',
      },
      {
        type: 'image',
        y: 400,
        x: 100,
        imageData: {
          index: 0,
          width: 1200,
          height: 800,
          format: 'png',
          base64: 'dummy-data',
        },
      },
      {
        type: 'text',
        y: 300,
        x: 100,
        textContent: 'Figure 1 shows the architecture',
      },
    ];

    const result = buildNormalizedPageText(items, {
      insertMarkers: true,
      trimLines: true,
      preserveWhitespace: false,
    });

    // Should contain the image marker
    expect(result.text).toContain('[IMAGE 0: 1200x800px, png]');

    // Should have text before and after the marker
    expect(result.text).toContain('Introduction to the system');
    expect(result.text).toContain('Figure 1 shows the architecture');

    // Verify the order is correct
    const lines = result.text.split('\n');
    const introIndex = lines.findIndex((line) => line.includes('Introduction'));
    const markerIndex = lines.findIndex((line) => line.includes('[IMAGE'));
    const figureIndex = lines.findIndex((line) => line.includes('Figure 1'));

    expect(introIndex).toBeLessThan(markerIndex);
    expect(markerIndex).toBeLessThan(figureIndex);
  });

  it('should NOT insert image markers when insertMarkers is false (default)', () => {
    const items: PageContentItem[] = [
      {
        type: 'text',
        y: 500,
        x: 100,
        textContent: 'Introduction to the system',
      },
      {
        type: 'image',
        y: 400,
        x: 100,
        imageData: {
          index: 0,
          width: 1200,
          height: 800,
          format: 'png',
          base64: 'dummy-data',
        },
      },
      {
        type: 'text',
        y: 300,
        x: 100,
        textContent: 'Figure 1 shows the architecture',
      },
    ];

    const result = buildNormalizedPageText(items, {
      insertMarkers: false,
      trimLines: true,
      preserveWhitespace: false,
    });

    // Should NOT contain image markers
    expect(result.text).not.toContain('[IMAGE');

    // Should still have the text
    expect(result.text).toContain('Introduction to the system');
    expect(result.text).toContain('Figure 1 shows the architecture');
  });

  it('should insert markers for multiple images', () => {
    const items: PageContentItem[] = [
      {
        type: 'text',
        y: 600,
        x: 100,
        textContent: 'System Overview',
      },
      {
        type: 'image',
        y: 500,
        x: 100,
        imageData: {
          index: 0,
          width: 800,
          height: 600,
          format: 'jpg',
          base64: 'dummy-data-1',
        },
      },
      {
        type: 'text',
        y: 400,
        x: 100,
        textContent: 'Architecture Details',
      },
      {
        type: 'image',
        y: 300,
        x: 100,
        imageData: {
          index: 1,
          width: 1024,
          height: 768,
          format: 'png',
          base64: 'dummy-data-2',
        },
      },
      {
        type: 'text',
        y: 200,
        x: 100,
        textContent: 'Conclusion',
      },
    ];

    const result = buildNormalizedPageText(items, {
      insertMarkers: true,
      trimLines: true,
    });

    // Should contain both image markers
    expect(result.text).toContain('[IMAGE 0: 800x600px, jpg]');
    expect(result.text).toContain('[IMAGE 1: 1024x768px, png]');

    // Verify correct ordering
    const img0Index = result.text.indexOf('[IMAGE 0:');
    const img1Index = result.text.indexOf('[IMAGE 1:');

    expect(img0Index).toBeLessThan(img1Index);
  });

  it('should handle image markers without format', () => {
    const items: PageContentItem[] = [
      {
        type: 'text',
        y: 500,
        x: 100,
        textContent: 'Some text',
      },
      {
        type: 'image',
        y: 400,
        x: 100,
        imageData: {
          index: 0,
          width: 640,
          height: 480,
          // No format specified
          base64: 'dummy-data',
        },
      },
    ];

    const result = buildNormalizedPageText(items, {
      insertMarkers: true,
    });

    // Should still insert marker without format suffix
    expect(result.text).toContain('[IMAGE 0: 640x480px]');
  });

  it('should respect maxCharsPerPage with markers', () => {
    const items: PageContentItem[] = [
      {
        type: 'text',
        y: 500,
        x: 100,
        textContent: 'Introduction text',
      },
      {
        type: 'image',
        y: 400,
        x: 100,
        imageData: {
          index: 0,
          width: 1200,
          height: 800,
          format: 'png',
          base64: 'dummy-data',
        },
      },
      {
        type: 'text',
        y: 300,
        x: 100,
        textContent: 'This should be truncated because we have a very strict character limit',
      },
    ];

    const result = buildNormalizedPageText(items, {
      insertMarkers: true,
      maxCharsPerPage: 50,
    });

    // Should be truncated (markers add empty lines, so allow small overhead)
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(60); // Allow for marker formatting
  });

  it('should insert table markers for detected tables', () => {
    const items: PageContentItem[] = [
      { type: 'text', y: 200, x: 50, textContent: 'Before table text' },
      // Table (3x3)
      { type: 'text', y: 180, x: 50, textContent: 'Name' },
      { type: 'text', y: 180, x: 150, textContent: 'Age' },
      { type: 'text', y: 180, x: 250, textContent: 'City' },
      { type: 'text', y: 160, x: 50, textContent: 'Alice' },
      { type: 'text', y: 160, x: 150, textContent: '30' },
      { type: 'text', y: 160, x: 250, textContent: 'NYC' },
      { type: 'text', y: 140, x: 50, textContent: 'Bob' },
      { type: 'text', y: 140, x: 150, textContent: '25' },
      { type: 'text', y: 140, x: 250, textContent: 'SF' },
      { type: 'text', y: 120, x: 50, textContent: 'After table text' },
    ];

    // Convert to PageContentItem format (y -> yPosition, x -> xPosition)
    const pageItems: PageContentItem[] = items.map((item) => ({
      type: item.type as 'text',
      yPosition: item.y,
      xPosition: item.x,
      textContent: item.textContent,
    }));

    const result = buildNormalizedPageText(pageItems, {
      insertMarkers: true,
    });

    // Should contain a table marker
    expect(result.text).toContain('[TABLE DETECTED:');
    expect(result.text).toContain('Before table text');
    expect(result.text).toContain('After table text');

    // Verify marker is before table content
    const markerIndex = result.text.indexOf('[TABLE DETECTED:');
    const tableContentIndex = result.text.indexOf('Name');
    expect(markerIndex).toBeLessThan(tableContentIndex);
  });

  it('should NOT insert table markers when insertMarkers is false', () => {
    const items: PageContentItem[] = [
      // Table (3x3)
      { type: 'text', yPosition: 180, xPosition: 50, textContent: 'Name' },
      { type: 'text', yPosition: 180, xPosition: 150, textContent: 'Age' },
      { type: 'text', yPosition: 180, xPosition: 250, textContent: 'City' },
      { type: 'text', yPosition: 160, xPosition: 50, textContent: 'Alice' },
      { type: 'text', yPosition: 160, xPosition: 150, textContent: '30' },
      { type: 'text', yPosition: 160, xPosition: 250, textContent: 'NYC' },
      { type: 'text', yPosition: 140, xPosition: 50, textContent: 'Bob' },
      { type: 'text', yPosition: 140, xPosition: 150, textContent: '25' },
      { type: 'text', yPosition: 140, xPosition: 250, textContent: 'SF' },
    ];

    const result = buildNormalizedPageText(items, {
      insertMarkers: false,
    });

    // Should NOT contain table markers
    expect(result.text).not.toContain('[TABLE DETECTED:');
  });

  it('should insert both image and table markers', () => {
    const items: PageContentItem[] = [
      { type: 'text', yPosition: 300, xPosition: 50, textContent: 'Introduction' },
      {
        type: 'image',
        yPosition: 280,
        imageData: {
          page: 1,
          index: 0,
          width: 800,
          height: 600,
          format: 'png',
          base64: 'dummy',
        },
      },
      { type: 'text', yPosition: 260, xPosition: 50, textContent: 'Figure 1' },
      // Table (3x3)
      { type: 'text', yPosition: 180, xPosition: 50, textContent: 'Name' },
      { type: 'text', yPosition: 180, xPosition: 150, textContent: 'Age' },
      { type: 'text', yPosition: 180, xPosition: 250, textContent: 'City' },
      { type: 'text', yPosition: 160, xPosition: 50, textContent: 'Alice' },
      { type: 'text', yPosition: 160, xPosition: 150, textContent: '30' },
      { type: 'text', yPosition: 160, xPosition: 250, textContent: 'NYC' },
      { type: 'text', yPosition: 140, xPosition: 50, textContent: 'Bob' },
      { type: 'text', yPosition: 140, xPosition: 150, textContent: '25' },
      { type: 'text', yPosition: 140, xPosition: 250, textContent: 'SF' },
    ];

    const result = buildNormalizedPageText(items, {
      insertMarkers: true,
    });

    // Should contain both image and table markers
    expect(result.text).toContain('[IMAGE 0:');
    expect(result.text).toContain('[TABLE DETECTED:');
  });
});
