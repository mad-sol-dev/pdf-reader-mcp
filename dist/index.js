#!/usr/bin/env node

// src/index.ts
import"dotenv/config";

// src/pdf/polyfills.ts
import { Canvas, Image, Path2D } from "@napi-rs/canvas";
global.Canvas = Canvas;
global.Image = Image;
global.Path2D = Path2D;

// src/index.ts
import { createServer, stdio } from "@sylphx/mcp-server-sdk";

// src/handlers/cache.ts
import { text, tool, toolError } from "@sylphx/mcp-server-sdk";

// src/schemas/cache.ts
import { description, object, optional, str } from "@sylphx/vex";
var cacheClearArgsSchema = object({
  scope: optional(str(description("Cache scope: text, ocr, or all. Defaults to all.")))
});

// src/utils/cache.ts
class LruCache {
  options;
  store = new Map;
  evictions = 0;
  constructor(options) {
    this.options = options;
  }
  get size() {
    return this.store.size;
  }
  get evictionCount() {
    return this.evictions;
  }
  getKeys() {
    return Array.from(this.store.keys());
  }
  clear() {
    this.store.clear();
  }
  isExpired(entry) {
    if (!this.options.ttlMs)
      return false;
    return Date.now() - entry.createdAt > this.options.ttlMs;
  }
  markRecentlyUsed(key, entry) {
    this.store.delete(key);
    this.store.set(key, entry);
  }
  trimToMaxEntries() {
    while (this.store.size > this.options.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (!oldestKey)
        return;
      this.store.delete(oldestKey);
      this.evictions += 1;
    }
  }
  get(key) {
    const entry = this.store.get(key);
    if (!entry)
      return;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      this.evictions += 1;
      return;
    }
    this.markRecentlyUsed(key, entry);
    return entry.value;
  }
  set(key, value) {
    const entry = { value, createdAt: Date.now() };
    if (this.store.has(key)) {
      this.store.delete(key);
    }
    this.store.set(key, entry);
    this.trimToMaxEntries();
  }
}
var DEFAULT_CACHE_OPTIONS = {
  text: { maxEntries: 500 },
  ocr: { maxEntries: 500 }
};
var cacheOptions = {
  text: { ...DEFAULT_CACHE_OPTIONS.text },
  ocr: { ...DEFAULT_CACHE_OPTIONS.ocr }
};
var buildCache = (scope) => new LruCache(cacheOptions[scope]);
var textCache = buildCache("text");
var ocrCache = buildCache("ocr");
var buildPageKey = (fingerprint, page, options) => {
  const serializedOptions = JSON.stringify({
    includeImageIndexes: options.includeImageIndexes,
    preserveWhitespace: options.preserveWhitespace,
    trimLines: options.trimLines,
    maxCharsPerPage: options.maxCharsPerPage ?? null
  });
  return `${fingerprint}#page#${page}#${serializedOptions}`;
};
var buildOcrProviderKey = (provider) => provider ? JSON.stringify({
  name: provider.name,
  type: provider.type,
  endpoint: provider.endpoint,
  model: provider.model,
  language: provider.language,
  extras: provider.extras
}) : "default";
var buildOcrKey = (fingerprint, target) => `${fingerprint}#${target}`;
var getCachedPageText = (fingerprint, page, options) => {
  if (!fingerprint)
    return;
  return textCache.get(buildPageKey(fingerprint, page, options));
};
var setCachedPageText = (fingerprint, page, options, value) => {
  if (!fingerprint)
    return;
  textCache.set(buildPageKey(fingerprint, page, options), value);
};
var getCachedOcrText = (fingerprint, target) => {
  if (!fingerprint)
    return;
  return ocrCache.get(buildOcrKey(fingerprint, target));
};
var setCachedOcrText = (fingerprint, target, value) => {
  if (!fingerprint)
    return;
  ocrCache.set(buildOcrKey(fingerprint, target), value);
};
var clearCache = (scope) => {
  const clearText = scope === "text" || scope === "all";
  const clearOcr = scope === "ocr" || scope === "all";
  if (clearText) {
    textCache.clear();
  }
  if (clearOcr) {
    ocrCache.clear();
  }
  return { cleared_text: clearText, cleared_ocr: clearOcr };
};

// src/handlers/cache.ts
var pdfCacheClear = tool().description("Clear text and/or OCR caches.").input(cacheClearArgsSchema).handler(async ({ input }) => {
  const scope = input.scope ?? "all";
  if (!["text", "ocr", "all"].includes(scope)) {
    return toolError(`Invalid scope '${scope}'. Expected one of: text, ocr, all.`);
  }
  const result = clearCache(scope);
  return [text(JSON.stringify(result, null, 2))];
});

// src/handlers/extractImage.ts
import { image, text as text2, tool as tool2, toolError as toolError2 } from "@sylphx/mcp-server-sdk";

// src/pdf/extractor.ts
import { OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { PNG } from "pngjs";

// src/utils/logger.ts
class Logger {
  prefix;
  minLevel;
  constructor(component, minLevel = 1 /* INFO */) {
    this.prefix = `[PDF Reader MCP${component ? ` - ${component}` : ""}]`;
    this.minLevel = minLevel;
  }
  setLevel(level) {
    this.minLevel = level;
  }
  debug(message, context) {
    if (this.minLevel <= 0 /* DEBUG */) {
      this.log("debug", message, context);
    }
  }
  info(message, context) {
    if (this.minLevel <= 1 /* INFO */) {
      this.log("info", message, context);
    }
  }
  warn(message, context) {
    if (this.minLevel <= 2 /* WARN */) {
      this.log("warn", message, context);
    }
  }
  error(message, context) {
    if (this.minLevel <= 3 /* ERROR */) {
      this.log("error", message, context);
    }
  }
  logWithContext(level, logMessage, structuredLog) {
    const logMethod = this.getConsoleMethod(level);
    logMethod(logMessage);
    if (level === "error" || level === "warn") {
      logMethod(JSON.stringify(structuredLog));
    }
  }
  logSimple(level, logMessage) {
    const logMethod = this.getConsoleMethod(level);
    logMethod(logMessage);
  }
  log(level, message, context) {
    const logMessage = `${this.prefix} ${message}`;
    if (context && Object.keys(context).length > 0) {
      const timestamp = new Date().toISOString();
      const structuredLog = {
        timestamp,
        level,
        component: this.prefix,
        message,
        ...context
      };
      this.logWithContext(level, logMessage, structuredLog);
    } else {
      this.logSimple(level, logMessage);
    }
  }
  getConsoleMethod(level) {
    switch (level) {
      case "debug":
        return console.debug;
      case "info":
        return console.error;
      case "warn":
        return console.warn;
      default:
        return console.error;
    }
  }
}
var createLogger = (component, minLevel) => {
  return new Logger(component, minLevel);
};
var logger = new Logger("", 2 /* WARN */);

// src/pdf/geometry.ts
var multiplyTransform = (m1, m2) => {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1
  ];
};
var transformXY = (viewportTransform, itemTransform) => {
  const combined = multiplyTransform(viewportTransform, itemTransform);
  return { x: combined[4], y: combined[5] };
};
var calculateLineEpsilon = (fontSize) => {
  const DEFAULT_EPSILON = 2.5;
  const EPSILON_RATIO = 0.2;
  return fontSize && fontSize > 0 ? fontSize * EPSILON_RATIO : DEFAULT_EPSILON;
};

// src/pdf/extractor.ts
var logger2 = createLogger("Extractor");
var encodePixelsToPNG = (pixelData, width, height, channels) => {
  const png = new PNG({ width, height });
  if (channels === 4) {
    png.data = Buffer.from(pixelData);
  } else if (channels === 3) {
    for (let i = 0;i < width * height; i++) {
      const srcIdx = i * 3;
      const dstIdx = i * 4;
      png.data[dstIdx] = pixelData[srcIdx] ?? 0;
      png.data[dstIdx + 1] = pixelData[srcIdx + 1] ?? 0;
      png.data[dstIdx + 2] = pixelData[srcIdx + 2] ?? 0;
      png.data[dstIdx + 3] = 255;
    }
  } else if (channels === 1) {
    for (let i = 0;i < width * height; i++) {
      const gray = pixelData[i] ?? 0;
      const dstIdx = i * 4;
      png.data[dstIdx] = gray;
      png.data[dstIdx + 1] = gray;
      png.data[dstIdx + 2] = gray;
      png.data[dstIdx + 3] = 255;
    }
  }
  const pngBuffer = PNG.sync.write(png);
  return pngBuffer.toString("base64");
};
var processImageData = (imageData, pageNum, arrayIndex) => {
  if (!imageData || typeof imageData !== "object") {
    return null;
  }
  const img = imageData;
  if (!img.data || !img.width || !img.height) {
    return null;
  }
  const channels = img.kind === 1 ? 1 : img.kind === 3 ? 4 : 3;
  const format = img.kind === 1 ? "grayscale" : img.kind === 3 ? "rgba" : "rgb";
  const pngBase64 = encodePixelsToPNG(img.data, img.width, img.height, channels);
  return {
    page: pageNum,
    index: arrayIndex,
    width: img.width,
    height: img.height,
    format,
    data: pngBase64
  };
};
var IMAGE_WARNING_TIMEOUT = "image_extraction_timeout";
var IMAGE_WARNING_FAILED = "image_extraction_failed";
var IMAGE_WARNING_PAGE_FAILED = "image_extraction_page_failed";
var buildImageWarning = (code, pageNum, imageName) => {
  const base = `${code}:page=${pageNum}`;
  return imageName ? `${base}:image=${imageName}` : base;
};
var retrieveImageData = async (page, imageName, pageNum) => {
  if (imageName.startsWith("g_")) {
    try {
      const imageData = page.commonObjs.get(imageName);
      if (imageData) {
        return { data: imageData };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger2.warn("Error getting image from commonObjs", { imageName, error: message });
    }
  }
  try {
    const imageData = page.objs.get(imageName);
    if (imageData !== undefined) {
      return { data: imageData };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger2.warn("Sync image get failed, trying async", { imageName, error: message });
  }
  return new Promise((resolve) => {
    let resolved = false;
    let timeoutId = null;
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
        logger2.warn("Image extraction timeout", { imageName, pageNum });
        resolve({
          data: null,
          warning: buildImageWarning(IMAGE_WARNING_TIMEOUT, pageNum, imageName)
        });
      }
    }, 1e4);
    try {
      page.objs.get(imageName, (imageData) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({ data: imageData });
        }
      });
    } catch (error) {
      if (!resolved) {
        resolved = true;
        cleanup();
        const message = error instanceof Error ? error.message : String(error);
        logger2.warn("Error in async image get", { imageName, error: message });
        resolve({
          data: null,
          warning: buildImageWarning(IMAGE_WARNING_FAILED, pageNum, imageName)
        });
      }
    }
  });
};
var extractMetadataAndPageCount = async (pdfDocument, includeMetadata, includePageCount) => {
  const output = {};
  if (includePageCount) {
    output.num_pages = pdfDocument.numPages;
  }
  if (includeMetadata) {
    try {
      const pdfMetadata = await pdfDocument.getMetadata();
      const infoData = pdfMetadata.info;
      if (infoData !== undefined) {
        output.info = infoData;
      }
      const metadataObj = pdfMetadata.metadata;
      if (typeof metadataObj.getAll === "function") {
        output.metadata = metadataObj.getAll();
      } else {
        const metadataRecord = {};
        for (const key in metadataObj) {
          if (Object.hasOwn(metadataObj, key)) {
            metadataRecord[key] = metadataObj[key];
          }
        }
        output.metadata = metadataRecord;
      }
    } catch (metaError) {
      const message = metaError instanceof Error ? metaError.message : String(metaError);
      logger2.warn("Error extracting metadata", { error: message });
    }
  }
  return output;
};
var extractImagesFromPage = async (page, pageNum) => {
  const images = [];
  const warnings = [];
  try {
    const operatorList = await page.getOperatorList();
    const imageIndices = [];
    for (let i = 0;i < operatorList.fnArray.length; i++) {
      const op = operatorList.fnArray[i];
      if (op === OPS.paintImageXObject || op === OPS.paintXObject) {
        imageIndices.push(i);
      }
    }
    const BATCH_SIZE = 6;
    for (let batchStart = 0;batchStart < imageIndices.length; batchStart += BATCH_SIZE) {
      const batch = imageIndices.slice(batchStart, batchStart + BATCH_SIZE);
      const batchPromises = batch.map(async (imgIndex, localIdx) => {
        const globalIndex = batchStart + localIdx;
        const argsArray = operatorList.argsArray[imgIndex];
        if (!argsArray || argsArray.length === 0) {
          return null;
        }
        const imageName = argsArray[0];
        const imageResult = await retrieveImageData(page, imageName, pageNum);
        if (imageResult.warning) {
          warnings.push(imageResult.warning);
        }
        return processImageData(imageResult.data, pageNum, globalIndex);
      });
      const batchResults = await Promise.all(batchPromises);
      images.push(...batchResults.filter((img) => img !== null));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger2.warn("Error extracting images from page", { pageNum, error: message });
    warnings.push(buildImageWarning(IMAGE_WARNING_PAGE_FAILED, pageNum));
  }
  return { images, warnings };
};
var extractImages = async (pdfDocument, pagesToProcess) => {
  const allImages = [];
  const warnings = [];
  for (const pageNum of pagesToProcess) {
    try {
      const page = await pdfDocument.getPage(pageNum);
      const { images, warnings: pageWarnings } = await extractImagesFromPage(page, pageNum);
      allImages.push(...images);
      warnings.push(...pageWarnings);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger2.warn("Error getting page for image extraction", { pageNum, error: message });
      warnings.push(buildImageWarning(IMAGE_WARNING_PAGE_FAILED, pageNum));
    }
  }
  return { images: allImages, warnings };
};
var buildWarnings = (invalidPages, totalPages) => {
  if (invalidPages.length === 0) {
    return [];
  }
  return [
    `Requested page numbers ${invalidPages.join(", ")} exceed total pages (${String(totalPages)}).`
  ];
};
var extractPageContent = async (pdfDocument, pageNum, includeImages, sourceDescription) => {
  const contentItems = [];
  const warnings = [];
  try {
    const page = await pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const viewportTransform = viewport.transform;
    const textContent = await page.getTextContent();
    const textItems = [];
    for (const item of textContent.items) {
      const textItem = item;
      const itemTransform = textItem.transform;
      const { x: xCoord, y: yCoord } = transformXY(viewportTransform, itemTransform);
      const fontSize = typeof textItem.height === "number" && Number.isFinite(textItem.height) ? Math.abs(textItem.height) : undefined;
      const textWidth = typeof textItem.width === "number" && Number.isFinite(textItem.width) ? textItem.width : undefined;
      textItems.push({
        x: xCoord,
        y: yCoord,
        text: textItem.str,
        ...fontSize !== undefined && { fontSize },
        ...textWidth !== undefined && { width: textWidth }
      });
    }
    const lineGroups = [];
    for (const item of textItems) {
      const epsilon = calculateLineEpsilon(item.fontSize);
      const existingLine = lineGroups.find((group) => Math.abs(group.y - item.y) <= epsilon);
      if (existingLine) {
        existingLine.items.push(item);
      } else {
        lineGroups.push({ y: item.y, items: [item] });
      }
    }
    lineGroups.sort((a, b) => a.y - b.y);
    const assembleLineText = (items) => {
      if (items.length === 0)
        return "";
      const firstItem = items[0];
      if (!firstItem)
        return "";
      if (items.length === 1)
        return firstItem.text;
      items.sort((a, b) => a.x - b.x);
      let result = firstItem.text;
      let prevEnd = firstItem.x + (firstItem.width ?? firstItem.text.length * (firstItem.fontSize ?? 10) * 0.5);
      for (let i = 1;i < items.length; i++) {
        const curr = items[i];
        if (!curr)
          continue;
        const gap = curr.x - prevEnd;
        const threshold = curr.fontSize ? curr.fontSize * 0.35 : 3;
        const needsSpace = gap > threshold && !result.endsWith(" ") && !/[,;:.!?\-)]$/.test(result) && !/^[\s,;:.!?\-()]/.test(curr.text);
        if (needsSpace) {
          result += " ";
        }
        result += curr.text;
        prevEnd = curr.x + (curr.width ?? curr.text.length * (curr.fontSize ?? 10) * 0.5);
      }
      return result;
    };
    for (const group of lineGroups) {
      const textContent2 = assembleLineText(group.items);
      if (textContent2.trim()) {
        const fontSizes = group.items.map((item) => item.fontSize).filter((fs) => typeof fs === "number" && fs > 0);
        const averageFontSize = fontSizes.length > 0 ? fontSizes.reduce((sum, fs) => sum + fs, 0) / fontSizes.length : undefined;
        const xPosition = group.items[0]?.x ?? 0;
        contentItems.push({
          type: "text",
          yPosition: group.y,
          xPosition,
          ...averageFontSize !== undefined && { fontSize: averageFontSize },
          textContent: textContent2
        });
      }
    }
    if (includeImages) {
      const operatorList = await page.getOperatorList();
      const imageIndices = [];
      for (let i = 0;i < operatorList.fnArray.length; i++) {
        const op = operatorList.fnArray[i];
        if (op === OPS.paintImageXObject || op === OPS.paintXObject) {
          imageIndices.push(i);
        }
      }
      const imagePromises = imageIndices.map(async (imgIndex, arrayIndex) => {
        const argsArray = operatorList.argsArray[imgIndex];
        if (!argsArray || argsArray.length === 0) {
          return null;
        }
        const imageName = argsArray[0];
        let yPosition = 0;
        if (argsArray.length > 1 && Array.isArray(argsArray[1])) {
          const imageTransform = argsArray[1];
          const { y } = transformXY(viewportTransform, imageTransform);
          yPosition = y;
        }
        const imageResult = await retrieveImageData(page, imageName, pageNum);
        if (imageResult.warning) {
          warnings.push(imageResult.warning);
        }
        const extractedImage = processImageData(imageResult.data, pageNum, arrayIndex);
        if (extractedImage) {
          return {
            type: "image",
            yPosition,
            imageData: extractedImage
          };
        }
        return null;
      });
      const resolvedImages = await Promise.all(imagePromises);
      const validImages = resolvedImages.filter((item) => item !== null);
      contentItems.push(...validImages);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger2.warn("Error extracting page content", {
      pageNum,
      sourceDescription,
      error: message
    });
    warnings.push(buildImageWarning(IMAGE_WARNING_PAGE_FAILED, pageNum));
    return {
      items: [
        {
          type: "text",
          yPosition: 0,
          textContent: `Error processing page: ${message}`
        }
      ],
      warnings
    };
  }
  return { items: contentItems.sort((a, b) => a.yPosition - b.yPosition), warnings };
};

// src/utils/errors.ts
class PdfError extends Error {
  code;
  constructor(code, message, options) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.code = code;
    this.name = "PdfError";
  }
}

