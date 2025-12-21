import type { PageContentItem } from '../types/pdf.js';

export interface TextNormalizationOptions {
  preserveWhitespace?: boolean;
  trimLines?: boolean;
  maxCharsPerPage?: number;
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
  const { preserveWhitespace = false, trimLines = true, maxCharsPerPage } = options;
  const normalizedLines: string[] = [];
  let truncated = false;
  let consumed = 0;

  const textItems = items.filter((item) => item.type === 'text' && item.textContent);

  for (const item of textItems) {
    const content = item.textContent ?? '';
    const normalized = normalizeLine(content, { preserveWhitespace, trimLines });

    if (!normalized) {
      continue;
    }

    let lineToAdd = normalized;

    if (maxCharsPerPage !== undefined) {
      const remaining = maxCharsPerPage - consumed;
      if (remaining <= 0) {
        truncated = true;
        break;
      }

      if (normalized.length > remaining) {
        lineToAdd = normalized.slice(0, remaining);
        truncated = true;
      }

      consumed += lineToAdd.length;
    }

    if (lineToAdd) {
      normalizedLines.push(lineToAdd);
    }
  }

  const text = normalizedLines.join('\n');

  if (maxCharsPerPage !== undefined && consumed > maxCharsPerPage) {
    truncated = true;
  }

  return { lines: normalizedLines, text, truncated };
};
