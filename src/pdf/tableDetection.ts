import type { PageContentItem } from '../types/pdf.js';

export interface TableRegion {
  startIndex: number;
  endIndex: number;
  cols: number;
  rows: number;
}

/**
 * Detect table-like structures in text items based on X-coordinate alignment
 *
 * Heuristic:
 * - Multiple consecutive text items with consistent column positions (X-coordinates)
 * - At least 3 columns and 3 rows
 * - Items must have similar spacing between columns
 */
export const detectTables = (items: PageContentItem[]): TableRegion[] => {
  const tables: TableRegion[] = [];
  const textItems = items.filter((item) => item.type === 'text' && item.xPosition !== undefined);

  if (textItems.length < 9) {
    // Need at least 3x3 grid
    return tables;
  }

  // Analyze groups of consecutive items for table patterns
  let startIndex = 0;

  while (startIndex < textItems.length) {
    const tableCandidate = analyzeTableCandidate(textItems, startIndex);

    if (tableCandidate) {
      // Map back to original items array
      const originalStartIndex = items.indexOf(textItems[startIndex] as PageContentItem);
      const originalEndIndex = items.indexOf(textItems[tableCandidate.endIndex] as PageContentItem);

      tables.push({
        startIndex: originalStartIndex,
        endIndex: originalEndIndex,
        cols: tableCandidate.cols,
        rows: tableCandidate.rows,
      });

      startIndex = tableCandidate.endIndex + 1;
    } else {
      startIndex++;
    }
  }

  return tables;
};

/**
 * Analyze a sequence of text items starting at a given index
 * Returns table info if a table pattern is detected, null otherwise
 */
const analyzeTableCandidate = (
  items: PageContentItem[],
  startIndex: number
): { endIndex: number; cols: number; rows: number } | null => {
  const MIN_COLUMNS = 3;
  const MIN_ROWS = 3;
  const MAX_ITEMS_TO_CHECK = 50; // Don't analyze too many items at once
  const MIN_TOLERANCE = 10;
  const MAX_TOLERANCE = 50;

  const checkRange = Math.min(items.length - startIndex, MAX_ITEMS_TO_CHECK);
  if (checkRange < MIN_COLUMNS * MIN_ROWS) {
    return null;
  }

  // Collect X-positions from items in range
  const itemsInRange = items.slice(startIndex, startIndex + checkRange);
  const avgFontSize = calculateAverageFontSize(itemsInRange);
  const estimatedPageWidth = estimatePageWidth(itemsInRange);
  const fontBasedTolerance = avgFontSize * 0.5;
  const pageWidthTolerance = estimatedPageWidth ? estimatedPageWidth * 0.05 : 0;
  const COLUMN_TOLERANCE = clamp(
    Math.max(fontBasedTolerance, pageWidthTolerance),
    MIN_TOLERANCE,
    MAX_TOLERANCE
  );

  const xPositions: number[] = [];
  for (const item of itemsInRange) {
    const x = item.xPosition;
    if (x !== undefined) {
      xPositions.push(x);
    }
  }

  // Find distinct column positions (cluster X values within tolerance)
  const columnPositions = clusterXPositions(xPositions, COLUMN_TOLERANCE);

  if (columnPositions.length < MIN_COLUMNS) {
    return null;
  }

  // Count how many items fit into each column
  // Items should be distributed across multiple rows
  const rowsByY = new Map<number, number[]>();

  for (const item of itemsInRange) {
    if (item.xPosition === undefined) continue;

    const columnIndex = findColumnIndex(item.xPosition, columnPositions, COLUMN_TOLERANCE);
    if (columnIndex === -1) continue;

    const y = item.yPosition;
    if (!rowsByY.has(y)) {
      rowsByY.set(y, []);
    }
    rowsByY.get(y)?.push(columnIndex);
  }

  // Check if we have enough rows with consistent column coverage
  const validRows = Array.from(rowsByY.values()).filter(
    (cols) => cols.length >= MIN_COLUMNS - 1 // Allow some missing cells
  );

  if (validRows.length < MIN_ROWS) {
    return null;
  }

  // Calculate the end index of the table
  const tableYPositions = Array.from(rowsByY.keys()).slice(0, validRows.length);
  const lastY = tableYPositions[tableYPositions.length - 1];
  if (lastY === undefined) return null;

  const endIndex = itemsInRange.findIndex((item) => item.yPosition < (lastY ?? 0));
  const actualEndIndex = endIndex === -1 ? startIndex + checkRange - 1 : startIndex + endIndex - 1;

  return {
    endIndex: actualEndIndex,
    cols: columnPositions.length,
    rows: validRows.length,
  };
};