// src/pdf/parser.ts
var logger3 = createLogger("Parser");
var MAX_RANGE_SIZE = 1e4;
var DEFAULT_SAMPLE_PAGE_LIMIT = 5;
var parseRangePart = (part, pages) => {
  const trimmedPart = part.trim();
  if (trimmedPart.includes("-")) {
    const splitResult = trimmedPart.split("-");
    const startStr = splitResult[0] || "";
    const endStr = splitResult[1];
    const start = parseInt(startStr, 10);
    const end = endStr === "" || endStr === undefined ? Infinity : parseInt(endStr, 10);
    if (Number.isNaN(start) || Number.isNaN(end) || start <= 0 || start > end) {
      throw new Error(`Invalid page range values: ${trimmedPart}`);
    }
    const practicalEnd = Math.min(end, start + MAX_RANGE_SIZE);
    for (let i = start;i <= practicalEnd; i++) {
      pages.add(i);
    }
    if (end === Infinity && practicalEnd === start + MAX_RANGE_SIZE) {
      logger3.warn("Open-ended range truncated", { start, practicalEnd });
      return `Open-ended page range starting at ${start} was truncated at ${practicalEnd} to cap open ranges.`;
    }
  } else {
    const page = parseInt(trimmedPart, 10);
    if (Number.isNaN(page) || page <= 0) {
      throw new Error(`Invalid page number: ${trimmedPart}`);
    }
    pages.add(page);
  }
  return;
};
var parsePageRanges = (ranges) => {
  const pages = new Set;
  const parts = ranges.split(",");
  const warnings = [];
  for (const part of parts) {
    const warning = parseRangePart(part, pages);
    if (warning) {
      warnings.push(warning);
    }
  }
  if (pages.size === 0) {
    throw new Error("Page range string resulted in zero valid pages.");
  }
  return { pages: Array.from(pages).sort((a, b) => a - b), warnings };
};
var getTargetPages = (sourcePages, sourceDescription) => {
  if (!sourcePages) {
    return { pages: undefined, warnings: [] };
  }
  try {
    if (typeof sourcePages === "string") {
      return parsePageRanges(sourcePages);
    }
    if (sourcePages.some((p) => !Number.isInteger(p) || p <= 0)) {
      throw new Error("Page numbers in array must be positive integers.");
    }
    const uniquePages = [...new Set(sourcePages)].sort((a, b) => a - b);
    if (uniquePages.length === 0) {
      throw new Error("Page specification resulted in an empty set of pages.");
    }
    return { pages: uniquePages, warnings: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new PdfError(-32602 /* InvalidParams */, `Invalid page specification for source ${sourceDescription}: ${message}`);
  }
};
var determinePagesToProcess = (targetPages, totalPages, includeFullText, options) => {
  const { pages, warnings: rangeWarnings } = targetPages;
  if (pages) {
    const pagesToProcess = pages.filter((p) => p <= totalPages);
    const invalidPages = pages.filter((p) => p > totalPages);
    return { pagesToProcess, invalidPages, rangeWarnings };
  }
  const allowFullDocument = options?.allowFullDocument ?? includeFullText;
  if (includeFullText) {
    if (allowFullDocument) {
      const pagesToProcess2 = Array.from({ length: totalPages }, (_, i) => i + 1);
      return { pagesToProcess: pagesToProcess2, invalidPages: [] };
    }
    const samplePageLimit = options?.samplePageLimit ?? DEFAULT_SAMPLE_PAGE_LIMIT;
    const sampledPagesCount = Math.min(samplePageLimit, totalPages);
    const pagesToProcess = Array.from({ length: sampledPagesCount }, (_, i) => i + 1);
    return {
      pagesToProcess,
      invalidPages: [],
      sampledFromFullDocument: true,
      guardWarning: totalPages > samplePageLimit ? `No pages specified; returning the first ${sampledPagesCount} of ${totalPages} pages. Specify pages or set allow_full_document=true to process the full document.` : "No pages specified; processed available pages because the document is small. Specify pages or set allow_full_document=true to control full-document requests."
    };
  }
  return { pagesToProcess: [], invalidPages: [] };
};

// src/schemas/extractImage.ts
import { description as description3, gte as gte2, int as int2, num as num2, object as object3 } from "@sylphx/vex";

// src/schemas/pdfSource.ts
import {
  array,
  description as description2,
  gte,
  int,
  min,
  num,
  object as object2,
  optional as optional2,
  refine,
  str as str2,
  union
} from "@sylphx/vex";
var pageSpecifierSchema = union(array(num(int, gte(1))), str2(min(1)));
var basePdfSourceSchema = object2({
  path: optional2(str2(min(1), description2("Path to the local PDF file (absolute or relative to cwd)."))),
  url: optional2(str2(min(1), description2("URL of the PDF file."))),
  pages: optional2(pageSpecifierSchema)
});
var pdfSourceSchema = refine(basePdfSourceSchema, (source) => {
  const hasPath = source.path !== undefined && source.path !== "";
  const hasUrl = source.url !== undefined && source.url !== "";
  if (hasPath && hasUrl) {
    return 'Cannot specify both "path" and "url". Provide exactly one.';
  }
  if (!hasPath && !hasUrl) {
    return 'Must specify either "path" or "url".';
  }
  return true;
}, description2("PDF source: either a local path or a URL, but not both."));

// src/schemas/extractImage.ts
var extractImageArgsSchema = object3({
  source: pdfSourceSchema,
  page: num2(int2, gte2(1), description3("1-based page number containing the image.")),
  index: num2(int2, gte2(0), description3("0-based image index within the page."))
});

// src/utils/ocrRecommendation.ts
var OCR_IMAGE_RECOMMENDATION = "⚠️ For text extraction from this image, consider using pdf_ocr_image with Mistral OCR (faster, cheaper, cached). Manual image analysis via LLMs like Claude is more expensive, does not create persistent cache files, and is less precise for text extraction.";

// src/pdf/loader.ts
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

// src/utils/pathUtils.ts
import path from "node:path";
var PROJECT_ROOT = process.cwd();
var ENV_ALLOWED_PATHS = "PDF_ALLOWED_PATHS";
var ENV_BASE_DIR = "PDF_BASE_DIR";
var ENV_ALLOW_UNSAFE_ABSOLUTE = "PDF_ALLOW_UNSAFE_ABSOLUTE";
var parseAllowedRoots = (value) => {
  if (!value) {
    return;
  }
  return value.split(path.delimiter).map((entry) => entry.trim()).filter(Boolean);
};
var getPathGuardConfig = () => {
  const allowedRoots = parseAllowedRoots(process.env[ENV_ALLOWED_PATHS]);
  return {
    baseDir: process.env[ENV_BASE_DIR] ?? PROJECT_ROOT,
    ...allowedRoots !== undefined && { allowedRoots },
    allowUnsafeAbsolute: process.env[ENV_ALLOW_UNSAFE_ABSOLUTE] === "true"
  };
};
var isWithinRoot = (root, target) => {
  const normalizedRoot = path.resolve(root);
  const normalizedTarget = path.resolve(target);
  const relative = path.relative(normalizedRoot, normalizedTarget);
  return relative === "" || !relative.startsWith("..") && !path.isAbsolute(relative);
};
var resolvePath = (userPath, options = {}) => {
  if (typeof userPath !== "string") {
    throw new PdfError(-32602 /* InvalidParams */, "Path must be a string.");
  }
  const envConfig = getPathGuardConfig();
  const baseDir = options.baseDir ?? envConfig.baseDir ?? PROJECT_ROOT;
  const allowedRoots = options.allowedRoots ?? envConfig.allowedRoots ?? [baseDir];
  const allowUnsafeAbsolute = options.allowUnsafeAbsolute ?? envConfig.allowUnsafeAbsolute ?? false;
  const normalizedUserPath = path.normalize(userPath);
  const resolvedPath = path.isAbsolute(normalizedUserPath) ? normalizedUserPath : path.resolve(baseDir, normalizedUserPath);
  if (path.isAbsolute(normalizedUserPath) && allowUnsafeAbsolute) {
    return path.normalize(resolvedPath);
  }
  const isAllowed = allowedRoots.some((root) => isWithinRoot(root, resolvedPath));
  if (!isAllowed) {
    throw new PdfError(-32600 /* InvalidRequest */, `Resolved path is outside the allowed directories.`);
  }
  return path.normalize(resolvedPath);
};

// src/pdf/canvasFactory.ts
import { createCanvas } from "@napi-rs/canvas";

class NodeCanvasFactory {
  create(width, height) {
    const safeWidth = Math.floor(Math.max(1, width));
    const safeHeight = Math.floor(Math.max(1, height));
    const canvas = createCanvas(safeWidth, safeHeight);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }
  reset(canvasAndContext, width, height) {
    const safeWidth = Math.floor(Math.max(1, width));
    const safeHeight = Math.floor(Math.max(1, height));
    canvasAndContext.canvas.width = safeWidth;
    canvasAndContext.canvas.height = safeHeight;
  }
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

// src/pdf/loader.ts
var logger4 = createLogger("Loader");
var require2 = createRequire(import.meta.url);
var CMAP_URL = require2.resolve("pdfjs-dist/package.json").replace("package.json", "cmaps/");
var MAX_PDF_SIZE = 100 * 1024 * 1024;
var DEFAULT_REQUEST_TIMEOUT_MS = 15000;
var DEFAULT_READ_TIMEOUT_MS = 15000;
var DEFAULT_ALLOWED_PROTOCOLS = ["https:", "http:"];
var isPrivateOrLocalHost = (hostname) => {
  const privatePatterns = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i
  ];
  return privatePatterns.some((pattern) => pattern.test(hostname));
};
var fetchPdfBytes = async (url, sourceDescription, options) => {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (err) {
    throw new PdfError(-32602 /* InvalidParams */, `Invalid URL for ${sourceDescription}. Reason: ${err instanceof Error ? err.message : String(err)}`);
  }
  const allowedProtocols = options.allowedProtocols ?? DEFAULT_ALLOWED_PROTOCOLS;
  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    throw new PdfError(-32600 /* InvalidRequest */, `URL protocol '${parsedUrl.protocol}' is not allowed for ${sourceDescription}. Allowed protocols: ${allowedProtocols.join(", ")}`);
  }
  if (isPrivateOrLocalHost(parsedUrl.hostname)) {
    throw new PdfError(-32600 /* InvalidRequest */, `URL points to private/internal network for ${sourceDescription}. This is not allowed for security reasons.`);
  }
  const maxBytes = options.maxBytes ?? MAX_PDF_SIZE;
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const readTimeoutMs = options.readTimeoutMs ?? DEFAULT_READ_TIMEOUT_MS;
  const controller = new AbortController;
  let requestTimedOut = false;
  const requestTimeoutId = setTimeout(() => {
    requestTimedOut = true;
    controller.abort();
  }, requestTimeoutMs);
  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    clearTimeout(requestTimeoutId);
    if (requestTimedOut) {
      throw new PdfError(-32600 /* InvalidRequest */, `Timed out requesting PDF from ${sourceDescription} after ${requestTimeoutMs}ms.`);
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new PdfError(-32600 /* InvalidRequest */, `Failed to fetch PDF from ${sourceDescription}. Reason: ${message}`);
  }
  clearTimeout(requestTimeoutId);
  if (!response.ok) {
    throw new PdfError(-32600 /* InvalidRequest */, `Failed to fetch PDF from ${sourceDescription}. Status: ${response.status} ${response.statusText}`.trim());
  }
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const contentLengthBytes = Number.parseInt(contentLength, 10);
    if (Number.isFinite(contentLengthBytes) && contentLengthBytes > maxBytes) {
      controller.abort();
      throw new PdfError(-32600 /* InvalidRequest */, `PDF download exceeds maximum size of ${maxBytes} bytes. Reported content length: ${contentLengthBytes} bytes.`);
    }
  }
  if (!response.body) {
    throw new PdfError(-32600 /* InvalidRequest */, `Failed to fetch PDF from ${sourceDescription}. Reason: Response body is empty.`);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let receivedBytes = 0;
  let readTimedOut = false;
  let readTimeoutId = null;
  const resetReadTimeout = () => {
    if (readTimeoutId) {
      clearTimeout(readTimeoutId);
    }
    readTimeoutId = setTimeout(() => {
      readTimedOut = true;
      reader.cancel("read timeout");
      controller.abort();
    }, readTimeoutMs);
  };
  try {
    resetReadTimeout();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        receivedBytes += value.length;
        if (receivedBytes > maxBytes) {
          await reader.cancel("max size exceeded");
          controller.abort();
          throw new PdfError(-32600 /* InvalidRequest */, `PDF download exceeds maximum size of ${maxBytes} bytes. Received ${receivedBytes} bytes.`);
        }
        chunks.push(value);
        resetReadTimeout();
      }
    }
    if (readTimedOut) {
      throw new PdfError(-32600 /* InvalidRequest */, `Timed out reading PDF from ${sourceDescription} after ${readTimeoutMs}ms without new data.`);
    }
  } catch (err) {
    if (readTimeoutId) {
      clearTimeout(readTimeoutId);
    }
    if (readTimedOut) {
      throw new PdfError(-32600 /* InvalidRequest */, `Timed out reading PDF from ${sourceDescription} after ${readTimeoutMs}ms without new data.`);
    }
    if (err instanceof PdfError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new PdfError(-32600 /* InvalidRequest */, `Failed to fetch PDF from ${sourceDescription}. Reason: download aborted.`);
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new PdfError(-32600 /* InvalidRequest */, `Failed to fetch PDF from ${sourceDescription}. Reason: ${message}`);
  } finally {
    if (readTimeoutId) {
      clearTimeout(readTimeoutId);
    }
  }
  const buffer = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  return buffer;
};
var loadPdfDocument = async (source, sourceDescription, options = {}) => {
  let pdfDataSource;
  try {
    if (source.path) {
      const safePath = resolvePath(source.path);
      const buffer = await fs.readFile(safePath);
      if (buffer.length > MAX_PDF_SIZE) {
        throw new PdfError(-32600 /* InvalidRequest */, `PDF file exceeds maximum size of ${MAX_PDF_SIZE} bytes (${(MAX_PDF_SIZE / 1024 / 1024).toFixed(0)}MB). File size: ${buffer.length} bytes.`);
      }
      pdfDataSource = new Uint8Array(buffer);
    } else if (source.url) {
      pdfDataSource = await fetchPdfBytes(source.url, sourceDescription, options);
    } else {
      throw new PdfError(-32602 /* InvalidParams */, `Source ${sourceDescription} missing 'path' or 'url'.`);
    }
  } catch (err) {
    if (err instanceof PdfError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    const errorCode = -32600 /* InvalidRequest */;
    if (typeof err === "object" && err !== null && "code" in err && err.code === "ENOENT" && source.path) {
      throw new PdfError(errorCode, `File not found at '${source.path}'.`, {
        cause: err instanceof Error ? err : undefined
      });
    }
    throw new PdfError(errorCode, `Failed to prepare PDF source ${sourceDescription}. Reason: ${message}`, { cause: err instanceof Error ? err : undefined });
  }
  const canvasFactory = new NodeCanvasFactory;
  const loadingTask = getDocument({
    data: pdfDataSource,
    cMapUrl: CMAP_URL,
    cMapPacked: true,
    canvasFactory
  });
  try {
    return await loadingTask.promise;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger4.error("PDF.js loading error", { sourceDescription, error: message });
    throw new PdfError(-32600 /* InvalidRequest */, `Failed to load PDF document from ${sourceDescription}. Reason: ${message || "Unknown loading error"}`, { cause: err instanceof Error ? err : undefined });
  }
};

// src/utils/pdfLifecycle.ts
var logger5 = createLogger("PdfLifecycle");
var withPdfDocument = async (source, sourceDescription, handler) => {
  const pdfDocument = await loadPdfDocument(source, sourceDescription);
  try {
    return await handler(pdfDocument);
  } finally {
    if (typeof pdfDocument.destroy === "function") {
      try {
        await pdfDocument.destroy();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger5.warn("Error destroying PDF document", { sourceDescription, error: message });
      }
    }
  }
};

// src/handlers/extractImage.ts
var logger6 = createLogger("ExtractImage");
var buildImageMetadata = (targetImage, warnings) => ({
  page: targetImage.page,
  index: targetImage.index,
  width: targetImage.width,
  height: targetImage.height,
  format: targetImage.format,
  recommendation: OCR_IMAGE_RECOMMENDATION,
  warnings: warnings.length > 0 ? warnings : undefined
});
var resolveTargetPages = (sourcePages, sourceDescription, page) => {
  const targetPages = getTargetPages(sourcePages, sourceDescription);
  const pages = targetPages.pages ? [...targetPages.pages] : [];
  if (!pages.includes(page)) {
    pages.push(page);
  }
  return { ...targetPages, pages };
};
var fetchImage = async (source, sourceDescription, page, index) => {
  const loadArgs = {
    ...source.path ? { path: source.path } : {},
    ...source.url ? { url: source.url } : {}
  };
  return withPdfDocument(loadArgs, sourceDescription, async (pdfDocument) => {
    const totalPages = pdfDocument.numPages;
    if (page < 1 || page > totalPages) {
      throw new Error(`Requested page ${page} exceeds total pages (${totalPages}).`);
    }
    const { pagesToProcess, invalidPages, rangeWarnings } = determinePagesToProcess(resolveTargetPages(source.pages, sourceDescription, page), totalPages, false);
    if (!pagesToProcess.includes(page)) {
      throw new Error(`Requested page ${page} exceeds total pages (${totalPages}).`);
    }
    const { images: pageImages, warnings: imageWarnings } = await extractImages(pdfDocument, [
      page
    ]);
    const targetImage = pageImages.find((img) => img.index === index && img.page === page);
    if (!targetImage) {
      throw new Error(`Image with index ${index} not found on page ${page}.`);
    }
    const warnings = [
      ...rangeWarnings ?? [],
      ...buildWarnings(invalidPages, totalPages),
      ...imageWarnings
    ];
    return { metadata: buildImageMetadata(targetImage, warnings), imageData: targetImage.data };
  });
};
var pdfExtractImage = tool2().description(`STAGE 2: Extract image from PDF for Vision analysis

` + `Use AFTER Stage 1 (pdf_read) when you see [IMAGE] markers or image_indexes in the text.

` + "Returns base64-encoded PNG image that you can analyze with your Vision capabilities. " + `If the image contains text that Vision cannot read clearly, use Stage 3 (pdf_ocr) instead.

` + `Example:
` + '  pdf_extract_image({source: {path: "doc.pdf"}, page: 5, index: 0})').input(extractImageArgsSchema).handler(async ({ input }) => {
  const { source, page, index } = input;
  const sourceDescription = source.path ?? source.url ?? "unknown source";
  const normalizedSource = {
    ...source.path ? { path: source.path } : {},
    ...source.url ? { url: source.url } : {},
    ...source.pages !== undefined ? { pages: source.pages } : {}
  };
  try {
    const result = await fetchImage(normalizedSource, sourceDescription, page, index);
    return [text2(JSON.stringify(result.metadata, null, 2)), image(result.imageData, "image/png")];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger6.error("Failed to fetch image", { sourceDescription, page, index, error: message });
    return toolError2(`Failed to fetch image from ${sourceDescription}. Reason: ${message}`);
  }
});

// src/handlers/pdfInfo.ts
import { text as text3, tool as tool3, toolError as toolError3 } from "@sylphx/mcp-server-sdk";
import { OPS as OPS2 } from "pdfjs-dist/legacy/build/pdf.mjs";

// src/schemas/pdfInfo.ts
import { array as array2, description as description4, object as object4, optional as optional3, str as str3 } from "@sylphx/vex";
var pdfInfoArgsSchema = object4({
  source: pdfSourceSchema,
  include: optional3(array2(str3(), description4('Optional info to include: "toc" (table of contents), "stats" (page/image statistics). ' + "Omit for basic metadata only (pages, title, author, language).")))
});

// src/handlers/pdfInfo.ts
var logger7 = createLogger("PdfInfo");
var buildLoadArgs = (source) => ({
  ...source.path ? { path: source.path } : {},
  ...source.url ? { url: source.url } : {}
});
var getFingerprint = (pdfDocument) => pdfDocument.fingerprint ?? pdfDocument.fingerprints?.[0];
var getTocInfo = async (pdfDocument, sourceDescription) => {
  try {
    const outline = await pdfDocument.getOutline();
    if (!outline || outline.length === 0) {
      return { has_toc: false };
    }
    const countEntries = (items) => {
      let count = items.length;
      for (const item of items) {
        const typedItem = item;
        if (typedItem.items && Array.isArray(typedItem.items)) {
          count += countEntries(typedItem.items);
        }
      }
      return count;
    };
    return {
      has_toc: true,
      toc_entries: countEntries(outline)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger7.warn("Error checking TOC", { sourceDescription, error: message });
    return { has_toc: false };
  }
};
var countImagesOnPage = async (page) => {
  const operatorList = await page.getOperatorList();
  const fnArray = operatorList.fnArray ?? [];
  let count = 0;
  for (const op of fnArray) {
    if (op === OPS2.paintImageXObject || op === OPS2.paintXObject) {
      count += 1;
    }
  }
  return count;
};
var countTotalImages = async (pdfDocument, pagesToCheck, sourceDescription) => {
  let totalImages = 0;
  for (let pageNum = 1;pageNum <= pagesToCheck; pageNum++) {
    try {
      const page = await pdfDocument.getPage(pageNum);
      totalImages += await countImagesOnPage(page);
    } catch (pageError) {
      const message = pageError instanceof Error ? pageError.message : String(pageError);
      logger7.warn("Error checking images on page", {
        sourceDescription,
        page: pageNum,
        error: message
      });
    }
  }
  return totalImages;
};
var buildImageStatsResult = (totalImages, pagesToCheck, numPages) => {
  if (totalImages === 0) {
    return { has_images: false };
  }
  const estimatedTotal = pagesToCheck < numPages ? Math.round(totalImages / pagesToCheck * numPages) : totalImages;
  return {
    has_images: true,
    image_count: estimatedTotal
  };
};
var getImageStats = async (pdfDocument, sourceDescription) => {
  try {
    const numPages = pdfDocument.numPages;
    const pagesToCheck = Math.min(10, numPages);
    const totalImages = await countTotalImages(pdfDocument, pagesToCheck, sourceDescription);
    return buildImageStatsResult(totalImages, pagesToCheck, numPages);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger7.warn("Error counting images", { sourceDescription, error: message });
    return { has_images: false };
  }
};
var buildNextStep = (data) => {
  if (data.has_toc || data.has_images) {
    return {
      suggestion: "To read content, use pdf_read (Stage 1). To search for specific terms, use pdf_search.",
      tools: ["pdf_read", "pdf_search"]
    };
  }
  return {
    suggestion: "Use pdf_read (Stage 1) to extract text from pages.",
    tools: ["pdf_read"]
  };
};
var buildBaseData = async (pdfDocument) => {
  const metadata = await extractMetadataAndPageCount(pdfDocument, true, true);
  const fingerprint = getFingerprint(pdfDocument);
  return {
    pages: metadata.num_pages ?? pdfDocument.numPages,
    ...metadata.info?.Title ? { title: metadata.info.Title } : {},
    ...metadata.info?.Author ? { author: metadata.info.Author } : {},
    ...metadata.info?.Language !== undefined ? { language: metadata.info.Language } : {},
    ...fingerprint ? { fingerprint } : {}
  };
};
var enrichData = async (data, pdfDocument, sourceDescription, includeToc, includeStats) => {
  if (includeToc) {
    const tocInfo = await getTocInfo(pdfDocument, sourceDescription);
    data.has_toc = tocInfo.has_toc;
    if (tocInfo.toc_entries !== undefined) {
      data.toc_entries = tocInfo.toc_entries;
    }
  }
  if (includeStats) {
    const imageStats = await getImageStats(pdfDocument, sourceDescription);
    data.has_images = imageStats.has_images;
    if (imageStats.image_count !== undefined) {
      data.image_count = imageStats.image_count;
    }
  }
};
var processSource = async (args) => {
  const { source, include } = args;
  const sourceDescription = source.path ?? source.url ?? "unknown source";
  const loadArgs = buildLoadArgs(source);
  const includeToc = include?.includes("toc") ?? false;
  const includeStats = include?.includes("stats") ?? false;
  return withPdfDocument(loadArgs, sourceDescription, async (pdfDocument) => {
    const data = await buildBaseData(pdfDocument);
    await enrichData(data, pdfDocument, sourceDescription, includeToc, includeStats);
    data.next_step = buildNextStep({
      has_toc: data.has_toc,
      has_images: data.has_images
    });
    return {
      source: sourceDescription,
      success: true,
      data
    };
  });
};
var pdfInfo = tool3().description(`QUICK CHECK: Get PDF metadata and overview

` + `Use for fast answers about the PDF without loading content:
` + `- How many pages?
` + `- Title/author/language?
` + `- Has table of contents? (with include=["toc"])
` + `- Has images? (with include=["stats"])

` + `This is FAST and LIGHTWEIGHT - perfect before deciding which pages to read.

` + `Example:
` + `  pdf_info({source: {path: "doc.pdf"}})
` + '  pdf_info({source: {path: "doc.pdf"}, include: ["toc", "stats"]})').input(pdfInfoArgsSchema).handler(async ({ input }) => {
  try {
    const result = await processSource(input);
    return [text3(JSON.stringify(result, null, 2))];
  } catch (error) {
    const sourceDescription = input.source.path ?? input.source.url ?? "unknown source";
    const message = error instanceof Error ? error.message : String(error);
    const errorResult = {
      source: sourceDescription,
      success: false,
      error: `Failed to get info for ${sourceDescription}. Reason: ${message}`
    };
    return toolError3(JSON.stringify(errorResult));
  }
});

// src/handlers/pdfOcr.ts
import { image as image2, text as text4, tool as tool4, toolError as toolError4 } from "@sylphx/mcp-server-sdk";
import { OPS as OPS3 } from "pdfjs-dist/legacy/build/pdf.mjs";

// src/pdf/render.ts
var logger8 = createLogger("Renderer");
var renderPageToPng = async (pdfDocument, pageNum, scale = 1.5) => {
  const page = await pdfDocument.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvasFactory = new NodeCanvasFactory;
  const { canvas, context } = canvasFactory.create(viewport.width, viewport.height);
  const renderContext = {
    canvasContext: context,
    viewport,
    canvasFactory
  };
  try {
    await page.render(renderContext).promise;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger8.error("Error rendering page", { pageNum, error: message });
    throw error;
  }
  const pngBuffer = await canvas.encode("png");
  canvasFactory.destroy({ canvas, context });
  return {
    width: Math.ceil(viewport.width),
    height: Math.ceil(viewport.height),
    scale,
    data: pngBuffer.toString("base64")
  };
};

// src/schemas/pdfOcr.ts
import { bool, description as description5, gte as gte3, int as int3, num as num3, object as object5, optional as optional4 } from "@sylphx/vex";
var pdfOcrArgsSchema = object5({
  source: pdfSourceSchema,
  page: num3(int3, gte3(1), description5("1-based page number.")),
  index: optional4(num3(int3, gte3(0), description5("0-based image index within the page. If provided, OCR will be performed on the specific image. If omitted, OCR will be performed on the entire rendered page."))),
  scale: optional4(num3(gte3(0.1), description5("Rendering scale applied before OCR (only for page OCR)."))),
  cache: optional4(bool(description5("Use cached OCR result when available. Defaults to true."))),
  smart_ocr: optional4(bool(description5("Enable smart OCR decision step to skip OCR when likely unnecessary (only for page OCR).")))
});

// src/utils/diskCache.ts
import crypto from "node:crypto";
import fs2 from "node:fs";
import fsPromises from "node:fs/promises";
import path2 from "node:path";
var logger9 = createLogger("DiskCache");
var LOCK_RETRY_MS = 25;
var LOCK_TIMEOUT_MS = 5000;
var getCacheDirectory = () => {
  return process.env.PDF_READER_CACHE_DIR ?? null;
};
var getCacheFilePath = (pdfPath) => {
  const cacheDir = getCacheDirectory();
  const basename = path2.basename(pdfPath, path2.extname(pdfPath));
  if (cacheDir) {
    const hash = crypto.createHash("md5").update(pdfPath).digest("hex").slice(0, 8);
    return path2.join(cacheDir, `${basename}_${hash}_ocr.json`);
  }
  const dir = path2.dirname(pdfPath);
  return path2.join(dir, `${basename}_ocr.json`);
};
var loadOcrCache = (pdfPath) => {
  const cachePath = getCacheFilePath(pdfPath);
  try {
    if (!fs2.existsSync(cachePath)) {
      return null;
    }
    const content = fs2.readFileSync(cachePath, "utf-8");
    const cache = JSON.parse(content);
    if (!cache.fingerprint || !cache.pages || !cache.images) {
      logger9.warn("Invalid cache file structure", { cachePath });
      return null;
    }
    logger9.debug("Loaded OCR cache from disk", {
      cachePath,
      pageCount: Object.keys(cache.pages).length,
      imageCount: Object.keys(cache.images).length
    });
    return cache;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger9.warn("Failed to load OCR cache", { cachePath, error: message });
    return null;
  }
};
var sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
var LOCK_STALE_MS = 60000;
var isLockStale = async (lockPath) => {
  try {
    const content = await fsPromises.readFile(lockPath, "utf-8");
    const { pid, timestamp } = JSON.parse(content);
    try {
      process.kill(pid, 0);
    } catch {
      logger9.debug("Lock process no longer exists", { pid, lockPath });
      return true;
    }
    if (Date.now() - timestamp > LOCK_STALE_MS) {
      logger9.debug("Lock exceeded max age", { pid, age: Date.now() - timestamp, lockPath });
      return true;
    }
    return false;
  } catch {
    return true;
  }
};
var acquireCacheLock = async (lockPath) => {
  const start = Date.now();
  while (true) {
    try {
      const handle = await fsPromises.open(lockPath, "wx");
      await handle.write(JSON.stringify({ pid: process.pid, timestamp: Date.now() }));
      return handle;
    } catch (error) {
      const err = error;
      if (err.code === "EEXIST") {
        if (await isLockStale(lockPath)) {
          logger9.warn("Removing stale cache lock", { lockPath });
          await fsPromises.rm(lockPath, { force: true });
          continue;
        }
        if (Date.now() - start > LOCK_TIMEOUT_MS) {
          throw new Error(`Timed out waiting for cache lock at ${lockPath}`);
        }
        await sleep(LOCK_RETRY_MS);
        continue;
      }
      throw error;
    }
  }
};
var releaseCacheLock = async (lockPath, handle) => {
  if (handle) {
    try {
      await handle.close();
    } catch (closeError) {
      logger9.warn("Failed to close lock file handle", {
        lockPath,
        error: closeError instanceof Error ? closeError.message : String(closeError)
      });
    }
  }
  await fsPromises.rm(lockPath, { force: true });
};
var writeCacheFile = async (cachePath, cache) => {
  cache.updated_at = new Date().toISOString();
  const dir = path2.dirname(cachePath);
  try {
    await fsPromises.access(dir);
  } catch {
    await fsPromises.mkdir(dir, { recursive: true });
  }
  const tempPath = `${cachePath}.${process.pid}.${Date.now()}.tmp`;
  await fsPromises.writeFile(tempPath, JSON.stringify(cache, null, 2), "utf-8");
  await fsPromises.rename(tempPath, cachePath);
};
var atomicCacheUpdate = async (pdfPath, fingerprint, ocrProvider, updateFn) => {
  const cachePath = getCacheFilePath(pdfPath);
  const lockPath = `${cachePath}.lock`;
  const lockHandle = await acquireCacheLock(lockPath);
  try {
    let cache = loadOcrCache(pdfPath);
    if (!cache || cache.fingerprint !== fingerprint) {
      if (cache && cache.fingerprint !== fingerprint) {
        logger9.warn("PDF fingerprint changed, resetting cache", { pdfPath });
      }
      cache = {
        fingerprint,
        pdf_path: pdfPath,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ocr_provider: ocrProvider,
        pages: {},
        images: {}
      };
    }
    updateFn(cache);
    await writeCacheFile(cachePath, cache);
  } finally {
    await releaseCacheLock(lockPath, lockHandle);
  }
};
var getCachedOcrPage = (pdfPath, fingerprint, page, providerHash) => {
  const cache = loadOcrCache(pdfPath);
  if (!cache) {
    return null;
  }
  if (cache.fingerprint !== fingerprint) {
    logger9.warn("PDF fingerprint mismatch, cache invalidated", {
      pdfPath,
      cached: cache.fingerprint,
      current: fingerprint
    });
    return null;
  }
  const pageKey = String(page);
  const result = cache.pages[pageKey];
  if (!result) {
    return null;
  }
  if (result.provider_hash !== providerHash) {
    logger9.debug("Provider hash mismatch for page", { page, pageKey });
    return null;
  }
  logger9.debug("Cache hit for page", { page });
  return result;
};
var setCachedOcrPage = async (pdfPath, fingerprint, page, providerHash, ocrProvider, result) => {
  await atomicCacheUpdate(pdfPath, fingerprint, ocrProvider, (cache) => {
    const pageKey = String(page);
    cache.pages[pageKey] = {
      ...result,
      provider_hash: providerHash,
      cached_at: new Date().toISOString()
    };
  });
  logger9.debug("Cached OCR result for page", { page });
};
var getCachedOcrImage = (pdfPath, fingerprint, page, imageIndex, providerHash) => {
  const cache = loadOcrCache(pdfPath);
  if (!cache) {
    return null;
  }
  if (cache.fingerprint !== fingerprint) {
    logger9.warn("PDF fingerprint mismatch, cache invalidated", {
      pdfPath,
      cached: cache.fingerprint,
      current: fingerprint
    });
    return null;
  }
  const imageKey = `${page}/${imageIndex}`;
  const result = cache.images[imageKey];
  if (!result) {
    return null;
  }
  if (result.provider_hash !== providerHash) {
    logger9.debug("Provider hash mismatch for image", { page, imageIndex });
    return null;
  }
  logger9.debug("Cache hit for image", { page, imageIndex });
  return result;
};
var setCachedOcrImage = async (pdfPath, fingerprint, page, imageIndex, providerHash, ocrProvider, result) => {
  await atomicCacheUpdate(pdfPath, fingerprint, ocrProvider, (cache) => {
    const imageKey = `${page}/${imageIndex}`;
    cache.images[imageKey] = {
      ...result,
      provider_hash: providerHash,
      cached_at: new Date().toISOString()
    };
  });
  logger9.debug("Cached OCR result for image", { page, imageIndex });
};

// src/utils/fingerprint.ts
import crypto2 from "node:crypto";
var getDocumentFingerprint = (pdfDocument, sourceDescription) => {
  const fingerprint = pdfDocument.fingerprints?.[0];
  if (fingerprint)
    return fingerprint;
  const fallback = `${sourceDescription}-${pdfDocument.numPages}`;
  return crypto2.createHash("sha256").update(fallback).digest("hex");
};

// src/utils/ocr.ts
import { Mistral } from "@mistralai/mistralai";
var DEFAULT_OCR_TIMEOUT_MS = 15000;
var DEFAULT_MISTRAL_ENDPOINT = "https://api.mistral.ai/v1/chat/completions";
var getDefaultProvider = () => {
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (mistralKey) {
    return {
      type: "mistral-ocr",
      api_key: mistralKey,
      name: "mistral-ocr-default"
    };
  }
  return {
    type: "mock",
    name: "mock-default"
  };
};
var getConfiguredProvider = () => {
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (mistralKey) {
    return {
      type: "mistral-ocr",
      api_key: mistralKey,
      name: "mistral-ocr-default"
    };
  }
  return;
};
var resolveTimeoutMs = (provider) => provider?.timeout_ms && provider.timeout_ms > 0 ? provider.timeout_ms : DEFAULT_OCR_TIMEOUT_MS;
var fetchWithTimeout = async (url, init, timeoutMs) => {
  const controller = new AbortController;
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      throw new Error(`OCR request timed out after ${timeoutMs}ms.`);
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`OCR request timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
var handleMockOcr = (provider) => ({
  provider: provider?.name ?? "mock",
  text: "OCR provider not configured. Supply provider options to enable OCR."
});
var handleHttpOcr = async (base64Image, provider) => {
  if (!provider.endpoint) {
    throw new Error("HTTP OCR provider requires an endpoint.");
  }
  const headers = {
    "Content-Type": "application/json"
  };
  if (provider.api_key) {
    headers["Authorization"] = `Bearer ${provider.api_key}`;
  }
  const response = await fetchWithTimeout(provider.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      image: base64Image,
      model: provider.model,
      language: provider.language,
      extras: provider.extras
    })
  }, resolveTimeoutMs(provider));
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OCR provider request failed with status ${response.status}: ${errorText || response.statusText}`);
  }
  const data = await response.json();
  const text4 = data.text ?? data.ocr;
  if (!text4) {
    throw new Error("OCR provider response missing text field.");
  }
  return {
    provider: provider.name ?? "http",
    text: text4
  };
};
var handleMistralOcr = async (base64Image, provider) => {
  const apiKey = provider.api_key ?? process.env["MISTRAL_API_KEY"];
  if (!apiKey) {
    throw new Error("Mistral OCR provider requires MISTRAL_API_KEY.");
  }
  const endpoint = provider.endpoint ?? DEFAULT_MISTRAL_ENDPOINT;
  const imageUrl = base64Image.startsWith("data:") ? base64Image : `data:image/png;base64,${base64Image}`;
  const prompt = (provider.extras && typeof provider.extras["prompt"] === "string" ? provider.extras["prompt"] : undefined) ?? "Extract and transcribe all text from this image. Preserve layout and return markdown.";
  const temperature = provider.extras && typeof provider.extras["temperature"] === "string" ? Number.parseFloat(provider.extras["temperature"]) : undefined;
  const maxTokens = provider.extras && typeof provider.extras["max_tokens"] === "string" ? Number.parseInt(provider.extras["max_tokens"], 10) : undefined;
  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: provider.model ?? "mistral-large-2512",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: imageUrl }
          ]
        }
      ],
      temperature: Number.isFinite(temperature) ? temperature : 0,
      max_tokens: Number.isFinite(maxTokens) ? maxTokens : 4000
    })
  }, resolveTimeoutMs(provider));
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral OCR request failed with status ${response.status}: ${errorText || response.statusText}`);
  }
  const data = await response.json();
  const content = data.text ?? data.choices?.[0]?.message?.content;
  let text4;
  if (typeof content === "string") {
    text4 = content;
  } else if (Array.isArray(content)) {
    text4 = content.map((chunk) => chunk.text).filter(Boolean).join("");
  }
  if (!text4) {
    throw new Error("Mistral OCR response missing text field.");
  }
  return {
    provider: provider.name ?? "mistral",
    text: text4
  };
};
var handleMistralOcrDedicated = async (base64Image, provider) => {
  const apiKey = provider.api_key ?? process.env["MISTRAL_API_KEY"];
  if (!apiKey) {
    throw new Error("Mistral OCR provider requires MISTRAL_API_KEY.");
  }
  const client = new Mistral({ apiKey });
  const payload = base64Image.startsWith("data:") ? base64Image.split(",")[1] ?? "" : base64Image;
  const buffer = Buffer.from(payload, "base64");
  const tableFormat = provider.extras && typeof provider.extras["tableFormat"] === "string" ? provider.extras["tableFormat"] : "markdown";
  const parseBool = (value) => {
    if (typeof value === "boolean")
      return value;
    if (typeof value === "string")
      return value.toLowerCase() === "true";
    return false;
  };
  const includeFullResponse = parseBool(provider.extras?.["includeFullResponse"]);
  const includeImageBase64 = parseBool(provider.extras?.["includeImageBase64"]);
  const extractHeader = parseBool(provider.extras?.["extractHeader"]);
  const extractFooter = parseBool(provider.extras?.["extractFooter"]);
  let uploadedId;
  try {
    const uploaded = await client.files.upload({
      file: { fileName: "page.png", content: buffer },
      purpose: "ocr"
    });
    uploadedId = uploaded.id;
    const result = await client.ocr.process({
      model: provider.model ?? "mistral-ocr-latest",
      document: { fileId: uploadedId },
      tableFormat,
      ...includeImageBase64 ? { includeImageBase64 } : {},
      ...extractHeader ? { extractHeader } : {},
      ...extractFooter ? { extractFooter } : {}
    });
    const markdown = result.pages?.[0]?.markdown;
    if (!markdown) {
      throw new Error("Mistral OCR response missing text field.");
    }
    let finalText = markdown;
    const tables = result.pages?.[0]?.tables;
    if (tables && tables.length > 0) {
      tables.forEach((table, idx) => {
        const placeholder = `[tbl-${idx}.md](tbl-${idx}.md)`;
        const tableContent = table.content || table.html || `[Table ${idx} - no content]`;
        finalText = finalText.replace(placeholder, `

