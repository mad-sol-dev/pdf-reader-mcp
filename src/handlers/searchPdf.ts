import { text, tool, toolError } from '@sylphx/mcp-server-sdk';
import type * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { buildWarnings, extractPageContent } from '../pdf/extractor.js';
import { loadPdfDocument } from '../pdf/loader.js';
import { determinePagesToProcess, getTargetPages } from '../pdf/parser.js';
import { buildNormalizedPageText } from '../pdf/text.js';
import { pdfSearchArgsSchema } from '../schemas/pdfSearch.js';
import type { PdfSource } from '../schemas/pdfSource.js';
import type { PdfSearchHit, PdfSourceSearchResult } from '../types/pdf.js';
import { createLogger } from '../utils/logger.js';
import { buildNextStep } from '../utils/workflow.js';

const logger = createLogger('PdfSearch');

interface SearchOptions {
  query: string;
  useRegex: boolean;
  caseSensitive: boolean;
  contextChars: number;
  maxHits: number;
  maxCharsPerPage?: number;
  preserveWhitespace: boolean;
  trimLines: boolean;
}

interface MatchResult {
  match: string;
  index: number;
}

const findPlainMatches = (
  textToSearch: string,
  query: string,
  options: SearchOptions,
  remaining: number
): MatchResult[] => {
  const matches: MatchResult[] = [];
  const haystack = options.caseSensitive ? textToSearch : textToSearch.toLowerCase();
  const needle = options.caseSensitive ? query : query.toLowerCase();

  let startIndex = 0;
  while (matches.length < remaining) {
    const idx = haystack.indexOf(needle, startIndex);
    if (idx === -1) break;

    matches.push({ match: textToSearch.slice(idx, idx + query.length), index: idx });
    startIndex = idx + query.length;
  }

  return matches;
};

const findRegexMatches = (
  textToSearch: string,
  query: string,
  options: SearchOptions,
  remaining: number
): MatchResult[] => {
  const flags = options.caseSensitive ? 'g' : 'gi';
  const regex = new RegExp(query, flags);
  const matches: MatchResult[] = [];

  let match: RegExpExecArray | null = regex.exec(textToSearch);
  while (match !== null && matches.length < remaining) {
    const matchText = match[0];
    const index = match.index;

    matches.push({ match: matchText, index });

    if (matchText.length === 0) {
      regex.lastIndex += 1;
    }

    match = regex.exec(textToSearch);
  }

  return matches;
};

const buildContextSegments = (
  textContent: string,
  index: number,
  length: number,
  contextChars: number
): { context_before: string; context_after: string } => {
  const beforeStart = Math.max(0, index - contextChars);
  const before = textContent.slice(beforeStart, index);

  const afterEnd = Math.min(textContent.length, index + length + contextChars);
  const after = textContent.slice(index + length, afterEnd);

  return {
    context_before: before,
    context_after: after,
  };
};

const getPageLabelsSafe = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  sourceDescription: string
): Promise<string[] | null> => {
  try {
    return await pdfDocument.getPageLabels();
  } catch (labelError: unknown) {
    const message = labelError instanceof Error ? labelError.message : String(labelError);
    logger.warn('Error retrieving page labels', { sourceDescription, error: message });
  }

  return null;
};

const collectPageHitData = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  sourceDescription: string,
  options: SearchOptions
) => {
  const { items } = await extractPageContent(pdfDocument, pageNum, false, sourceDescription);
  return buildNormalizedPageText(items, {
    preserveWhitespace: options.preserveWhitespace,
    trimLines: options.trimLines,
    ...(options.maxCharsPerPage !== undefined ? { maxCharsPerPage: options.maxCharsPerPage } : {}),
  });
};

const buildPageHits = (
  normalizedText: ReturnType<typeof buildNormalizedPageText>,
  pageNum: number,
  pageLabels: string[] | null,
  options: SearchOptions,
  remaining: number
): PdfSearchHit[] => {
  const matches = options.useRegex
    ? findRegexMatches(normalizedText.text ?? '', options.query, options, remaining)
    : findPlainMatches(normalizedText.text ?? '', options.query, options, remaining);

  return matches.map((match) => {
    const segments = buildContextSegments(
      normalizedText.text ?? '',
      match.index,
      match.match.length,
      options.contextChars
    );

    return {
      page_number: pageNum,
      page_index: pageNum - 1,
      page_label: pageLabels?.[pageNum - 1] ?? null,
      match: match.match,
      ...segments,
    };
  });
};

const collectPageHits = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  pagesToProcess: number[],
  pageLabels: string[] | null,
  sourceDescription: string,
  options: SearchOptions
): Promise<{ hits: PdfSearchHit[]; truncatedPages: number[] }> => {
  const hits: PdfSearchHit[] = [];
  const truncatedPages: number[] = [];

  for (const pageNum of pagesToProcess) {
    if (hits.length >= options.maxHits) {
      break;
    }

    const normalized = await collectPageHitData(pdfDocument, pageNum, sourceDescription, options);

    if (normalized.truncated) {
      truncatedPages.push(pageNum);
    }

    if (!normalized.text) {
      continue;
    }

    const remaining = options.maxHits - hits.length;
    const pageHits = buildPageHits(normalized, pageNum, pageLabels, options, remaining);
    hits.push(...pageHits);
  }

  return { hits, truncatedPages };
};