export const calculateAverageFontSize = (items: PageContentItem[]): number => {
  const fontSizes = items
    .map((item) => item.fontSize)
    .filter((value): value is number => typeof value === 'number' && value > 0);

  if (fontSizes.length > 0) {
    return fontSizes.reduce((sum, value) => sum + value, 0) / fontSizes.length;
  }

  const averageCharWidth = estimateAverageCharacterWidth(items);
  if (averageCharWidth > 0) {
    // Typical character width is roughly half the font size.
    return averageCharWidth / 0.5;
  }

  return 12;
};

const estimateAverageCharacterWidth = (items: PageContentItem[]): number => {
  const rows = new Map<number, PageContentItem[]>();

  for (const item of items) {
    if (item.type !== 'text' || item.xPosition === undefined || !item.textContent) {
      continue;
    }

    if (!rows.has(item.yPosition)) {
      rows.set(item.yPosition, []);
    }
    rows.get(item.yPosition)?.push(item);
  }

  const widthSamples: number[] = [];
  for (const rowItems of rows.values()) {
    rowItems.sort((a, b) => (a.xPosition ?? 0) - (b.xPosition ?? 0));
    for (let i = 0; i < rowItems.length - 1; i++) {
      const current = rowItems[i];
      const next = rowItems[i + 1];
      if (!current || !next || current.xPosition === undefined || next.xPosition === undefined) {
        continue;
      }
      const textLength = current.textContent?.length ?? 0;
      if (textLength === 0) continue;
      const deltaX = next.xPosition - current.xPosition;
      if (deltaX <= 0) continue;
      widthSamples.push(deltaX / textLength);
    }
  }

  if (widthSamples.length === 0) {
    return 0;
  }

  return widthSamples.reduce((sum, value) => sum + value, 0) / widthSamples.length;
};

const estimatePageWidth = (items: PageContentItem[]): number | null => {
  const xPositions = items
    .map((item) => item.xPosition)
    .filter((value): value is number => typeof value === 'number');
  if (xPositions.length < 2) return null;

  const minX = Math.min(...xPositions);
  const maxX = Math.max(...xPositions);
  const width = maxX - minX;
  return width > 0 ? width : null;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Cluster X positions into distinct columns
 * X values within TOLERANCE pixels are considered the same column
 */
const clusterXPositions = (xPositions: number[], tolerance: number): number[] => {
  if (xPositions.length === 0) return [];

  const sorted = [...xPositions].sort((a, b) => a - b);
  const clusters: number[] = [sorted[0] as number];

  for (const x of sorted) {
    const lastCluster = clusters[clusters.length - 1];
    if (lastCluster === undefined) continue;

    if (x - lastCluster > tolerance) {
      clusters.push(x);
    }
  }

  return clusters;
};

/**
 * Find which column index an X position belongs to
 */
const findColumnIndex = (x: number, columnPositions: number[], tolerance: number): number => {
  for (let i = 0; i < columnPositions.length; i++) {
    const col = columnPositions[i];
    if (col !== undefined && Math.abs(x - col) <= tolerance) {
      return i;
    }
  }
  return -1;
};