${tableContent}

`);
      });
    }
    const basicResponse = {
      provider: provider.name ?? "mistral-ocr",
      text: finalText
    };
    if (includeFullResponse) {
      return {
        ...basicResponse,
        pages: result.pages,
        model: result.model,
        usage_info: result.usage_info
      };
    }
    return basicResponse;
  } finally {
    if (uploadedId) {
      try {
        await client.files.delete({ fileId: uploadedId });
      } catch {}
    }
  }
};
var performOcr = async (base64Image, provider) => {
  const resolvedProvider = provider ?? getDefaultProvider();
  if (!resolvedProvider || resolvedProvider.type === "mock") {
    return handleMockOcr(resolvedProvider);
  }
  if (resolvedProvider.type === "http") {
    return handleHttpOcr(base64Image, resolvedProvider);
  }
  if (resolvedProvider.type === "mistral") {
    return handleMistralOcr(base64Image, resolvedProvider);
  }
  if (resolvedProvider.type === "mistral-ocr") {
    return handleMistralOcrDedicated(base64Image, resolvedProvider);
  }
  throw new Error("Unsupported OCR provider configuration.");
};

// src/utils/workflow.ts
var buildInfoStageHint = () => ({
  suggestion: "Use pdf_read (Stage 1) to extract content, or pdf_search to find specific text.",
  recommended_tools: ["pdf_read", "pdf_search"]
});
var buildReadStageHint = (context) => {
  if (!context.hasText && !context.hasImages) {
    return {
      suggestion: "No text or images found. This may be a scanned page. Use pdf_ocr (Stage 3) to OCR the entire page.",
      recommended_tools: ["pdf_ocr"]
    };
  }
  if (context.hasImages && context.imageCount && context.imageCount > 0) {
    return {
      suggestion: `Found ${context.imageCount} image(s). Use pdf_extract_image (Stage 2) for diagrams/charts, or pdf_ocr (Stage 3) if images contain text.`,
      recommended_tools: ["pdf_extract_image", "pdf_ocr"]
    };
  }
  if (context.hasText) {
    return {
      suggestion: "Text extraction complete."
    };
  }
  return;
};
var buildExtractStageHint = () => ({
  suggestion: "Image extracted for vision analysis. If other images contain text, use pdf_ocr (Stage 3).",
  recommended_tools: ["pdf_ocr"]
});
var buildOcrStageHint = () => ({
  suggestion: "OCR complete. Text extracted from image."
});
var buildSearchStageHint = () => ({
  suggestion: "Search complete. Use pdf_read on relevant pages for full content.",
  recommended_tools: ["pdf_read"]
});
function buildNextStep2(context) {
  if (context.stage === "info")
    return buildInfoStageHint();
  if (context.stage === "read")
    return buildReadStageHint(context);
  if (context.stage === "extract")
    return buildExtractStageHint();
  if (context.stage === "ocr")
    return buildOcrStageHint();
  if (context.stage === "search")
    return buildSearchStageHint();
  return;
}

// src/handlers/pdfOcr.ts
var logger10 = createLogger("PdfOcr");
var SMART_OCR_MIN_TEXT_LENGTH = 50;
var SMART_OCR_MAX_TEXT_LENGTH = 1000;
var SMART_OCR_NON_ASCII_RATIO = 0.3;
var SMART_OCR_NON_ASCII_MIN_COUNT = 10;
var SMART_OCR_IMAGE_TEXT_RATIO = 0.02;
var DECISION_CACHE_MAX_ENTRIES = 500;
var decisionCache = new Map;
var buildDecisionCacheKey = (fingerprint, page) => `${fingerprint}#ocr-decision#page-${page}`;
var getCachedDecision = (fingerprint, page) => decisionCache.get(buildDecisionCacheKey(fingerprint, page));
var setCachedDecision = (fingerprint, page, decision) => {
  const key = buildDecisionCacheKey(fingerprint, page);
  decisionCache.set(key, decision);
  while (decisionCache.size > DECISION_CACHE_MAX_ENTRIES) {
    const oldestKey = decisionCache.keys().next().value;
    if (oldestKey) {
      decisionCache.delete(oldestKey);
    } else {
      break;
    }
  }
};
var extractTextFromPage = async (page) => {
  const textContent = await page.getTextContent();
  const items = textContent.items;
  return items.map((item) => item.str ?? "").join("");
};
var countImagesOnPage2 = async (page) => {
  const operatorList = await page.getOperatorList();
  const fnArray = operatorList.fnArray ?? [];
  let imageCount = 0;
  for (const op of fnArray) {
    if (op === OPS3.paintImageXObject || op === OPS3.paintXObject) {
      imageCount += 1;
    }
  }
  return imageCount;
};
var decideNeedsOcr = async (page, extractedText) => {
  const trimmedText = extractedText.trim();
  const textLength = trimmedText.length;
  if (textLength < SMART_OCR_MIN_TEXT_LENGTH) {
    return { needsOcr: true, reason: "text_too_short" };
  }
  if (textLength > SMART_OCR_MAX_TEXT_LENGTH) {
    return { needsOcr: false, reason: "text_too_long" };
  }
  const imageCount = await countImagesOnPage2(page);
  if (imageCount > 0) {
    const imageTextRatio = textLength / imageCount;
    if (imageTextRatio < SMART_OCR_IMAGE_TEXT_RATIO) {
      return { needsOcr: true, reason: "high_image_low_text_ratio" };
    }
  }
  let nonAsciiCount = 0;
  for (const char of trimmedText) {
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined && codePoint > 127)
      nonAsciiCount++;
  }
  if (nonAsciiCount >= SMART_OCR_NON_ASCII_MIN_COUNT) {
    const nonAsciiRatio = nonAsciiCount / textLength;
    if (nonAsciiRatio >= SMART_OCR_NON_ASCII_RATIO) {
      return { needsOcr: true, reason: "high_non_ascii_ratio" };
    }
  }
  return { needsOcr: false, reason: "text_extraction_sufficient" };
};
var checkInMemoryCache = (fingerprint, cacheKey, useCache, source, page, index) => {
  if (!useCache)
    return;
  const cached = getCachedOcrText(fingerprint, cacheKey);
  if (!cached)
    return;
  return {
    success: true,
    result: {
      source,
      success: true,
      data: {
        text: cached.text,
        provider: cached.provider ?? "cache",
        fingerprint,
        from_cache: true,
        ...index !== undefined ? { image: { page, index } } : { page }
      }
    }
  };
};
var checkDiskCacheForPage = (sourcePath, fingerprint, page, providerKey, providerName, cacheKey, source, useCache) => {
  if (!useCache || !sourcePath)
    return;
  const diskCached = getCachedOcrPage(sourcePath, fingerprint, page, providerKey);
  if (!diskCached)
    return;
  setCachedOcrText(fingerprint, cacheKey, {
    text: diskCached.text,
    provider: providerName
  });
  logger10.debug("Loaded OCR result from disk cache", { page, path: sourcePath });
  return {
    success: true,
    result: {
      source,
      success: true,
      data: {
        text: diskCached.text,
        provider: providerName,
        fingerprint,
        from_cache: true,
        page
      }
    }
  };
};
var checkDiskCacheForImage = (sourcePath, fingerprint, page, index, providerKey, providerName, cacheKey, source, useCache) => {
  if (!useCache || !sourcePath)
    return;
  const diskCached = getCachedOcrImage(sourcePath, fingerprint, page, index, providerKey);
  if (!diskCached)
    return;
  setCachedOcrText(fingerprint, cacheKey, {
    text: diskCached.text,
    provider: providerName
  });
  logger10.debug("Loaded OCR result from disk cache", { page, index, path: sourcePath });
  return {
    success: true,
    result: {
      source,
      success: true,
      data: {
        text: diskCached.text,
        provider: providerName,
        fingerprint,
        from_cache: true,
        image: { page, index }
      }
    }
  };
};
var handleSmartOcrDecision = async (smartOcr, fingerprint, page, source, pdfDocument) => {
  if (!smartOcr)
    return;
  const cached = getCachedDecision(fingerprint, page);
  if (cached?.needsOcr) {
    return;
  }
  const pdfPage = await pdfDocument.getPage(page);
  const pageText = await extractTextFromPage(pdfPage);
  let decision = cached;
  if (!decision) {
    decision = await decideNeedsOcr(pdfPage, pageText);
    setCachedDecision(fingerprint, page, decision);
  }
  if (!decision.needsOcr) {
    return {
      success: true,
      result: {
        source,
        success: true,
        data: {
          text: pageText,
          provider: "smart_ocr_skip",
          fingerprint,
          from_cache: cached !== undefined,
          page,
          reason: decision.reason
        }
      }
    };
  }
  return;
};
var executePageOcrAndCache = async (pdfDocument, page, scale, provider, fingerprint, cacheKey, providerKey, sourcePath, source) => {
  const { data: imageData } = await renderPageToPng(pdfDocument, page, scale ?? 1);
  const ocr = await performOcr(imageData, provider);
  setCachedOcrText(fingerprint, cacheKey, { text: ocr.text, provider: ocr.provider });
  if (sourcePath) {
    try {
      await setCachedOcrPage(sourcePath, fingerprint, page, providerKey, provider.name ?? "unknown", {
        text: ocr.text,
        provider_hash: providerKey,
        cached_at: new Date().toISOString()
      });
      logger10.debug("Saved OCR result to disk cache", { page, path: sourcePath });
    } catch (cacheError) {
      logger10.warn("Failed to persist OCR cache (continuing without cache)", {
        page,
        path: sourcePath,
        error: cacheError instanceof Error ? cacheError.message : String(cacheError)
      });
    }
  }
  return {
    success: true,
    result: {
      source,
      success: true,
      data: {
        ...ocr,
        fingerprint,
        from_cache: false,
        page
      }
    }
  };
};
var performPageOcr = async (source, sourceDescription, page, provider, scale, smartOcr, useCache, pdfDocument) => {
  const fingerprint = getDocumentFingerprint(pdfDocument, sourceDescription);
  const providerKey = buildOcrProviderKey(provider);
  const cacheKey = `page-${page}#scale-${scale ?? 1}#provider-${providerKey}`;
  if (!provider) {
    logger10.info("No OCR provider configured, returning rendered page image", { page });
    const { data: imageData } = await renderPageToPng(pdfDocument, page, scale ?? 1);
    return {
      success: false,
      imageData,
      metadata: {
        page,
        scale: scale ?? 1,
        message: "No OCR provider configured. Returning rendered page image for Vision analysis.",
        recommendation: "Configure MISTRAL_API_KEY environment variable to enable OCR, or analyze this image with your Vision capabilities."
      }
    };
  }
  const smartOcrResult = await handleSmartOcrDecision(smartOcr, fingerprint, page, sourceDescription, pdfDocument);
  if (smartOcrResult)
    return smartOcrResult;
  const memoryCached = checkInMemoryCache(fingerprint, cacheKey, useCache, sourceDescription, page);
  if (memoryCached)
    return memoryCached;
  const diskCached = checkDiskCacheForPage(source.path, fingerprint, page, providerKey, provider.name ?? "unknown", cacheKey, sourceDescription, useCache);
  if (diskCached)
    return diskCached;
  return executePageOcrAndCache(pdfDocument, page, scale, provider, fingerprint, cacheKey, providerKey, source.path, sourceDescription);
};
var performImageOcr = async (source, sourceDescription, page, index, provider, useCache, pdfDocument) => {
  const fingerprint = getDocumentFingerprint(pdfDocument, sourceDescription);
  const providerKey = buildOcrProviderKey(provider);
  const cacheKey = `image-${page}-${index}#provider-${providerKey}`;
  const { images } = await extractImages(pdfDocument, [page]);
  const target = images.find((img) => img.page === page && img.index === index);
  if (!target) {
    throw new Error(`Image with index ${index} not found on page ${page}.`);
  }
  if (!provider) {
    logger10.info("No OCR provider configured, returning extracted image", { page, index });
    return {
      success: false,
      imageData: target.data,
      metadata: {
        page,
        index,
        width: target.width,
        height: target.height,
        format: target.format,
        message: "No OCR provider configured. Returning extracted image for Vision analysis.",
        recommendation: "Configure MISTRAL_API_KEY environment variable to enable OCR, or analyze this image with your Vision capabilities."
      }
    };
  }
  const memoryCached = checkInMemoryCache(fingerprint, cacheKey, useCache, sourceDescription, page, index);
  if (memoryCached)
    return memoryCached;
  const diskCached = checkDiskCacheForImage(source.path, fingerprint, page, index, providerKey, provider.name ?? "unknown", cacheKey, sourceDescription, useCache);
  if (diskCached)
    return diskCached;
  const ocr = await performOcr(target.data, provider);
  setCachedOcrText(fingerprint, cacheKey, { text: ocr.text, provider: ocr.provider });
  if (source.path) {
    try {
      await setCachedOcrImage(source.path, fingerprint, page, index, providerKey, provider.name ?? "unknown", {
        text: ocr.text,
        provider_hash: providerKey,
        cached_at: new Date().toISOString()
      });
      logger10.debug("Saved OCR result to disk cache", { page, index, path: source.path });
    } catch (cacheError) {
      logger10.warn("Failed to persist OCR cache (continuing without cache)", {
        page,
        index,
        path: source.path,
        error: cacheError instanceof Error ? cacheError.message : String(cacheError)
      });
    }
  }
  return {
    success: true,
    result: {
      source: sourceDescription,
      success: true,
      data: {
        ...ocr,
        fingerprint,
        from_cache: false,
        image: { page, index }
      }
    }
  };
};
var pdfOcr = tool4().description(`STAGE 3: OCR for text in images

` + `Use AFTER Stage 1 (pdf_read) and Stage 2 (pdf_extract_image) when:
` + `- Images contain text that Vision cannot read clearly
` + `- You need machine-readable text from scanned pages

` + `AUTO-FALLBACK: If no OCR provider is configured via MISTRAL_API_KEY environment variable, returns base64 image for your Vision analysis instead of erroring.

` + `Two modes:
` + `1. Page OCR: Omit "index" to OCR entire rendered page
` + `2. Image OCR: Provide "index" to OCR specific image from page

` + `Configuration: Set MISTRAL_API_KEY environment variable to enable OCR.

` + `Example:
` + `  pdf_ocr({source: {path: "doc.pdf"}, page: 5})  // Full page
` + '  pdf_ocr({source: {path: "doc.pdf"}, page: 5, index: 0})  // Specific image').input(pdfOcrArgsSchema).handler(async ({ input }) => {
  const { source, page, index, scale, cache, smart_ocr } = input;
  const sourceDescription = source.path ?? source.url ?? "unknown source";
  const sourceArgs = {
    ...source.path ? { path: source.path } : {},
    ...source.url ? { url: source.url } : {}
  };
  try {
    const configuredProvider = getConfiguredProvider();
    const result = await withPdfDocument(sourceArgs, sourceDescription, async (pdfDocument) => {
      const totalPages = pdfDocument.numPages;
      if (page < 1 || page > totalPages) {
        throw new Error(`Requested page ${page} is out of bounds (1-${totalPages}).`);
      }
      if (index !== undefined) {
        return performImageOcr(sourceArgs, sourceDescription, page, index, configuredProvider, cache !== false, pdfDocument);
      }
      return performPageOcr(sourceArgs, sourceDescription, page, configuredProvider, scale, smart_ocr ?? false, cache !== false, pdfDocument);
    });
    if (!result.success) {
      const nextStep2 = buildNextStep2({ stage: "ocr" });
      return [
        text4(JSON.stringify({ ...result.metadata, next_step: nextStep2 }, null, 2)),
        image2(result.imageData, "image/png")
      ];
    }
    const nextStep = buildNextStep2({ stage: "ocr" });
    return [text4(JSON.stringify({ ...result.result, next_step: nextStep }, null, 2))];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger10.error("Failed to perform OCR", { sourceDescription, page, index, error: message });
    return toolError4(`Failed to perform OCR on ${sourceDescription}. Reason: ${message}`);
  }
});

