// PDF text and metadata extraction utilities

import type * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PNG } from 'pngjs';
import type {
  ExtractedImage,
  ExtractedPageText,
  PageContentItem,
  PdfInfo,
  PdfMetadata,
  PdfResultData,
} from '../types/pdf.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Extractor');

/**
 * Encode raw pixel data to PNG format
 */
const encodePixelsToPNG = (
  pixelData: Uint8Array,
  width: number,
  height: number,
  channels: number
): string => {
  const png = new PNG({ width, height });

  // Convert pixel data to RGBA format expected by pngjs
  if (channels === 4) {
    // Already RGBA
    png.data = Buffer.from(pixelData);
  } else if (channels === 3) {
    // RGB -> RGBA (add alpha channel)
    for (let i = 0; i < width * height; i++) {
      const srcIdx = i * 3;
      const dstIdx = i * 4;
      png.data[dstIdx] = pixelData[srcIdx] ?? 0; // R
      png.data[dstIdx + 1] = pixelData[srcIdx + 1] ?? 0; // G
      png.data[dstIdx + 2] = pixelData[srcIdx + 2] ?? 0; // B
      png.data[dstIdx + 3] = 255; // A (fully opaque)
    }
  } else if (channels === 1) {
    // Grayscale -> RGBA
    for (let i = 0; i < width * height; i++) {
      const gray = pixelData[i] ?? 0;
      const dstIdx = i * 4;
      png.data[dstIdx] = gray; // R
      png.data[dstIdx + 1] = gray; // G
      png.data[dstIdx + 2] = gray; // B
      png.data[dstIdx + 3] = 255; // A
    }
  }

  // Encode to PNG and convert to base64
  const pngBuffer = PNG.sync.write(png);
  return pngBuffer.toString('base64');
};

/**
 * Process raw image data from PDF.js and convert to ExtractedImage
 */
const processImageData = (
  imageData: unknown,
  pageNum: number,
  arrayIndex: number
): ExtractedImage | null => {
  if (!imageData || typeof imageData !== 'object') {
    return null;
  }

  const img = imageData as {
    width?: number;
    height?: number;
    data?: Uint8Array;
    kind?: number;
  };

  if (!img.data || !img.width || !img.height) {
    return null;
  }

  // Determine number of channels based on kind
  // kind === 1 = grayscale (1 channel), 2 = RGB (3 channels), 3 = RGBA (4 channels)
  const channels = img.kind === 1 ? 1 : img.kind === 3 ? 4 : 3;
  const format = img.kind === 1 ? 'grayscale' : img.kind === 3 ? 'rgba' : 'rgb';

  // Encode raw pixel data to PNG format
  const pngBase64 = encodePixelsToPNG(img.data, img.width, img.height, channels);

  return {
    page: pageNum,
    index: arrayIndex,
    width: img.width,
    height: img.height,
    format,
    data: pngBase64,
  };
};

/**
 * Retrieve image data from PDF.js page objects
 * Tries multiple strategies: commonObjs -> sync objs.get -> async objs.get with timeout
 */
type ImageDataResult = {
  data: unknown;
  warning?: string;
};

const IMAGE_WARNING_TIMEOUT = 'image_extraction_timeout';
const IMAGE_WARNING_FAILED = 'image_extraction_failed';
const IMAGE_WARNING_PAGE_FAILED = 'image_extraction_page_failed';

const buildImageWarning = (code: string, pageNum: number, imageName?: string) => {
  const base = `${code}:page=${pageNum}`;
  return imageName ? `${base}:image=${imageName}` : base;
};

const retrieveImageData = async (
  page: pdfjsLib.PDFPageProxy,
  imageName: string,
  pageNum: number
): Promise<ImageDataResult> => {
  // Try to get from commonObjs first if it starts with 'g_'
  if (imageName.startsWith('g_')) {
    try {
      const imageData = page.commonObjs.get(imageName);
      if (imageData) {
        return { data: imageData };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('Error getting image from commonObjs', { imageName, error: message });
    }
  }

  // Try synchronous get first - if image is already loaded
  try {
    const imageData = page.objs.get(imageName);
    if (imageData !== undefined) {
      return { data: imageData };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Sync image get failed, trying async', { imageName, error: message });
  }

  // Fallback to async callback-based get with timeout
  return new Promise<ImageDataResult>((resolve) => {
    let resolved = false;
    let timeoutId: NodeJS.Timeout | null = null;

    // Create a cleanup function to ensure resources are released
    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        logger.warn('Image extraction timeout', { imageName, pageNum });
        resolve({
          data: null,
          warning: buildImageWarning(IMAGE_WARNING_TIMEOUT, pageNum, imageName),
        });
      }
    }, 10000); // 10 second timeout as a safety net

    try {
      page.objs.get(imageName, (imageData: unknown) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({ data: imageData });
        }
      });
    } catch (error: unknown) {
      // If get() throws synchronously, clean up and reject
      if (!resolved) {
        resolved = true;
        cleanup();
        const message = error instanceof Error ? error.message : String(error);
        logger.warn('Error in async image get', { imageName, error: message });
        resolve({
          data: null,
          warning: buildImageWarning(IMAGE_WARNING_FAILED, pageNum, imageName),
        });
      }
    }
  });
};

