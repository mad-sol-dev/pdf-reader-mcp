import type { PageContentItem } from '../types/pdf.js';
import { detectTables } from './tableDetection.js';

export interface TextNormalizationOptions {
  preserveWhitespace?: boolean;
  trimLines?: boolean;
  maxCharsPerPage?: number;
  insertMarkers?: boolean;
}

export interface NormalizedPageText {
  lines: string[];
  text: string;
  truncated: boolean;
}

const normalizeLine = (
  input: string,
  options: Pick<TextNormalizationOptions, 'preserveWhitespace' | 'trimLines'>
): string => {
  const { preserveWhitespace = false, trimLines = true } = options;
  let normalized = preserveWhitespace ? input : input.replace(/\s+/g, ' ');

  if (trimLines) {
    normalized = normalized.trim();
  }

  return normalized;
};

export const buildNormalizedPageText = (
  items: PageContentItem[],
  options: TextNormalizationOptions
): NormalizedPageText => {
  const {
    preserveWhitespace = false,
    trimLines = true,
    maxCharsPerPage,
    insertMarkers = false,
  } = options;
  const normalizedLines: string[] = [];
  let truncated = false;
  let consumed = 0;

  // If insertMarkers is false, only process text items (preserve existing behavior)
  const itemsToProcess = insertMarkers ? items : items.filter((item) => item.type === 'text');

  // Detect tables if markers are enabled
  const tableRegions = insertMarkers ? detectTables(items) : [];
  const tableStartIndices = new Set(tableRegions.map((t) => t.startIndex));
  const tableInfo = new Map(
    tableRegions.map((t) => [t.startIndex, { cols: t.cols, rows: t.rows }])
  );

  for (let i = 0; i < itemsToProcess.length; i++) {
    const item = itemsToProcess[i];
    if (!item) continue;

    // Insert table marker before first item of a detected table
    const originalIndex = items.indexOf(item);
    if (insertMarkers && tableStartIndices.has(originalIndex)) {
      const info = tableInfo.get(originalIndex);
      if (info) {
        const tableMarker = `[TABLE DETECTED: ${info.cols} cols × ${info.rows} rows]`;
        if (normalizedLines.length > 0) {
          normalizedLines.push('');
        }
        normalizedLines.push(tableMarker);
        normalizedLines.push('');
      }
    }
    let lineToAdd = '';

    if (item.type === 'text' && item.textContent) {
      const content = item.textContent ?? '';
      const normalized = normalizeLine(content, { preserveWhitespace, trimLines });

      if (!normalized) {
        continue;
      }

      lineToAdd = normalized;
    } else if (item.type === 'image' && insertMarkers && item.imageData) {
      // Insert image marker
      const { index, width, height, format } = item.imageData;
      lineToAdd = `[IMAGE ${index}: ${width}x${height}px${format ? `, ${format}` : ''}]`;
      // Add empty lines around marker for readability
      if (normalizedLines.length > 0) {
        normalizedLines.push('');
      }
    } else {
      continue;
    }

    if (maxCharsPerPage !== undefined) {
      const remaining = maxCharsPerPage - consumed;
      if (remaining <= 0) {
        truncated = true;
        break;
      }

      if (lineToAdd.length > remaining) {
        lineToAdd = lineToAdd.slice(0, remaining);
        truncated = true;
      }

      consumed += lineToAdd.length;
    }

    if (lineToAdd) {
      normalizedLines.push(lineToAdd);

      // Add empty line after image marker
      if (item.type === 'image' && insertMarkers) {
        normalizedLines.push('');
      }
    }
  }

  const text = normalizedLines.join('\n');

  if (maxCharsPerPage !== undefined && consumed > maxCharsPerPage) {
    truncated = true;
  }

  return { lines: normalizedLines, text, truncated };
};