// src/handlers/pdfRead.ts
import { text as text5, tool as tool5, toolError as toolError5 } from "@sylphx/mcp-server-sdk";

// src/pdf/tableDetection.ts
var detectTables = (items) => {
  const tables = [];
  const textItems = items.filter((item) => item.type === "text" && item.xPosition !== undefined);
  if (textItems.length < 9) {
    return tables;
  }
  let startIndex = 0;
  while (startIndex < textItems.length) {
    const tableCandidate = analyzeTableCandidate(textItems, startIndex);
    if (tableCandidate) {
      const originalStartIndex = items.indexOf(textItems[startIndex]);
      const originalEndIndex = items.indexOf(textItems[tableCandidate.endIndex]);
      tables.push({
        startIndex: originalStartIndex,
        endIndex: originalEndIndex,
        cols: tableCandidate.cols,
        rows: tableCandidate.rows
      });
      startIndex = tableCandidate.endIndex + 1;
    } else {
      startIndex++;
    }
  }
  return tables;
};
var analyzeTableCandidate = (items, startIndex) => {
  const MIN_COLUMNS = 3;
  const MIN_ROWS = 3;
  const MAX_ITEMS_TO_CHECK = 50;
  const MIN_TOLERANCE = 10;
  const MAX_TOLERANCE = 50;
  const checkRange = Math.min(items.length - startIndex, MAX_ITEMS_TO_CHECK);
  if (checkRange < MIN_COLUMNS * MIN_ROWS) {
    return null;
  }
  const itemsInRange = items.slice(startIndex, startIndex + checkRange);
  const avgFontSize = calculateAverageFontSize(itemsInRange);
  const estimatedPageWidth = estimatePageWidth(itemsInRange);
  const fontBasedTolerance = avgFontSize * 0.5;
  const pageWidthTolerance = estimatedPageWidth ? estimatedPageWidth * 0.05 : 0;
  const COLUMN_TOLERANCE = clamp(Math.max(fontBasedTolerance, pageWidthTolerance), MIN_TOLERANCE, MAX_TOLERANCE);
  const xPositions = [];
  for (const item of itemsInRange) {
    const x = item.xPosition;
    if (x !== undefined) {
      xPositions.push(x);
    }
  }
  const columnPositions = clusterXPositions(xPositions, COLUMN_TOLERANCE);
  if (columnPositions.length < MIN_COLUMNS) {
    return null;
  }
  const rowsByY = new Map;
  for (const item of itemsInRange) {
    if (item.xPosition === undefined)
      continue;
    const columnIndex = findColumnIndex(item.xPosition, columnPositions, COLUMN_TOLERANCE);
    if (columnIndex === -1)
      continue;
    const y = item.yPosition;
    if (!rowsByY.has(y)) {
      rowsByY.set(y, []);
    }
    rowsByY.get(y)?.push(columnIndex);
  }
  const validRows = Array.from(rowsByY.values()).filter((cols) => cols.length >= MIN_COLUMNS - 1);
  if (validRows.length < MIN_ROWS) {
    return null;
  }
  const tableYPositions = Array.from(rowsByY.keys()).slice(0, validRows.length);
  const lastY = tableYPositions[tableYPositions.length - 1];
  if (lastY === undefined)
    return null;
  const endIndex = itemsInRange.findIndex((item) => item.yPosition < (lastY ?? 0));
  const actualEndIndex = endIndex === -1 ? startIndex + checkRange - 1 : startIndex + endIndex - 1;
  return {
    endIndex: actualEndIndex,
    cols: columnPositions.length,
    rows: validRows.length
  };
};
var calculateAverageFontSize = (items) => {
  const fontSizes = items.map((item) => item.fontSize).filter((value) => typeof value === "number" && value > 0);
  if (fontSizes.length > 0) {
    return fontSizes.reduce((sum, value) => sum + value, 0) / fontSizes.length;
  }
  const averageCharWidth = estimateAverageCharacterWidth(items);
  if (averageCharWidth > 0) {
    return averageCharWidth / 0.5;
  }
  return 12;
};
var estimateAverageCharacterWidth = (items) => {
  const rows = new Map;
  for (const item of items) {
    if (item.type !== "text" || item.xPosition === undefined || !item.textContent) {
      continue;
    }
    if (!rows.has(item.yPosition)) {
      rows.set(item.yPosition, []);
    }
    rows.get(item.yPosition)?.push(item);
  }
  const widthSamples = [];
  for (const rowItems of rows.values()) {
    rowItems.sort((a, b) => (a.xPosition ?? 0) - (b.xPosition ?? 0));
    for (let i = 0;i < rowItems.length - 1; i++) {
      const current = rowItems[i];
      const next = rowItems[i + 1];
      if (!current || !next || current.xPosition === undefined || next.xPosition === undefined) {
        continue;
      }
      const textLength = current.textContent?.length ?? 0;
      if (textLength === 0)
        continue;
      const deltaX = next.xPosition - current.xPosition;
      if (deltaX <= 0)
        continue;
      widthSamples.push(deltaX / textLength);
    }
  }
  if (widthSamples.length === 0) {
    return 0;
  }
  return widthSamples.reduce((sum, value) => sum + value, 0) / widthSamples.length;
};
var estimatePageWidth = (items) => {
  const xPositions = items.map((item) => item.xPosition).filter((value) => typeof value === "number");
  if (xPositions.length < 2)
    return null;
  const minX = Math.min(...xPositions);
  const maxX = Math.max(...xPositions);
  const width = maxX - minX;
  return width > 0 ? width : null;
};
var clamp = (value, min2, max) => Math.max(min2, Math.min(max, value));
var clusterXPositions = (xPositions, tolerance) => {
  if (xPositions.length === 0)
    return [];
  const sorted = [...xPositions].sort((a, b) => a - b);
  const clusters = [sorted[0]];
  for (const x of sorted) {
    const lastCluster = clusters[clusters.length - 1];
    if (lastCluster === undefined)
      continue;
    if (x - lastCluster > tolerance) {
      clusters.push(x);
    }
  }
  return clusters;
};
var findColumnIndex = (x, columnPositions, tolerance) => {
  for (let i = 0;i < columnPositions.length; i++) {
    const col = columnPositions[i];
    if (col !== undefined && Math.abs(x - col) <= tolerance) {
      return i;
    }
  }
  return -1;
};