/**
 * Extract metadata and page count from a PDF document
 */
export const extractMetadataAndPageCount = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  includeMetadata: boolean,
  includePageCount: boolean
): Promise<Pick<PdfResultData, 'info' | 'metadata' | 'num_pages'>> => {
  const output: Pick<PdfResultData, 'info' | 'metadata' | 'num_pages'> = {};

  if (includePageCount) {
    output.num_pages = pdfDocument.numPages;
  }

  if (includeMetadata) {
    try {
      const pdfMetadata = await pdfDocument.getMetadata();
      const infoData = pdfMetadata.info as PdfInfo | undefined;

      if (infoData !== undefined) {
        output.info = infoData;
      }

      const metadataObj = pdfMetadata.metadata;

      // Check if it has a getAll method (as used in tests)
      if (typeof (metadataObj as unknown as { getAll?: () => unknown }).getAll === 'function') {
        output.metadata = (metadataObj as unknown as { getAll: () => PdfMetadata }).getAll();
      } else {
        // For real PDF.js metadata, convert to plain object
        const metadataRecord: PdfMetadata = {};
        for (const key in metadataObj) {
          if (Object.hasOwn(metadataObj, key)) {
            metadataRecord[key] = (metadataObj as unknown as Record<string, unknown>)[key];
          }
        }
        output.metadata = metadataRecord;
      }
    } catch (metaError: unknown) {
      const message = metaError instanceof Error ? metaError.message : String(metaError);
      logger.warn('Error extracting metadata', { error: message });
    }
  }

  return output;
};

/**
 * Extract text from a single page
 */
const extractSinglePageText = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  sourceDescription: string
): Promise<ExtractedPageText> => {
  try {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: unknown) => (item as { str: string }).str)
      .join('');

    return { page: pageNum, text: pageText };
  } catch (pageError: unknown) {
    const message = pageError instanceof Error ? pageError.message : String(pageError);
    logger.warn('Error getting text content for page', {
      pageNum,
      sourceDescription,
      error: message,
    });

    return { page: pageNum, text: `Error processing page: ${message}` };
  }
};

/**
 * Extract text from specified pages (parallel processing for performance)
 */
export const extractPageTexts = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  pagesToProcess: number[],
  sourceDescription: string
): Promise<ExtractedPageText[]> => {
  // Process pages in small batches to avoid unbounded memory on large documents
  const BATCH_SIZE = 6;
  const extractedPageTexts: ExtractedPageText[] = [];

  for (let i = 0; i < pagesToProcess.length; i += BATCH_SIZE) {
    const batch = pagesToProcess.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((pageNum) => extractSinglePageText(pdfDocument, pageNum, sourceDescription))
    );
    extractedPageTexts.push(...batchResults);
  }

  return extractedPageTexts.sort((a, b) => a.page - b.page);
};

/**
 * Extract images from a single page
 */
const extractImagesFromPage = async (
  page: pdfjsLib.PDFPageProxy,
  pageNum: number
): Promise<{ images: ExtractedImage[]; warnings: string[] }> => {
  const images: ExtractedImage[] = [];
  const warnings: string[] = [];

  /* c8 ignore next */
  try {
    const operatorList = await page.getOperatorList();

    // Find all image painting operations
    const imageIndices: number[] = [];
    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const op = operatorList.fnArray[i];
      if (op === OPS.paintImageXObject || op === OPS.paintXObject) {
        imageIndices.push(i);
      }
    }

    // Extract each image using shared helper functions
    const imagePromises = imageIndices.map(async (imgIndex, arrayIndex) => {
      const argsArray = operatorList.argsArray[imgIndex];
      if (!argsArray || argsArray.length === 0) {
        return null;
      }

      const imageName = argsArray[0] as string;
      const imageResult = await retrieveImageData(page, imageName, pageNum);
      if (imageResult.warning) {
        warnings.push(imageResult.warning);
      }
      return processImageData(imageResult.data, pageNum, arrayIndex);
    });

    const resolvedImages = await Promise.all(imagePromises);
    images.push(...resolvedImages.filter((img): img is ExtractedImage => img !== null));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Error extracting images from page', { pageNum, error: message });
    warnings.push(buildImageWarning(IMAGE_WARNING_PAGE_FAILED, pageNum));
  }

  return { images, warnings };
};

/**
 * Extract images from specified pages
 */
