// Page range parsing utilities

import { ErrorCode, PdfError } from '../utils/errors.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Parser');
const MAX_RANGE_SIZE = 10000; // Prevent infinite loops for open ranges
export const DEFAULT_SAMPLE_PAGE_LIMIT = 5;

/**
 * Parse a single range part (e.g., "1-3", "5", "7-")
 */
const parseRangePart = (part: string, pages: Set<number>): string | undefined => {
  const trimmedPart = part.trim();

  if (trimmedPart.includes('-')) {
    const splitResult = trimmedPart.split('-');
    const startStr = splitResult[0] || '';
    const endStr = splitResult[1];

    const start = parseInt(startStr, 10);
    const end = endStr === '' || endStr === undefined ? Infinity : parseInt(endStr, 10);

    if (Number.isNaN(start) || Number.isNaN(end) || start <= 0 || start > end) {
      throw new Error(`Invalid page range values: ${trimmedPart}`);
    }

    const practicalEnd = Math.min(end, start + MAX_RANGE_SIZE);
    for (let i = start; i <= practicalEnd; i++) {
      pages.add(i);
    }

    if (end === Infinity && practicalEnd === start + MAX_RANGE_SIZE) {
      logger.warn('Open-ended range truncated', { start, practicalEnd });
      return `Open-ended page range starting at ${start} was truncated at ${practicalEnd} to cap open ranges.`;
    }
  } else {
    const page = parseInt(trimmedPart, 10);
    if (Number.isNaN(page) || page <= 0) {
      throw new Error(`Invalid page number: ${trimmedPart}`);
    }
    pages.add(page);
  }

  return undefined;
};

/**
 * Parse page range string into array of page numbers
 * @param ranges - Range string (e.g., "1-3,5,7-10")
 * @returns Sorted array of unique page numbers
 */
export interface ParsedPageRanges {
  pages: number[];
  warnings: string[];
}

export const parsePageRanges = (ranges: string): ParsedPageRanges => {
  const pages = new Set<number>();
  const parts = ranges.split(',');
  const warnings: string[] = [];

  for (const part of parts) {
    const warning = parseRangePart(part, pages);
    if (warning) {
      warnings.push(warning);
    }
  }

  // This should never happen as parseRangePart would have thrown an error
  // if no valid pages were found, but we keep this as a safety check
  /* c8 ignore next */
  if (pages.size === 0) {
    throw new Error('Page range string resulted in zero valid pages.');
  }

  return { pages: Array.from(pages).sort((a, b) => a - b), warnings };
};

/**
 * Get target pages from page specification
 * @param sourcePages - Page specification (string or array)
 * @param sourceDescription - Description for error messages
 * @returns Array of page numbers or undefined
 */
export interface TargetPagesResult {
  pages: number[] | undefined;
  warnings: string[];
}

export const getTargetPages = (
  sourcePages: string | number[] | undefined,
  sourceDescription: string
): TargetPagesResult => {
  if (!sourcePages) {
    return { pages: undefined, warnings: [] };
  }

  try {
    if (typeof sourcePages === 'string') {
      return parsePageRanges(sourcePages);
    }

    // Array of page numbers
    if (sourcePages.some((p) => !Number.isInteger(p) || p <= 0)) {
      throw new Error('Page numbers in array must be positive integers.');
    }

    const uniquePages = [...new Set(sourcePages)].sort((a, b) => a - b);
    if (uniquePages.length === 0) {
      throw new Error('Page specification resulted in an empty set of pages.');
    }

    return { pages: uniquePages, warnings: [] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new PdfError(
      ErrorCode.InvalidParams,
      `Invalid page specification for source ${sourceDescription}: ${message}`
    );
  }
};

/**
 * Determine which pages to process based on target pages and document size
 */
export interface DeterminePagesOptions {
  allowFullDocument?: boolean;
  samplePageLimit?: number;
}

export interface DeterminePagesResult {
  pagesToProcess: number[];
  invalidPages: number[];
  guardWarning?: string;
  sampledFromFullDocument?: boolean;
  rangeWarnings?: string[];
}

export const determinePagesToProcess = (
  targetPages: TargetPagesResult,
  totalPages: number,
  includeFullText: boolean,
  options?: DeterminePagesOptions
): DeterminePagesResult => {
  const { pages, warnings: rangeWarnings } = targetPages;

  if (pages) {
    const pagesToProcess = pages.filter((p) => p <= totalPages);
    const invalidPages = pages.filter((p) => p > totalPages);
    return { pagesToProcess, invalidPages, rangeWarnings };
  }

  const allowFullDocument = options?.allowFullDocument ?? includeFullText;

  if (includeFullText) {
    if (allowFullDocument) {
      const pagesToProcess = Array.from({ length: totalPages }, (_, i) => i + 1);
      return { pagesToProcess, invalidPages: [] };
    }

    const samplePageLimit = options?.samplePageLimit ?? DEFAULT_SAMPLE_PAGE_LIMIT;
    const sampledPagesCount = Math.min(samplePageLimit, totalPages);
    const pagesToProcess = Array.from({ length: sampledPagesCount }, (_, i) => i + 1);

    return {
      pagesToProcess,
      invalidPages: [],
      sampledFromFullDocument: true,
      guardWarning:
        totalPages > samplePageLimit
          ? `No pages specified; returning the first ${sampledPagesCount} of ${totalPages} pages. Specify pages or set allow_full_document=true to process the full document.`
          : 'No pages specified; processed available pages because the document is small. Specify pages or set allow_full_document=true to control full-document requests.',
    };
  }

  return { pagesToProcess: [], invalidPages: [] };
};
