import { image, text, tool, toolError } from '@sylphx/mcp-server-sdk';
import { buildWarnings, extractImages } from '../pdf/extractor.js';
import { determinePagesToProcess, getTargetPages } from '../pdf/parser.js';
import { getImageArgsSchema } from '../schemas/getImage.js';
import type { ExtractedImage } from '../types/pdf.js';
import { createLogger } from '../utils/logger.js';
import { OCR_IMAGE_RECOMMENDATION } from '../utils/ocrRecommendation.js';
import { withPdfDocument } from '../utils/pdfLifecycle.js';

const logger = createLogger('GetImage');

const buildImageMetadata = (targetImage: ExtractedImage, warnings: string[]): object => ({
  page: targetImage.page,
  index: targetImage.index,
  width: targetImage.width,
  height: targetImage.height,
  format: targetImage.format,
  recommendation: OCR_IMAGE_RECOMMENDATION,
  warnings: warnings.length > 0 ? warnings : undefined,
});

const resolveTargetPages = (
  sourcePages: string | number[] | undefined,
  sourceDescription: string,
  page: number
) => {
  const targetPages = getTargetPages(sourcePages, sourceDescription);
  const pages = targetPages.pages ? [...targetPages.pages] : [];

  if (!pages.includes(page)) {
    pages.push(page);
  }

  return { ...targetPages, pages };
};

const fetchImage = async (
  source: { path?: string; url?: string; pages?: string | number[] },
  sourceDescription: string,
  page: number,
  index: number
): Promise<{ metadata: object; imageData: string }> => {
  const loadArgs = {
    ...(source.path ? { path: source.path } : {}),
    ...(source.url ? { url: source.url } : {}),
  };
  return withPdfDocument(loadArgs, sourceDescription, async (pdfDocument) => {
    const totalPages = pdfDocument.numPages;

    if (page < 1 || page > totalPages) {
      throw new Error(`Requested page ${page} exceeds total pages (${totalPages}).`);
    }

    const { pagesToProcess, invalidPages, rangeWarnings } = determinePagesToProcess(
      resolveTargetPages(source.pages, sourceDescription, page),
      totalPages,
      false
    );

    if (!pagesToProcess.includes(page)) {
      throw new Error(`Requested page ${page} exceeds total pages (${totalPages}).`);
    }

    const { images: pageImages, warnings: imageWarnings } = await extractImages(pdfDocument, [page]);
    const targetImage = pageImages.find((img) => img.index === index && img.page === page);

    if (!targetImage) {
      throw new Error(`Image with index ${index} not found on page ${page}.`);
    }

    const warnings = [
      ...(rangeWarnings ?? []),
      ...buildWarnings(invalidPages, totalPages),
      ...imageWarnings,
    ];
    return { metadata: buildImageMetadata(targetImage, warnings), imageData: targetImage.data };
  });
};

export const pdfGetImage = tool()
  .description('Fetch a single PDF image as base64-encoded PNG along with metadata.')
  .input(getImageArgsSchema)
  .handler(async ({ input }) => {
    const { source, page, index } = input;
    const sourceDescription = source.path ?? source.url ?? 'unknown source';

    const normalizedSource: { path?: string; url?: string; pages?: string | number[] } = {
      ...(source.path ? { path: source.path } : {}),
      ...(source.url ? { url: source.url } : {}),
      ...(source.pages !== undefined ? { pages: source.pages } : {}),
    };

    try {
      const result = await fetchImage(normalizedSource, sourceDescription, page, index);
      return [text(JSON.stringify(result.metadata, null, 2)), image(result.imageData, 'image/png')];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to fetch image', { sourceDescription, page, index, error: message });
      return toolError(`Failed to fetch image from ${sourceDescription}. Reason: ${message}`);
    }
  });