export const extractImages = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  pagesToProcess: number[]
): Promise<{ images: ExtractedImage[]; warnings: string[] }> => {
  const allImages: ExtractedImage[] = [];
  const warnings: string[] = [];

  // Process pages sequentially to avoid overwhelming PDF.js
  for (const pageNum of pagesToProcess) {
    try {
      const page = await pdfDocument.getPage(pageNum);
      const { images, warnings: pageWarnings } = await extractImagesFromPage(page, pageNum);
      allImages.push(...images);
      warnings.push(...pageWarnings);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('Error getting page for image extraction', { pageNum, error: message });
      warnings.push(buildImageWarning(IMAGE_WARNING_PAGE_FAILED, pageNum));
    }
  }

  return { images: allImages, warnings };
};

/**
 * Build warnings array for invalid page numbers
 */
export const buildWarnings = (invalidPages: number[], totalPages: number): string[] => {
  if (invalidPages.length === 0) {
    return [];
  }

  return [
    `Requested page numbers ${invalidPages.join(', ')} exceed total pages (${String(totalPages)}).`,
  ];
};

/**
 * Extract all content (text and images) from a single page with Y-coordinate ordering
 */
export const extractPageContent = async (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  includeImages: boolean,
  sourceDescription: string
): Promise<{ items: PageContentItem[]; warnings: string[] }> => {
  const contentItems: PageContentItem[] = [];
  const warnings: string[] = [];

  try {
    const page = await pdfDocument.getPage(pageNum);

    // Extract text content with X/Y-coordinates
    const textContent = await page.getTextContent();

    // Group text items by Y-coordinate (items on same line have similar Y values)
    // Also track X-coordinates for table detection
    const textByY = new Map<number, Array<{ x: number; text: string }>>();

    for (const item of textContent.items) {
      const textItem = item as { str: string; transform: number[] };
      // transform[4] is the X coordinate, transform[5] is the Y coordinate
      const xCoord = textItem.transform[4];
      const yCoord = textItem.transform[5];
      if (yCoord === undefined || xCoord === undefined) continue;
      const y = Math.round(yCoord);
      const x = Math.round(xCoord);

      if (!textByY.has(y)) {
        textByY.set(y, []);
      }
      textByY.get(y)?.push({ x, text: textItem.str });
    }

    // Convert grouped text to content items
    for (const [y, textParts] of textByY.entries()) {
      // Sort by X position to maintain left-to-right order
      textParts.sort((a, b) => a.x - b.x);
      const textContent = textParts.map((part) => part.text).join('');
      const xPosition = textParts[0]?.x ?? 0; // Use leftmost X position

      if (textContent.trim()) {
        contentItems.push({
          type: 'text',
          yPosition: y,
          xPosition,
          textContent,
        });
      }
    }

    // Extract images with Y-coordinates if requested
    if (includeImages) {
      const operatorList = await page.getOperatorList();

      // Find all image painting operations
      const imageIndices: number[] = [];
      for (let i = 0; i < operatorList.fnArray.length; i++) {
        const op = operatorList.fnArray[i];
        if (op === OPS.paintImageXObject || op === OPS.paintXObject) {
          imageIndices.push(i);
        }
      }

      // Extract each image using shared helper functions
      const imagePromises = imageIndices.map(async (imgIndex, arrayIndex) => {
        const argsArray = operatorList.argsArray[imgIndex];
        if (!argsArray || argsArray.length === 0) {
          return null;
        }

        const imageName = argsArray[0] as string;

        // Get transform matrix from the args (if available)
        let yPosition = 0;
        if (argsArray.length > 1 && Array.isArray(argsArray[1])) {
          const transform = argsArray[1] as number[];
          const yCoord = transform[5];
          if (yCoord !== undefined) {
            yPosition = Math.round(yCoord);
          }
        }

        // Use shared helper to retrieve and process image data
        const imageResult = await retrieveImageData(page, imageName, pageNum);
        if (imageResult.warning) {
          warnings.push(imageResult.warning);
        }
        const extractedImage = processImageData(imageResult.data, pageNum, arrayIndex);

        // Wrap in PageContentItem with yPosition
        if (extractedImage) {
          return {
            type: 'image' as const,
            yPosition,
            imageData: extractedImage,
          };
        }
        return null;
      });

      const resolvedImages = await Promise.all(imagePromises);
      const validImages = resolvedImages.filter((item) => item !== null);
      contentItems.push(...validImages);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Error extracting page content', {
      pageNum,
      sourceDescription,
      error: message,
    });
    warnings.push(buildImageWarning(IMAGE_WARNING_PAGE_FAILED, pageNum));
    // Return error message as text content
    return {
      items: [
        {
          type: 'text',
          yPosition: 0,
          textContent: `Error processing page: ${message}`,
        },
      ],
      warnings,
    };
  }

  // Sort by Y-position (descending = top to bottom in PDF coordinates)
  return { items: contentItems.sort((a, b) => b.yPosition - a.yPosition), warnings };
};
