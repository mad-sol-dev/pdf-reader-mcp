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
  const COLUMN_TOLERANCE = 20; // pixels
  const MIN_COLUMNS = 3;
  const MIN_ROWS = 3;
  const MAX_ITEMS_TO_CHECK = 50; // Don't analyze too many items at once

  const checkRange = Math.min(items.length - startIndex, MAX_ITEMS_TO_CHECK);
  if (checkRange < MIN_COLUMNS * MIN_ROWS) {
    return null;
  }

  // Collect X-positions from items in range
  const xPositions: number[] = [];
  for (let i = startIndex; i < startIndex + checkRange; i++) {
    const x = items[i]?.xPosition;
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
  const itemsInRange = items.slice(startIndex, startIndex + checkRange);
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