// src/pdf/text.ts
var normalizeLine = (input, options) => {
  const { preserveWhitespace = false, trimLines = true } = options;
  let normalized = preserveWhitespace ? input : input.replace(/\s+/g, " ");
  if (trimLines) {
    normalized = normalized.trim();
  }
  return normalized;
};
var buildNormalizedPageText = (items, options) => {
  const {
    preserveWhitespace = false,
    trimLines = true,
    maxCharsPerPage,
    insertMarkers = false
  } = options;
  const normalizedLines = [];
  let truncated = false;
  let consumed = 0;
  const itemsToProcess = insertMarkers ? items : items.filter((item) => item.type === "text");
  const tableRegions = insertMarkers ? detectTables(items) : [];
  const tableStartIndices = new Set(tableRegions.map((t) => t.startIndex));
  const tableInfo = new Map(tableRegions.map((t) => [t.startIndex, { cols: t.cols, rows: t.rows }]));
  for (let i = 0;i < itemsToProcess.length; i++) {
    const item = itemsToProcess[i];
    if (!item)
      continue;
    const originalIndex = items.indexOf(item);
    if (insertMarkers && tableStartIndices.has(originalIndex)) {
      const info = tableInfo.get(originalIndex);
      if (info) {
        const tableMarker = `[TABLE DETECTED: ${info.cols} cols × ${info.rows} rows]`;
        if (normalizedLines.length > 0) {
          normalizedLines.push("");
        }
        normalizedLines.push(tableMarker);
        normalizedLines.push("");
      }
    }
    let lineToAdd = "";
    if (item.type === "text" && item.textContent) {
      const content = item.textContent ?? "";
      const normalized = normalizeLine(content, { preserveWhitespace, trimLines });
      if (!normalized) {
        continue;
      }
      lineToAdd = normalized;
    } else if (item.type === "image" && insertMarkers && item.imageData) {
      const { index, width, height, format } = item.imageData;
      lineToAdd = `[IMAGE ${index}: ${width}x${height}px${format ? `, ${format}` : ""}]`;
      if (normalizedLines.length > 0) {
        normalizedLines.push("");
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
      if (item.type === "image" && insertMarkers) {
        normalizedLines.push("");
      }
    }
  }
  const text5 = normalizedLines.join(`
`);
  if (maxCharsPerPage !== undefined && consumed > maxCharsPerPage) {
    truncated = true;
  }
  return { lines: normalizedLines, text: text5, truncated };
};

// src/schemas/pdfRead.ts
import {
  array as array3,
  bool as bool2,
  description as description6,
  gte as gte4,
  int as int4,
  num as num4,
  object as object6,
  optional as optional5
} from "@sylphx/vex";
var pdfReadArgsSchema = object6({
  sources: array3(pdfSourceSchema),
  include_image_indexes: optional5(bool2(description6("Include image indexes for each page (no image data is returned)."))),
  insert_markers: optional5(bool2(description6("Insert [IMAGE] and [TABLE] markers inline with text at their approximate positions. " + "Helps identify pages with complex content that may need OCR."))),
  max_chars_per_page: optional5(num4(int4, gte4(1), description6("Maximum characters to return per page before truncating."))),
  preserve_whitespace: optional5(bool2(description6("Preserve original whitespace from the PDF."))),
  trim_lines: optional5(bool2(description6("Trim leading/trailing whitespace for each text line."))),
  allow_full_document: optional5(bool2(description6("When true, allows reading the entire document if no pages are specified. When false, only a small sample of pages will be processed.")))
});

// src/handlers/pdfRead.ts
var logger11 = createLogger("PdfRead");
var processPage = async (pdfDocument, pageNum, sourceDescription, options, fingerprint, pageLabel) => {
  const cached = getCachedPageText(fingerprint, pageNum, options);
  if (cached) {
    return cached;
  }
  const shouldIncludeImages = options.includeImageIndexes || options.insertMarkers;
  const { items } = await extractPageContent(pdfDocument, pageNum, shouldIncludeImages, sourceDescription);
  const normalized = buildNormalizedPageText(items, {
    preserveWhitespace: options.preserveWhitespace,
    trimLines: options.trimLines,
    insertMarkers: options.insertMarkers,
    ...options.maxCharsPerPage !== undefined ? { maxCharsPerPage: options.maxCharsPerPage } : {}
  });
  const pageEntry = {
    page_number: pageNum,
    page_index: pageNum - 1,
    page_label: pageLabel ?? null,
    lines: normalized.lines,
    text: normalized.text
  };
  if (normalized.truncated) {
    pageEntry.truncated = true;
  }
  if (options.includeImageIndexes) {
    const imageIndexes = items.filter((item) => item.type === "image" && item.imageData).map((item) => item.imageData?.index).filter((value) => value !== undefined);
    if (imageIndexes.length > 0) {
      pageEntry.image_indexes = imageIndexes;
    }
  }
  setCachedPageText(fingerprint, pageNum, options, pageEntry);
  return pageEntry;
};
var getPageLabelsSafe = async (pdfDocument, sourceDescription) => {
  try {
    return await pdfDocument.getPageLabels();
  } catch (labelError) {
    const message = labelError instanceof Error ? labelError.message : String(labelError);
    logger11.warn("Error retrieving page labels", { sourceDescription, error: message });
  }
  return null;
};
var collectPages = async (pdfDocument, pagesToProcess, pageLabels, sourceDescription, options, fingerprint) => {
  const pages = [];
  const truncatedPages = [];
  for (const pageNum of pagesToProcess) {
    const label = pageLabels?.[pageNum - 1] ?? null;
    const pageData = await processPage(pdfDocument, pageNum, sourceDescription, options, fingerprint, label);
    if (pageData.truncated) {
      truncatedPages.push(pageNum);
    }
    pages.push(pageData);
  }
  return { pages, truncatedPages };
};
var destroyPdfDocument = async (pdfDocument, sourceDescription) => {
  if (!pdfDocument || typeof pdfDocument.destroy !== "function") {
    return;
  }
  try {
    await pdfDocument.destroy();
  } catch (destroyError) {
    const message = destroyError instanceof Error ? destroyError.message : String(destroyError);
    logger11.warn("Error destroying PDF document", { sourceDescription, error: message });
  }
};
var processSourcePages = async (source, sourceDescription, options, allowFullDocument) => {
  let pdfDocument = null;
  let result = { source: sourceDescription, success: false };
  try {
    const targetPages = getTargetPages(source.pages, sourceDescription);
    const loadArgs = {
      ...source.path ? { path: source.path } : {},
      ...source.url ? { url: source.url } : {}
    };
    pdfDocument = await loadPdfDocument(loadArgs, sourceDescription);
    const totalPages = pdfDocument.numPages;
    const fingerprint = getDocumentFingerprint(pdfDocument, sourceDescription);
    const { pagesToProcess, invalidPages, guardWarning, rangeWarnings } = determinePagesToProcess(targetPages, totalPages, true, {
      allowFullDocument,
      samplePageLimit: DEFAULT_SAMPLE_PAGE_LIMIT
    });
    const pageLabels = await getPageLabelsSafe(pdfDocument, sourceDescription);
    const { pages, truncatedPages } = await collectPages(pdfDocument, pagesToProcess, pageLabels, sourceDescription, options, fingerprint);
    const warnings = [
      ...rangeWarnings ?? [],
      ...buildWarnings(invalidPages, totalPages),
      ...guardWarning ? [guardWarning] : []
    ];
    result = {
      source: sourceDescription,
      success: true,
      data: {
        pages,
        ...warnings.length > 0 ? { warnings } : {},
        ...truncatedPages.length > 0 ? { truncated_pages: truncatedPages } : {}
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result = {
      source: sourceDescription,
      success: false,
      error: `Failed to read pages from ${sourceDescription}. Reason: ${message}`
    };
  } finally {
    await destroyPdfDocument(pdfDocument, sourceDescription);
  }
  return result;
};
var pdfRead = tool5().description(`STAGE 1: Extract text from PDF pages

` + `ALWAYS USE THIS FIRST before other tools.

` + "Returns structured text with line-by-line content. Use insert_markers=true to see where [IMAGE] and [TABLE] markers appear - " + `if you see these markers, you may need Stage 2 (pdf_extract_image) or Stage 3 (pdf_ocr) for those specific elements.

` + `Example:
` + '  pdf_read({sources: [{path: "doc.pdf", pages: "1-5"}], insert_markers: true})').input(pdfReadArgsSchema).handler(async ({ input }) => {
  const {
    sources,
    include_image_indexes,
    insert_markers,
    max_chars_per_page,
    preserve_whitespace,
    trim_lines,
    allow_full_document
  } = input;
  const options = {
    includeImageIndexes: include_image_indexes ?? false,
    insertMarkers: insert_markers ?? false,
    preserveWhitespace: preserve_whitespace ?? false,
    trimLines: trim_lines ?? true,
    ...max_chars_per_page !== undefined ? { maxCharsPerPage: max_chars_per_page } : {}
  };
  const MAX_CONCURRENT_SOURCES = 3;
  const results = [];
  for (let i = 0;i < sources.length; i += MAX_CONCURRENT_SOURCES) {
    const batch = sources.slice(i, i + MAX_CONCURRENT_SOURCES);
    const batchResults = await Promise.all(batch.map((source) => {
      const sourceDescription = source.path ?? source.url ?? "unknown source";
      return processSourcePages(source, sourceDescription, options, allow_full_document ?? false);
    }));
    results.push(...batchResults);
  }
  if (results.every((r) => !r.success)) {
    const errors = results.map((r) => r.error).join("; ");
    return toolError5(`All sources failed to return page content: ${errors}`);
  }
  return [text5(JSON.stringify({ results }, null, 2))];
});

// src/handlers/pdfVision.ts
import { image as image3, text as text6, tool as tool6, toolError as toolError6 } from "@sylphx/mcp-server-sdk";

// src/schemas/pdfVision.ts
import { bool as bool3, description as description7, gte as gte5, int as int5, num as num5, object as object7, optional as optional6 } from "@sylphx/vex";
var pdfVisionArgsSchema = object7({
  source: pdfSourceSchema,
  page: num5(int5, gte5(1), description7("1-based page number.")),
  index: optional6(num5(int5, gte5(0), description7("0-based image index within the page. If provided, Vision will analyze the specific image. If omitted, Vision will analyze the entire rendered page."))),
  cache: optional6(bool3(description7("Use cached Vision result when available. Defaults to true.")))
});

// src/handlers/pdfVision.ts
var logger12 = createLogger("PdfVision");
var DEFAULT_VISION_SCALE = 1.5;
var getConfiguredVisionProvider = () => {
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (mistralKey) {
    return {
      type: "mistral",
      api_key: mistralKey,
      name: "mistral-vision-default"
    };
  }
  return;
};
var checkInMemoryCache2 = (fingerprint, cacheKey, useCache, source, page, index) => {
  if (!useCache)
    return;
  const cached = getCachedOcrText(fingerprint, cacheKey);
  if (!cached)
    return;
  return {
    success: true,
    result: {
      source,
      success: true,
      data: {
        text: cached.text,
        provider: cached.provider ?? "cache",
        fingerprint,
        from_cache: true,
        ...index !== undefined ? { image: { page, index } } : { page }
      }
    }
  };
};
var checkDiskCacheForPage2 = (sourcePath, fingerprint, page, providerKey, providerName, cacheKey, source, useCache) => {
  if (!useCache || !sourcePath)
    return;
  const diskCached = getCachedOcrPage(sourcePath, fingerprint, page, providerKey);
  if (!diskCached)
    return;
  setCachedOcrText(fingerprint, cacheKey, {
    text: diskCached.text,
    provider: providerName
  });
  logger12.debug("Loaded Vision result from disk cache", { page, path: sourcePath });
  return {
    success: true,
    result: {
      source,
      success: true,
      data: {
        text: diskCached.text,
        provider: providerName,
        fingerprint,
        from_cache: true,
        page
      }
    }
  };
};
var checkDiskCacheForImage2 = (sourcePath, fingerprint, page, index, providerKey, providerName, cacheKey, source, useCache) => {
  if (!useCache || !sourcePath)
    return;
  const diskCached = getCachedOcrImage(sourcePath, fingerprint, page, index, providerKey);
  if (!diskCached)
    return;
  setCachedOcrText(fingerprint, cacheKey, {
    text: diskCached.text,
    provider: providerName
  });
  logger12.debug("Loaded Vision result from disk cache", { page, index, path: sourcePath });
  return {
    success: true,
    result: {
      source,
      success: true,
      data: {
        text: diskCached.text,
        provider: providerName,
        fingerprint,
        from_cache: true,
        image: { page, index }
      }
    }
  };
};
var executePageVisionAndCache = async (pdfDocument, page, provider, fingerprint, cacheKey, providerKey, sourcePath, source) => {
  const { data: imageData } = await renderPageToPng(pdfDocument, page, DEFAULT_VISION_SCALE);
  const visionResult = await performOcr(imageData, provider);
  setCachedOcrText(fingerprint, cacheKey, {
    text: visionResult.text,
    provider: visionResult.provider
  });
  if (sourcePath) {
    try {
      await setCachedOcrPage(sourcePath, fingerprint, page, providerKey, provider.name ?? "unknown", {
        text: visionResult.text,
        provider_hash: providerKey,
        cached_at: new Date().toISOString()
      });
      logger12.debug("Saved Vision result to disk cache", { page, path: sourcePath });
    } catch (cacheError) {
      logger12.warn("Failed to persist Vision cache (continuing without cache)", {
        page,
        path: sourcePath,
        error: cacheError instanceof Error ? cacheError.message : String(cacheError)
      });
    }
  }
  return {
    success: true,
    result: {
      source,
      success: true,
      data: {
        ...visionResult,
        fingerprint,
        from_cache: false,
        page
      }
    }
  };
};
var performPageVision = async (source, sourceDescription, page, provider, useCache, pdfDocument) => {
  const fingerprint = getDocumentFingerprint(pdfDocument, sourceDescription);
  const providerKey = buildOcrProviderKey(provider);
  const cacheKey = `page-${page}#vision#provider-${providerKey}`;
  if (!provider) {
    logger12.info("No Vision provider configured, returning rendered page image", { page });
    const { data: imageData } = await renderPageToPng(pdfDocument, page, DEFAULT_VISION_SCALE);
    return {
      success: false,
      imageData,
      metadata: {
        page,
        scale: DEFAULT_VISION_SCALE,
        message: "No Vision provider configured. Returning rendered page image for analysis.",
        recommendation: "Configure MISTRAL_API_KEY environment variable to enable Mistral Vision API, or analyze this image with Claude Vision."
      }
    };
  }
  const memoryCached = checkInMemoryCache2(fingerprint, cacheKey, useCache, sourceDescription, page);
  if (memoryCached)
    return memoryCached;
  const diskCached = checkDiskCacheForPage2(source.path, fingerprint, page, providerKey, provider.name ?? "unknown", cacheKey, sourceDescription, useCache);
  if (diskCached)
    return diskCached;
  return executePageVisionAndCache(pdfDocument, page, provider, fingerprint, cacheKey, providerKey, source.path, sourceDescription);
};
var performImageVision = async (source, sourceDescription, page, index, provider, useCache, pdfDocument) => {
  const fingerprint = getDocumentFingerprint(pdfDocument, sourceDescription);
  const providerKey = buildOcrProviderKey(provider);
  const cacheKey = `image-${page}-${index}#vision#provider-${providerKey}`;
  const { images } = await extractImages(pdfDocument, [page]);
  const target = images.find((img) => img.page === page && img.index === index);
  if (!target) {
    throw new Error(`Image with index ${index} not found on page ${page}.`);
  }
  if (!provider) {
    logger12.info("No Vision provider configured, returning extracted image", { page, index });
    return {
      success: false,
      imageData: target.data,
      metadata: {
        page,
        index,
        width: target.width,
        height: target.height,
        format: target.format,
        message: "No Vision provider configured. Returning extracted image for analysis.",
        recommendation: "Configure MISTRAL_API_KEY environment variable to enable Mistral Vision API, or analyze this image with Claude Vision."
      }
    };
  }
  const memoryCached = checkInMemoryCache2(fingerprint, cacheKey, useCache, sourceDescription, page, index);
  if (memoryCached)
    return memoryCached;
  const diskCached = checkDiskCacheForImage2(source.path, fingerprint, page, index, providerKey, provider.name ?? "unknown", cacheKey, sourceDescription, useCache);
  if (diskCached)
    return diskCached;
  const visionResult = await performOcr(target.data, provider);
  setCachedOcrText(fingerprint, cacheKey, {
    text: visionResult.text,
    provider: visionResult.provider
  });
  if (source.path) {
    try {
      await setCachedOcrImage(source.path, fingerprint, page, index, providerKey, provider.name ?? "unknown", {
        text: visionResult.text,
        provider_hash: providerKey,
        cached_at: new Date().toISOString()
      });
      logger12.debug("Saved Vision result to disk cache", { page, index, path: source.path });
    } catch (cacheError) {
      logger12.warn("Failed to persist Vision cache (continuing without cache)", {
        page,
        index,
        path: source.path,
        error: cacheError instanceof Error ? cacheError.message : String(cacheError)
      });
    }
  }
  return {
    success: true,
    result: {
      source: sourceDescription,
      success: true,
      data: {
        ...visionResult,
        fingerprint,
        from_cache: false,
        image: { page, index }
      }
    }
  };
};
var pdfVision = tool6().description(`Analyze diagrams, charts, and technical illustrations using Mistral Vision API

` + `Use this for:
` + `- Technical diagrams (timing diagrams, circuit diagrams, flowcharts)
` + `- Charts and graphs
` + `- Illustrations and visual content

` + `AUTO-FALLBACK: If no MISTRAL_API_KEY is configured, returns base64 image for Claude Vision analysis.

` + `Two modes:
` + `1. Page Vision: Omit "index" to analyze entire rendered page
` + `2. Image Vision: Provide "index" to analyze specific image from page

` + `Configuration: Set MISTRAL_API_KEY environment variable to enable Mistral Vision.

` + `Example:
` + `  pdf_vision({source: {path: "doc.pdf"}, page: 5})  // Full page
` + '  pdf_vision({source: {path: "doc.pdf"}, page: 5, index: 0})  // Specific image').input(pdfVisionArgsSchema).handler(async ({ input }) => {
  const { source, page, index, cache } = input;
  const sourceDescription = source.path ?? source.url ?? "unknown source";
  const sourceArgs = {
    ...source.path ? { path: source.path } : {},
    ...source.url ? { url: source.url } : {}
  };
  try {
    const configuredProvider = getConfiguredVisionProvider();
    const result = await withPdfDocument(sourceArgs, sourceDescription, async (pdfDocument) => {
      const totalPages = pdfDocument.numPages;
      if (page < 1 || page > totalPages) {
        throw new Error(`Requested page ${page} is out of bounds (1-${totalPages}).`);
      }
      if (index !== undefined) {
        return performImageVision(sourceArgs, sourceDescription, page, index, configuredProvider, cache !== false, pdfDocument);
      }
      return performPageVision(sourceArgs, sourceDescription, page, configuredProvider, cache !== false, pdfDocument);
    });
    if (!result.success) {
      const nextStep2 = buildNextStep2({ stage: "vision" });
      return [
        text6(JSON.stringify({ ...result.metadata, next_step: nextStep2 }, null, 2)),
        image3(result.imageData, "image/png")
      ];
    }
    const nextStep = buildNextStep2({ stage: "vision" });
    return [text6(JSON.stringify({ ...result.result, next_step: nextStep }, null, 2))];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger12.error("Failed to perform Vision analysis", {
      sourceDescription,
      page,
      index,
      error: message
    });
    return toolError6(`Failed to perform Vision analysis on ${sourceDescription}. Reason: ${message}`);
  }
});

// src/handlers/searchPdf.ts
import { text as text7, tool as tool7, toolError as toolError7 } from "@sylphx/mcp-server-sdk";
import RE2 from "re2";

// src/schemas/pdfSearch.ts
import {
  array as array4,
  bool as bool4,
  description as description8,
  gte as gte6,
  int as int6,
  min as min2,
  num as num6,
  object as object8,
  optional as optional7,
  str as str4
} from "@sylphx/vex";
var pdfSearchArgsSchema = object8({
  sources: array4(pdfSourceSchema),
  query: str4(min2(1), description8("Plain text or regular expression to search for within pages.")),
  use_regex: optional7(bool4(description8("Treat the query as a regular expression."))),
  case_sensitive: optional7(bool4(description8("Enable case sensitive matching."))),
  context_chars: optional7(num6(int6, gte6(0), description8("Number of characters to include before/after each match."))),
  max_hits: optional7(num6(int6, gte6(1), description8("Maximum number of matches to return across all pages."))),
  max_chars_per_page: optional7(num6(int6, gte6(1), description8("Truncate each page before searching to control payload size."))),
  preserve_whitespace: optional7(bool4(description8("Preserve original whitespace when building text."))),
  trim_lines: optional7(bool4(description8("Trim leading/trailing whitespace for each text line."))),
  allow_full_document: optional7(bool4(description8("When true, allows searching the entire document if no pages are specified. When false, only a small sample of pages will be processed.")))
});

// src/handlers/searchPdf.ts
var logger13 = createLogger("PdfSearch");
var findPlainMatches = (textToSearch, query, options, remaining) => {
  const matches = [];
  const haystack = options.caseSensitive ? textToSearch : textToSearch.toLowerCase();
  const needle = options.caseSensitive ? query : query.toLowerCase();
  let startIndex = 0;
  while (matches.length < remaining) {
    const idx = haystack.indexOf(needle, startIndex);
    if (idx === -1)
      break;
    matches.push({ match: textToSearch.slice(idx, idx + query.length), index: idx });
    startIndex = idx + query.length;
  }
  return matches;
};
var findRegexMatches = (textToSearch, query, options, remaining) => {
  const flags = options.caseSensitive ? "g" : "gi";
  const matches = [];
  const MAX_REGEX_TEXT_LENGTH = 1e6;
  const textForSearch = textToSearch.slice(0, MAX_REGEX_TEXT_LENGTH);
  const wasTextTruncated = textToSearch.length > MAX_REGEX_TEXT_LENGTH;
  let regex;
  let usingRE2 = false;
  try {
    regex = new RE2(query, flags);
    usingRE2 = true;
    logger13.debug("Using RE2 for safe regex search", { pattern: query });
  } catch (re2Error) {
    logger13.warn("RE2 does not support this pattern, falling back to native RegExp", {
      pattern: query,
      error: re2Error instanceof Error ? re2Error.message : String(re2Error)
    });
    if (query.length > 50) {
      throw new Error("Complex regex patterns not supported by RE2 are limited to 50 characters for safety");
    }
    regex = new RegExp(query, flags);
  }
  const REGEX_TIMEOUT_MS = 5000;
  const deadline = Date.now() + REGEX_TIMEOUT_MS;
  let iterationCount = 0;
  let match = regex.exec(textForSearch);
  while (match !== null && matches.length < remaining) {
    if (!usingRE2 && ++iterationCount % 100 === 0 && Date.now() > deadline) {
      logger13.warn("Regex search exceeded timeout, stopping early", {
        matchesFound: matches.length,
        pattern: query
      });
      break;
    }
    const matchText = match[0];
    const index = match.index;
    matches.push({ match: matchText, index });
    if (matchText.length === 0) {
      regex.lastIndex += 1;
    }
    match = regex.exec(textForSearch);
  }
  if (wasTextTruncated && matches.length === 0) {
    logger13.info("Regex search on truncated text (1MB limit)", { pattern: query });
  }
  return matches;
};
var buildContextSegments = (textContent, index, length, contextChars) => {
  const beforeStart = Math.max(0, index - contextChars);
  const before = textContent.slice(beforeStart, index);
  const afterEnd = Math.min(textContent.length, index + length + contextChars);
  const after = textContent.slice(index + length, afterEnd);
  return {
    context_before: before,
    context_after: after
  };
};
var getPageLabelsSafe2 = async (pdfDocument, sourceDescription) => {
  try {
    return await pdfDocument.getPageLabels();
  } catch (labelError) {
    const message = labelError instanceof Error ? labelError.message : String(labelError);
    logger13.warn("Error retrieving page labels", { sourceDescription, error: message });
  }
  return null;
};
var collectPageHitData = async (pdfDocument, pageNum, sourceDescription, options) => {
  const { items } = await extractPageContent(pdfDocument, pageNum, false, sourceDescription);
  return buildNormalizedPageText(items, {
    preserveWhitespace: options.preserveWhitespace,
    trimLines: options.trimLines,
    ...options.maxCharsPerPage !== undefined ? { maxCharsPerPage: options.maxCharsPerPage } : {}
  });
};
var buildPageHits = (normalizedText, pageNum, pageLabels, options, remaining) => {
  const matches = options.useRegex ? findRegexMatches(normalizedText.text ?? "", options.query, options, remaining) : findPlainMatches(normalizedText.text ?? "", options.query, options, remaining);
  return matches.map((match) => {
    const segments = buildContextSegments(normalizedText.text ?? "", match.index, match.match.length, options.contextChars);
    return {
      page_number: pageNum,
      page_index: pageNum - 1,
      page_label: pageLabels?.[pageNum - 1] ?? null,
      match: match.match,
      ...segments
    };
  });
};
var collectPageHits = async (pdfDocument, pagesToProcess, pageLabels, sourceDescription, options) => {
  const hits = [];
  const truncatedPages = [];
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
var destroyPdfDocument2 = async (pdfDocument, sourceDescription) => {
  if (!pdfDocument || typeof pdfDocument.destroy !== "function") {
    return;
  }
  try {
    await pdfDocument.destroy();
  } catch (destroyError) {
    const message = destroyError instanceof Error ? destroyError.message : String(destroyError);
    logger13.warn("Error destroying PDF document", { sourceDescription, error: message });
  }
};
var processSearchSource = async (source, sourceDescription, options, allowFullDocument) => {
  let pdfDocument = null;
  let result = { source: sourceDescription, success: false };
  try {
    const targetPages = getTargetPages(source.pages, sourceDescription);
    const loadArgs = {
      ...source.path ? { path: source.path } : {},
      ...source.url ? { url: source.url } : {}
    };
    pdfDocument = await loadPdfDocument(loadArgs, sourceDescription);
    const totalPages = pdfDocument.numPages;
    const { pagesToProcess, invalidPages, guardWarning, rangeWarnings } = determinePagesToProcess(targetPages, totalPages, true, {
      allowFullDocument
    });
    const pageLabels = await getPageLabelsSafe2(pdfDocument, sourceDescription);
    const { hits, truncatedPages } = await collectPageHits(pdfDocument, pagesToProcess, pageLabels, sourceDescription, options);
    const warnings = [
      ...rangeWarnings ?? [],
      ...buildWarnings(invalidPages, totalPages),
      ...guardWarning ? [guardWarning] : []
    ];
    result = {
      source: sourceDescription,
      success: true,
      data: {
        hits,
        total_hits: hits.length,
        ...warnings.length > 0 ? { warnings } : {},
        ...truncatedPages.length > 0 ? { truncated_pages: truncatedPages } : {}
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result = {
      source: sourceDescription,
      success: false,
      error: `Failed to search ${sourceDescription}. Reason: ${message}`
    };
  } finally {
    await destroyPdfDocument2(pdfDocument, sourceDescription);
  }
  return result;
};
var pdfSearch = tool7().description(`Search for specific text patterns across PDF pages

` + `Use when you need to:
` + `- Find specific keywords, phrases, or patterns across documents
` + `- Locate where certain content appears before reading full pages
` + `- Filter large PDFs to relevant sections only

` + `Supports both plain text and regex patterns. Returns surrounding context for each match.

` + `Workflow tip: Search first to identify relevant pages, then use pdf_read on those specific pages for full content.

` + `Example:
` + '  pdf_search({sources: [{path: "doc.pdf"}], query: "total revenue", context_chars: 100})').input(pdfSearchArgsSchema).handler(async ({ input }) => {
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
    allow_full_document
  } = input;
  const baseOptions = {
    query,
    useRegex: use_regex ?? false,
    caseSensitive: case_sensitive ?? false,
    contextChars: context_chars ?? 60,
    maxHits: max_hits ?? 20,
    preserveWhitespace: preserve_whitespace ?? false,
    trimLines: trim_lines ?? true,
    ...max_chars_per_page !== undefined ? { maxCharsPerPage: max_chars_per_page } : {}
  };
  if (baseOptions.useRegex) {
    if (query.length > 100) {
      return toolError7("Regex query too long (max 100 characters)");
    }
    const dangerousPatterns = [
      /\([^)]*[+*]\)[+*{]/,
      /\([^)]*\|[^)]*\)[+*{]/,
      /\(\?:[^)]*[+*]\)[+*{]/
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        return toolError7("Regex pattern contains potentially dangerous nested quantifiers or alternations that could cause catastrophic backtracking. Please simplify your pattern.");
      }
    }
    try {
      new RegExp(query);
    } catch (regexError) {
      const message = regexError instanceof Error ? regexError.message : String(regexError);
      return toolError7(`Invalid regular expression: ${message}`);
    }
  }
  const MAX_CONCURRENT_SOURCES = 3;
  const results = [];
  let remainingHits = baseOptions.maxHits;
  for (let i = 0;i < sources.length; i += MAX_CONCURRENT_SOURCES) {
    const batch = sources.slice(i, i + MAX_CONCURRENT_SOURCES);
    const batchResults = await Promise.all(batch.map((source) => {
      const sourceDescription = source.path ?? source.url ?? "unknown source";
      return processSearchSource(source, sourceDescription, {
        ...baseOptions,
        maxHits: remainingHits
      }, allow_full_document ?? false);
    }));
    results.push(...batchResults);
    const hitsFound = batchResults.reduce((total, result) => total + (result.data?.total_hits ?? 0), 0);
    remainingHits = Math.max(0, remainingHits - hitsFound);
    if (remainingHits === 0) {
      break;
    }
  }
  if (results.every((r) => !r.success)) {
    const errors = results.map((r) => r.error).join("; ");
    return toolError7(`All sources failed to search: ${errors}`);
  }
  const nextStep = buildNextStep2({ stage: "search" });
  return [text7(JSON.stringify({ results, next_step: nextStep }, null, 2))];
});

// src/index.ts
var originalStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, encodingOrCallback, callback) => {
  const str5 = chunk.toString();
  const trimmed = str5.trim();
  const isJsonRpc = trimmed.startsWith("{") || trimmed.startsWith("[");
  if (isJsonRpc) {
    if (typeof encodingOrCallback === "function") {
      return originalStdoutWrite(chunk, encodingOrCallback);
    }
    return originalStdoutWrite(chunk, encodingOrCallback, callback);
  }
  const shouldRedirectToStderr = str5.includes("Warning:") || str5.includes("Cannot polyfill") || str5.includes("DOMMatrix") || str5.includes("Path2D") || trimmed.startsWith("Warning") || trimmed.startsWith("(node:");
  if (shouldRedirectToStderr) {
    if (typeof encodingOrCallback === "function") {
      process.stderr.write(chunk, encodingOrCallback);
    } else {
      process.stderr.write(chunk, encodingOrCallback, callback);
    }
    return true;
  }
  if (typeof encodingOrCallback === "function") {
    return originalStdoutWrite(chunk, encodingOrCallback);
  }
  return originalStdoutWrite(chunk, encodingOrCallback, callback);
};
var server = createServer({
  name: "pdf-reader-mcp",
  version: "3.1.0",
  instructions: "PDF toolkit for MCP clients: retrieve metadata, read structured pages, search text, extract images, analyze with Vision API (diagrams/charts), perform OCR (scanned text/tables), and manage caches.",
  tools: {
    pdf_info: pdfInfo,
    pdf_read: pdfRead,
    pdf_vision: pdfVision,
    pdf_ocr: pdfOcr,
    pdf_extract_image: pdfExtractImage,
    pdf_search: pdfSearch,
    _pdf_cache_clear: pdfCacheClear
  },
  transport: stdio()
});
async function main() {
  await server.start();
  if (process.env["DEBUG_MCP"]) {
    console.error("[PDF Reader MCP] Server running on stdio");
    console.error("[PDF Reader MCP] Project root:", process.cwd());
  }
}
main().catch((error) => {
  console.error("[PDF Reader MCP] Server error:", error);
  process.exit(1);
});