const destroyPdfDocument = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy | null,
  sourceDescription: string
): Promise<void> => {
  if (!pdfDocument || typeof pdfDocument.destroy !== 'function') {
    return;
  }

  try {
    await pdfDocument.destroy();
  } catch (destroyError: unknown) {
    const message = destroyError instanceof Error ? destroyError.message : String(destroyError);
    logger.warn('Error destroying PDF document', { sourceDescription, error: message });
  }
};

const processSearchSource = async (
  source: PdfSource,
  sourceDescription: string,
  options: SearchOptions,
  allowFullDocument: boolean
): Promise<PdfSourceSearchResult> => {
  let pdfDocument: pdfjsLib.PDFDocumentProxy | null = null;
  let result: PdfSourceSearchResult = { source: sourceDescription, success: false };

  try {
    const targetPages = getTargetPages(source.pages, sourceDescription);
    const loadArgs = {
      ...(source.path ? { path: source.path } : {}),
      ...(source.url ? { url: source.url } : {}),
    };

    pdfDocument = await loadPdfDocument(loadArgs, sourceDescription);
    const totalPages = pdfDocument.numPages;

    const { pagesToProcess, invalidPages, guardWarning, rangeWarnings } = determinePagesToProcess(
      targetPages,
      totalPages,
      true,
      {
        allowFullDocument,
      }
    );
    const pageLabels = await getPageLabelsSafe(pdfDocument, sourceDescription);
    const { hits, truncatedPages } = await collectPageHits(
      pdfDocument,
      pagesToProcess,
      pageLabels,
      sourceDescription,
      options
    );

    const warnings = [
      ...(rangeWarnings ?? []),
      ...buildWarnings(invalidPages, totalPages),
      ...(guardWarning ? [guardWarning] : []),
    ];

    result = {
      source: sourceDescription,
      success: true,
      data: {
        hits,
        total_hits: hits.length,
        ...(warnings.length > 0 ? { warnings } : {}),
        ...(truncatedPages.length > 0 ? { truncated_pages: truncatedPages } : {}),
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    result = {
      source: sourceDescription,
      success: false,
      error: `Failed to search ${sourceDescription}. Reason: ${message}`,
    };
  } finally {
    await destroyPdfDocument(pdfDocument, sourceDescription);
  }

  return result;
};

export const pdfSearch = tool()
  .description(
    'Search for specific text patterns across PDF pages\n\n' +
      'Use when you need to:\n' +
      '- Find specific keywords, phrases, or patterns across documents\n' +
      '- Locate where certain content appears before reading full pages\n' +
      '- Filter large PDFs to relevant sections only\n\n' +
      'Supports both plain text and regex patterns. Returns surrounding context for each match.\n\n' +
      'Workflow tip: Search first to identify relevant pages, then use pdf_read on those specific pages for full content.\n\n' +
      'Example:\n' +
      '  pdf_search({sources: [{path: "doc.pdf"}], query: "total revenue", context_chars: 100})'
  )
  .input(pdfSearchArgsSchema)
  /* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: handler coordinates parsing, validation, and batching */
  .handler(async ({ input }) => {
    const {
      sources,
      query,
      use_regex,
      case_sensitive,
      context_chars,
      max_hits,
      max_chars_per_page,
      preserve_whitespace,
      trim_lines,
      allow_full_document,
    } = input;

    const baseOptions: SearchOptions = {
      query,
      useRegex: use_regex ?? false,
      caseSensitive: case_sensitive ?? false,
      contextChars: context_chars ?? 60,
      maxHits: max_hits ?? 20,
      preserveWhitespace: preserve_whitespace ?? false,
      trimLines: trim_lines ?? true,
      ...(max_chars_per_page !== undefined ? { maxCharsPerPage: max_chars_per_page } : {}),
    };

    if (baseOptions.useRegex) {
      try {
        // Validate the regex early to surface errors before processing pages
        // eslint-disable-next-line no-new
        new RegExp(query);
      } catch (regexError: unknown) {
        const message = regexError instanceof Error ? regexError.message : String(regexError);
        return toolError(`Invalid regular expression: ${message}`);
      }
    }

    const MAX_CONCURRENT_SOURCES = 3;
    const results: PdfSourceSearchResult[] = [];
    let remainingHits = baseOptions.maxHits;

    for (let i = 0; i < sources.length; i += MAX_CONCURRENT_SOURCES) {
      const batch = sources.slice(i, i + MAX_CONCURRENT_SOURCES);
      const batchResults = await Promise.all(
        batch.map((source) => {
          const sourceDescription = source.path ?? source.url ?? 'unknown source';
          return processSearchSource(
            source,
            sourceDescription,
            {
              ...baseOptions,
              maxHits: remainingHits,
            },
            allow_full_document ?? false
          );
        })
      );

      results.push(...batchResults);

      const hitsFound = batchResults.reduce(
        (total, result) => total + (result.data?.total_hits ?? 0),
        0
      );
      remainingHits = Math.max(0, remainingHits - hitsFound);

      if (remainingHits === 0) {
        break;
      }
    }

    if (results.every((r) => !r.success)) {
      const errors = results.map((r) => r.error).join('; ');
      return toolError(`All sources failed to search: ${errors}`);
    }

    const nextStep = buildNextStep({ stage: 'search' });
    return [text(JSON.stringify({ results, next_step: nextStep }, null, 2))];
  });
