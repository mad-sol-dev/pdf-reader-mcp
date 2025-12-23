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
var cacheStatsArgsSchema = object({});
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
var getCacheStats = () => ({
  text_entries: textCache.size,
  ocr_entries: ocrCache.size,
  text_keys: textCache.getKeys(),
  ocr_keys: ocrCache.getKeys(),
  text_evictions: textCache.evictionCount,
  ocr_evictions: ocrCache.evictionCount,
  config: {
    text: { ...cacheOptions.text },
    ocr: { ...cacheOptions.ocr }
  }
});
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
var pdfCacheStats = tool().description("Inspect cache usage for text and OCR results.").input(cacheStatsArgsSchema).handler(async () => {
  const stats = getCacheStats();
  return [text(JSON.stringify({ stats }, null, 2))];
});
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
        return console.info;
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
    const imagePromises = imageIndices.map(async (imgIndex, arrayIndex) => {
      const argsArray = operatorList.argsArray[imgIndex];
      if (!argsArray || argsArray.length === 0) {
        return null;
      }
      const imageName = argsArray[0];
      const imageResult = await retrieveImageData(page, imageName, pageNum);
      if (imageResult.warning) {
        warnings.push(imageResult.warning);
      }
      return processImageData(imageResult.data, pageNum, arrayIndex);
    });
    const resolvedImages = await Promise.all(imagePromises);
    images.push(...resolvedImages.filter((img) => img !== null));
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
    const textContent = await page.getTextContent();
    const textByY = new Map;
    for (const item of textContent.items) {
      const textItem = item;
      const xCoord = textItem.transform[4];
      const yCoord = textItem.transform[5];
      if (yCoord === undefined || xCoord === undefined)
        continue;
      const y = Math.round(yCoord);
      const x = Math.round(xCoord);
      const fontSize = typeof textItem.height === "number" && Number.isFinite(textItem.height) ? Math.abs(textItem.height) : undefined;
      if (!textByY.has(y)) {
        textByY.set(y, []);
      }
      textByY.get(y)?.push({ x, text: textItem.str, fontSize });
    }
    for (const [y, textParts] of textByY.entries()) {
      textParts.sort((a, b) => a.x - b.x);
      const textContent2 = textParts.map((part) => part.text).join("");
      const fontSizes = textParts.map((part) => part.fontSize).filter((value) => typeof value === "number" && value > 0);
      const averageFontSize = fontSizes.length > 0 ? fontSizes.reduce((sum, value) => sum + value, 0) / fontSizes.length : undefined;
      const xPosition = textParts[0]?.x ?? 0;
      if (textContent2.trim()) {
        contentItems.push({
          type: "text",
          yPosition: y,
          xPosition,
          fontSize: averageFontSize,
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
          const transform = argsArray[1];
          const yCoord = transform[5];
          if (yCoord !== undefined) {
            yPosition = Math.round(yCoord);
          }
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
  return { items: contentItems.sort((a, b) => b.yPosition - a.yPosition), warnings };
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
  str as str2,
  union
} from "@sylphx/vex";
var pageSpecifierSchema = union(array(num(int, gte(1))), str2(min(1)));
var pdfSourceSchema = object2({
  path: optional2(str2(min(1), description2("Path to the local PDF file (absolute or relative to cwd)."))),
  url: optional2(str2(min(1), description2("URL of the PDF file."))),
  pages: optional2(pageSpecifierSchema)
});

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

// src/pdf/loader.ts
var logger4 = createLogger("Loader");
var require2 = createRequire(import.meta.url);
var CMAP_URL = require2.resolve("pdfjs-dist/package.json").replace("package.json", "cmaps/");
var MAX_PDF_SIZE = 100 * 1024 * 1024;
var DEFAULT_REQUEST_TIMEOUT_MS = 15000;
var DEFAULT_READ_TIMEOUT_MS = 15000;
var fetchPdfBytes = async (url, sourceDescription, options) => {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (err) {
    throw new PdfError(-32602 /* InvalidParams */, `Invalid URL for ${sourceDescription}. Reason: ${err instanceof Error ? err.message : String(err)}`);
  }
  const allowedProtocols = options.allowedProtocols ?? [];
  if (allowedProtocols.length > 0 && !allowedProtocols.includes(parsedUrl.protocol)) {
    throw new PdfError(-32600 /* InvalidRequest */, `URL protocol '${parsedUrl.protocol}' is not allowed for ${sourceDescription}.`);
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

// src/handlers/getMetadata.ts
import { text as text3, tool as tool3, toolError as toolError3 } from "@sylphx/mcp-server-sdk";

// src/schemas/getMetadata.ts
import { array as array2, bool, description as description4, object as object4, optional as optional3 } from "@sylphx/vex";
var getMetadataArgsSchema = object4({
  sources: array2(pdfSourceSchema),
  include_metadata: optional3(bool(description4("Include document metadata and info objects."))),
  include_page_count: optional3(bool(description4("Include total page count."))),
  include_page_labels: optional3(bool(description4("Check for page labels and provide examples."))),
  include_outline: optional3(bool(description4("Check for outline / table of contents presence.")))
});

// src/handlers/getMetadata.ts
var logger7 = createLogger("GetMetadata");
var buildLoadArgs = (source) => ({
  ...source.path ? { path: source.path } : {},
  ...source.url ? { url: source.url } : {}
});
var getFingerprint = (pdfDocument) => pdfDocument.fingerprint ?? pdfDocument.fingerprints?.[0];
var resolvePageLabels = async (pdfDocument, sourceDescription, includePageLabels) => {
  if (!includePageLabels) {
    return {};
  }
  try {
    const labels = await pdfDocument.getPageLabels();
    if (!labels) {
      return { hasPageLabels: false };
    }
    const uniqueLabels = Array.from(new Set(labels.filter((label) => label !== null)));
    return {
      hasPageLabels: true,
      samplePageLabels: uniqueLabels.slice(0, 5)
    };
  } catch (labelError) {
    const message = labelError instanceof Error ? labelError.message : String(labelError);
    logger7.warn("Error checking page labels", { sourceDescription, error: message });
  }
  return {};
};
var resolveOutline = async (pdfDocument, sourceDescription, includeOutline) => {
  if (!includeOutline) {
    return;
  }
  try {
    const outline = await pdfDocument.getOutline();
    return Boolean(outline && outline.length > 0);
  } catch (outlineError) {
    const message = outlineError instanceof Error ? outlineError.message : String(outlineError);
    logger7.warn("Error checking outline", { sourceDescription, error: message });
  }
  return;
};
var buildMetadataSummary = async (pdfDocument, sourceDescription, options) => {
  const metadata = await extractMetadataAndPageCount(pdfDocument, options.includeMetadata, options.includePageCount);
  const fingerprint = getFingerprint(pdfDocument);
  const { hasPageLabels, samplePageLabels } = await resolvePageLabels(pdfDocument, sourceDescription, options.includePageLabels);
  const hasOutline = await resolveOutline(pdfDocument, sourceDescription, options.includeOutline);
  return {
    ...metadata,
    ...fingerprint ? { fingerprint } : {},
    ...hasPageLabels !== undefined ? { has_page_labels: hasPageLabels } : {},
    ...hasOutline !== undefined ? { has_outline: hasOutline } : {},
    ...samplePageLabels ? { sample_page_labels: samplePageLabels } : {}
  };
};
var processMetadata = async (source, sourceDescription, options) => {
  const loadArgs = buildLoadArgs(source);
  try {
    const metadataSummary = await withPdfDocument(loadArgs, sourceDescription, (pdfDocument) => buildMetadataSummary(pdfDocument, sourceDescription, options));
    return { source: sourceDescription, success: true, data: metadataSummary };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      source: sourceDescription,
      success: false,
      error: `Failed to load metadata for ${sourceDescription}. Reason: ${message}`
    };
  }
};
var pdfGetMetadata = tool3().description("Retrieves document metadata and basic info for one or more PDFs.").input(getMetadataArgsSchema).handler(async ({ input }) => {
  const { sources, include_metadata, include_page_count, include_page_labels, include_outline } = input;
  const includeMetadata = include_metadata ?? true;
  const includePageCount = include_page_count ?? true;
  const includePageLabels = include_page_labels ?? true;
  const includeOutline = include_outline ?? true;
  const MAX_CONCURRENT_SOURCES = 3;
  const results = [];
  for (let i = 0;i < sources.length; i += MAX_CONCURRENT_SOURCES) {
    const batch = sources.slice(i, i + MAX_CONCURRENT_SOURCES);
    const batchResults = await Promise.all(batch.map((source) => {
      const sourceDescription = source.path ?? source.url ?? "unknown source";
      return processMetadata(source, sourceDescription, {
        includeMetadata,
        includePageCount,
        includePageLabels,
        includeOutline
      });
    }));
    results.push(...batchResults);
  }
  if (results.every((r) => !r.success)) {
    const errors = results.map((r) => r.error).join("; ");
    return toolError3(`All sources failed to return metadata: ${errors}`);
  }
  return [text3(JSON.stringify({ results }, null, 2))];
});

// src/handlers/getPageStats.ts
import { text as text4, tool as tool4, toolError as toolError4 } from "@sylphx/mcp-server-sdk";

// src/schemas/getPageStats.ts
import { array as array3, bool as bool2, description as description5, object as object5, optional as optional4 } from "@sylphx/vex";
var getPageStatsArgsSchema = object5({
  sources: array3(pdfSourceSchema),
  include_images: optional4(bool2(description5("Count images found on each page while computing statistics."))),
  allow_full_document: optional4(bool2(description5("When true, allows computing stats for the entire document if no pages are specified. When false, only a small sample of pages will be processed.")))
});

// src/handlers/getPageStats.ts
var logger8 = createLogger("GetPageStats");
var summarizePageStats = (pagesToProcess, pageContents, includeImages) => {
  return pageContents.map((result, idx) => {
    const textLength = result.items.reduce((total, item) => {
      if (item.type === "text" && item.textContent) {
        return total + item.textContent.length;
      }
      return total;
    }, 0);
    const imageCount = includeImages ? result.items.filter((item) => item.type === "image" && item.imageData !== undefined).length : 0;
    return {
      page: pagesToProcess[idx],
      text_length: textLength,
      image_count: imageCount,
      has_text: textLength > 0,
      has_images: imageCount > 0
    };
  });
};
var processSourceStats = async (source, sourceDescription, includeImages, allowFullDocument) => {
  const loadArgs = {
    ...source.path ? { path: source.path } : {},
    ...source.url ? { url: source.url } : {}
  };
  return withPdfDocument(loadArgs, sourceDescription, async (pdfDocument) => {
    const targetPages = getTargetPages(source.pages, sourceDescription);
    const totalPages = pdfDocument.numPages;
    const { pagesToProcess, invalidPages, guardWarning, rangeWarnings } = determinePagesToProcess(targetPages, totalPages, true, {
      allowFullDocument,
      samplePageLimit: DEFAULT_SAMPLE_PAGE_LIMIT
    });
    const pageContents = await Promise.all(pagesToProcess.map((pageNum) => extractPageContent(pdfDocument, pageNum, includeImages, sourceDescription)));
    const warnings = [
      ...rangeWarnings ?? [],
      ...buildWarnings(invalidPages, totalPages),
      ...guardWarning ? [guardWarning] : []
    ];
    const data = {
      num_pages: totalPages,
      page_stats: summarizePageStats(pagesToProcess, pageContents, includeImages)
    };
    if (warnings.length > 0) {
      data.warnings = warnings;
    }
    return { source: sourceDescription, success: true, data };
  }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    logger8.warn("Failed to compute page stats", { sourceDescription, error: message });
    return {
      source: sourceDescription,
      success: false,
      error: `Failed to compute page stats for ${sourceDescription}. Reason: ${message}`
    };
  });
};
var pdfGetPageStats = tool4().description("Returns per-page text length and image counts for selected pages in PDFs.").input(getPageStatsArgsSchema).handler(async ({ input }) => {
  const { sources, include_images, allow_full_document } = input;
  const includeImages = include_images ?? false;
  const MAX_CONCURRENT_SOURCES = 3;
  const results = [];
  for (let i = 0;i < sources.length; i += MAX_CONCURRENT_SOURCES) {
    const batch = sources.slice(i, i + MAX_CONCURRENT_SOURCES);
    const batchResults = await Promise.all(batch.map((source) => {
      const sourceDescription = source.path ?? source.url ?? "unknown source";
      return processSourceStats(source, sourceDescription, includeImages, allow_full_document ?? false);
    }));
    results.push(...batchResults);
  }
  if (results.every((r) => !r.success)) {
    const errors = results.map((r) => r.error).join("; ");
    return toolError4(`All sources failed to return page stats: ${errors}`);
  }
  return [text4(JSON.stringify({ results }, null, 2))];
});

// src/handlers/getToc.ts
import { text as text5, tool as tool5, toolError as toolError5 } from "@sylphx/mcp-server-sdk";

// src/schemas/getToc.ts
import { array as array4, object as object6 } from "@sylphx/vex";
var getTocArgsSchema = object6({
  sources: array4(pdfSourceSchema)
});

// src/handlers/getToc.ts
var logger9 = createLogger("GetToc");
var resolvePageNumber = async (pdfDocument, destination, sourceDescription) => {
  try {
    let destToUse = destination;
    if (typeof destination === "string") {
      destToUse = await pdfDocument.getDestination(destination);
      if (!destToUse) {
        return;
      }
    }
    if (Array.isArray(destToUse) && destToUse[0] !== undefined) {
      const pageIndex = await pdfDocument.getPageIndex(destToUse[0]);
      return pageIndex + 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger9.warn("Error resolving outline destination", { sourceDescription, error: message });
  }
  return;
};
var flattenOutline = async (pdfDocument, outlineItems, sourceDescription) => {
  if (!outlineItems || outlineItems.length === 0) {
    return [];
  }
  const items = [];
  for (const item of outlineItems) {
    const page = await resolvePageNumber(pdfDocument, item.dest, sourceDescription);
    const tocItem = {
      title: item.title ?? "Untitled",
      depth: 0,
      ...page !== undefined ? { page } : {}
    };
    items.push(tocItem);
    if (item.items && item.items.length > 0) {
      const childItems = await flattenOutline(pdfDocument, item.items, sourceDescription);
      items.push(...childItems.map((child) => ({ ...child, depth: child.depth + 1 })));
    }
  }
  return items;
};
var buildLoadArgs2 = (source) => ({
  ...source.path ? { path: source.path } : {},
  ...source.url ? { url: source.url } : {}
});
var buildTocResult = (sourceDescription, outline, tocItems) => ({
  source: sourceDescription,
  success: true,
  data: {
    has_outline: Boolean(outline && outline.length > 0),
    toc: tocItems
  }
});
var processToc = async (source, sourceDescription) => {
  const loadArgs = buildLoadArgs2(source);
  try {
    const { outline, tocItems } = await withPdfDocument(loadArgs, sourceDescription, async (pdfDocument) => {
      const outline2 = await pdfDocument.getOutline();
      const tocItems2 = await flattenOutline(pdfDocument, outline2, sourceDescription);
      return { outline: outline2, tocItems: tocItems2 };
    });
    return buildTocResult(sourceDescription, outline, tocItems);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      source: sourceDescription,
      success: false,
      error: `Failed to load table of contents for ${sourceDescription}. Reason: ${message}`
    };
  }
};
var pdfGetToc = tool5().description("Retrieves the table of contents / outline entries for one or more PDFs.").input(getTocArgsSchema).handler(async ({ input }) => {
  const { sources } = input;
  const MAX_CONCURRENT_SOURCES = 3;
  const results = [];
  for (let i = 0;i < sources.length; i += MAX_CONCURRENT_SOURCES) {
    const batch = sources.slice(i, i + MAX_CONCURRENT_SOURCES);
    const batchResults = await Promise.all(batch.map((source) => {
      const sourceDescription = source.path ?? source.url ?? "unknown source";
      return processToc(source, sourceDescription);
    }));
    results.push(...batchResults);
  }
  if (results.every((r) => !r.success)) {
    const errors = results.map((r) => r.error).join("; ");
    return toolError5(`All sources failed to return TOC data: ${errors}`);
  }
  return [text5(JSON.stringify({ results }, null, 2))];
});

// src/handlers/listImages.ts
import { text as text6, tool as tool6, toolError as toolError6 } from "@sylphx/mcp-server-sdk";

// src/schemas/listImages.ts
import { array as array5, bool as bool3, description as description6, object as object7, optional as optional5 } from "@sylphx/vex";
var listImagesArgsSchema = object7({
  sources: array5(pdfSourceSchema),
  allow_full_document: optional5(bool3(description6("When true, allows listing images from the entire document if no pages are specified. When false, only a small sample of pages will be processed.")))
});

// src/handlers/listImages.ts
var logger10 = createLogger("ListImages");
var MAX_CONCURRENT_SOURCES = 3;
var summarizeImages = (images, warnings) => ({
  images,
  total_images: images.length,
  recommendation: OCR_IMAGE_RECOMMENDATION,
  ...warnings.length > 0 ? { warnings } : {}
});
var collectImages = async (source, sourceDescription, allowFullDocument) => {
  const loadArgs = {
    ...source.path ? { path: source.path } : {},
    ...source.url ? { url: source.url } : {}
  };
  return withPdfDocument(loadArgs, sourceDescription, async (pdfDocument) => {
    const totalPages = pdfDocument.numPages;
    const targetPages = getTargetPages(source.pages, sourceDescription);
    const { pagesToProcess, invalidPages, guardWarning, rangeWarnings } = determinePagesToProcess(targetPages, totalPages, true, {
      allowFullDocument,
      samplePageLimit: DEFAULT_SAMPLE_PAGE_LIMIT
    });
    const { images, warnings: imageWarnings } = await extractImages(pdfDocument, pagesToProcess);
    const warnings = [
      ...rangeWarnings ?? [],
      ...buildWarnings(invalidPages, totalPages),
      ...guardWarning ? [guardWarning] : [],
      ...imageWarnings
    ];
    const imageInfo = images.map((img) => ({
      page: img.page,
      index: img.index,
      width: img.width,
      height: img.height,
      format: img.format
    }));
    return {
      source: sourceDescription,
      success: true,
      data: summarizeImages(imageInfo, warnings)
    };
  }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    logger10.warn("Failed to list images", { sourceDescription, error: message });
    return {
      source: sourceDescription,
      success: false,
      error: `Failed to list images for ${sourceDescription}. Reason: ${message}`
    };
  });
};
var pdfListImages = tool6().description("Enumerate image metadata (page/index/dimensions) for PDFs without returning binary data.").input(listImagesArgsSchema).handler(async ({ input }) => {
  const { sources, allow_full_document } = input;
  const allowFullDocument = allow_full_document ?? false;
  const results = [];
  for (let i = 0;i < sources.length; i += MAX_CONCURRENT_SOURCES) {
    const batch = sources.slice(i, i + MAX_CONCURRENT_SOURCES);
    const batchResults = await Promise.all(batch.map((source) => {
      const sourceArgs = {};
      if (typeof source.path === "string") {
        sourceArgs.path = source.path;
      }
      if (typeof source.url === "string") {
        sourceArgs.url = source.url;
      }
      if (source.pages !== undefined) {
        sourceArgs.pages = source.pages;
      }
      return collectImages(sourceArgs, source.path ?? source.url ?? "unknown source", allowFullDocument);
    }));
    results.push(...batchResults);
    if (results.length >= sources.length && results.every((result) => !result.success)) {
      break;
    }
  }
  if (results.every((r) => !r.success)) {
    const errors = results.map((r) => r.error).join("; ");
    return toolError6(`All sources failed to list images: ${errors}`);
  }
  return [text6(JSON.stringify({ results }, null, 2))];
});

// src/handlers/pdfInfo.ts
import { text as text7, tool as tool7, toolError as toolError7 } from "@sylphx/mcp-server-sdk";
import { OPS as OPS2 } from "pdfjs-dist/legacy/build/pdf.mjs";

// src/schemas/pdfInfo.ts
import { array as array6, description as description7, object as object8, optional as optional6, str as str3 } from "@sylphx/vex";
var pdfInfoArgsSchema = object8({
  source: pdfSourceSchema,
  include: optional6(array6(str3(), description7('Optional info to include: "toc" (table of contents), "stats" (page/image statistics). ' + "Omit for basic metadata only (pages, title, author, language).")))
});

// src/handlers/pdfInfo.ts
var logger11 = createLogger("PdfInfo");
var buildLoadArgs3 = (source) => ({
  ...source.path ? { path: source.path } : {},
  ...source.url ? { url: source.url } : {}
});
var getFingerprint2 = (pdfDocument) => pdfDocument.fingerprint ?? pdfDocument.fingerprints?.[0];
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
    logger11.warn("Error checking TOC", { sourceDescription, error: message });
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
      logger11.warn("Error checking images on page", {
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
    logger11.warn("Error counting images", { sourceDescription, error: message });
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
  const fingerprint = getFingerprint2(pdfDocument);
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
  const loadArgs = buildLoadArgs3(source);
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
var pdfInfo = tool7().description(`QUICK CHECK: Get PDF metadata and overview

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
    return [text7(JSON.stringify(result, null, 2))];
  } catch (error) {
    const sourceDescription = input.source.path ?? input.source.url ?? "unknown source";
    const message = error instanceof Error ? error.message : String(error);
    const errorResult = {
      source: sourceDescription,
      success: false,
      error: `Failed to get info for ${sourceDescription}. Reason: ${message}`
    };
    return toolError7(JSON.stringify(errorResult));
  }
});

// src/handlers/pdfOcr.ts
import { image as image2, text as text8, tool as tool8, toolError as toolError8 } from "@sylphx/mcp-server-sdk";
import { OPS as OPS3 } from "pdfjs-dist/legacy/build/pdf.mjs";

// src/pdf/render.ts
import fs2 from "node:fs/promises";
var logger12 = createLogger("Renderer");
var DEBUG_LOG_PATH = "/tmp/pdf-render-debug.log";
async function debugLog(message, data) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}
${data ? JSON.stringify(data, null, 2) : ""}

`;
  await fs2.appendFile(DEBUG_LOG_PATH, logEntry).catch(() => {});
}
var renderPageToPng = async (pdfDocument, pageNum, scale = 1.5) => {
  await debugLog("=== START renderPageToPng ===", { pageNum, scale });
  try {
    await debugLog("Getting page from document");
    const page = await pdfDocument.getPage(pageNum);
    await debugLog("Getting viewport");
    const viewport = page.getViewport({ scale });
    await debugLog("Viewport created", { width: viewport.width, height: viewport.height });
    await debugLog("Creating canvas factory");
    const canvasFactory = new NodeCanvasFactory;
    await debugLog("Creating canvas");
    const { canvas, context } = canvasFactory.create(viewport.width, viewport.height);
    await debugLog("Canvas created", {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      contextType: typeof context
    });
    const renderContext = {
      canvasContext: context,
      viewport,
      canvasFactory
    };
    await debugLog("Starting page.render()");
    try {
      await page.render(renderContext).promise;
      await debugLog("page.render() completed successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      await debugLog("ERROR in page.render()", { message, stack, error });
      logger12.error("Error rendering page", { pageNum, error: message });
      throw error;
    }
    await debugLog("Encoding canvas to PNG");
    const pngBuffer = await canvas.encode("png");
    await debugLog("PNG encoding completed", { bufferLength: pngBuffer.length });
    canvasFactory.destroy({ canvas, context });
    await debugLog("Canvas destroyed");
    const result = {
      width: Math.ceil(viewport.width),
      height: Math.ceil(viewport.height),
      scale,
      data: pngBuffer.toString("base64")
    };
    await debugLog("=== END renderPageToPng SUCCESS ===");
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    await debugLog("=== END renderPageToPng ERROR ===", { message, stack, error });
    throw error;
  }
};

// src/schemas/pdfOcr.ts
import {
  bool as bool4,
  description as description8,
  gte as gte3,
  int as int3,
  num as num3,
  object as object9,
  optional as optional7
} from "@sylphx/vex";
var pdfOcrArgsSchema = object9({
  source: pdfSourceSchema,
  page: num3(int3, gte3(1), description8("1-based page number.")),
  index: optional7(num3(int3, gte3(0), description8("0-based image index within the page. If provided, OCR will be performed on the specific image. If omitted, OCR will be performed on the entire rendered page."))),
  scale: optional7(num3(gte3(0.1), description8("Rendering scale applied before OCR (only for page OCR)."))),
  cache: optional7(bool4(description8("Use cached OCR result when available. Defaults to true."))),
  smart_ocr: optional7(bool4(description8("Enable smart OCR decision step to skip OCR when likely unnecessary (only for page OCR).")))
});

// src/utils/diskCache.ts
import fs3 from "node:fs";
import path2 from "node:path";
var logger13 = createLogger("DiskCache");
var LOCK_RETRY_MS = 25;
var LOCK_TIMEOUT_MS = 5000;
var getCacheFilePath = (pdfPath) => {
  const dir = path2.dirname(pdfPath);
  const basename = path2.basename(pdfPath, path2.extname(pdfPath));
  return path2.join(dir, `${basename}_ocr.json`);
};
var loadOcrCache = (pdfPath) => {
  const cachePath = getCacheFilePath(pdfPath);
  try {
    if (!fs3.existsSync(cachePath)) {
      return null;
    }
    const content = fs3.readFileSync(cachePath, "utf-8");
    const cache = JSON.parse(content);
    if (!cache.fingerprint || !cache.pages || !cache.images) {
      logger13.warn("Invalid cache file structure", { cachePath });
      return null;
    }
    logger13.debug("Loaded OCR cache from disk", {
      cachePath,
      pageCount: Object.keys(cache.pages).length,
      imageCount: Object.keys(cache.images).length
    });
    return cache;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger13.warn("Failed to load OCR cache", { cachePath, error: message });
    return null;
  }
};
var sleepSync = (ms) => {
  const array7 = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(array7, 0, 0, ms);
};
var acquireCacheLock = (lockPath) => {
  const start = Date.now();
  while (true) {
    try {
      return fs3.openSync(lockPath, "wx");
    } catch (error) {
      const err = error;
      if (err.code === "EEXIST") {
        if (Date.now() - start > LOCK_TIMEOUT_MS) {
          throw new Error(`Timed out waiting for cache lock at ${lockPath}`);
        }
        sleepSync(LOCK_RETRY_MS);
        continue;
      }
      throw error;
    }
  }
};
var releaseCacheLock = (lockPath, fd) => {
  fs3.closeSync(fd);
  fs3.rmSync(lockPath, { force: true });
};
var writeCacheFile = (cachePath, cache) => {
  cache.updated_at = new Date().toISOString();
  const dir = path2.dirname(cachePath);
  if (!fs3.existsSync(dir)) {
    fs3.mkdirSync(dir, { recursive: true });
  }
  const tempPath = `${cachePath}.${process.pid}.${Date.now()}.tmp`;
  fs3.writeFileSync(tempPath, JSON.stringify(cache, null, 2), "utf-8");
  fs3.renameSync(tempPath, cachePath);
};
var mergeCaches = (existing, incoming) => {
  const now = new Date().toISOString();
  if (existing && existing.fingerprint === incoming.fingerprint) {
    return {
      ...existing,
      ...incoming,
      created_at: existing.created_at,
      updated_at: now,
      pages: { ...existing.pages, ...incoming.pages },
      images: { ...existing.images, ...incoming.images }
    };
  }
  return {
    ...incoming,
    created_at: incoming.created_at ?? existing?.created_at ?? now,
    updated_at: now,
    pages: incoming.pages ?? {},
    images: incoming.images ?? {}
  };
};
var saveOcrCache = (pdfPath, cache) => {
  const cachePath = getCacheFilePath(pdfPath);
  const lockPath = `${cachePath}.lock`;
  const lockFd = acquireCacheLock(lockPath);
  try {
    const latest = loadOcrCache(pdfPath);
    const merged = mergeCaches(latest, cache);
    writeCacheFile(cachePath, merged);
    logger13.debug("Saved OCR cache to disk", {
      cachePath,
      pageCount: Object.keys(merged.pages).length,
      imageCount: Object.keys(merged.images).length
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger13.error("Failed to save OCR cache", { cachePath, error: message });
    throw new Error(`Failed to save OCR cache: ${message}`);
  } finally {
    releaseCacheLock(lockPath, lockFd);
  }
};
var getCachedOcrPage = (pdfPath, fingerprint, page, providerHash) => {
  const cache = loadOcrCache(pdfPath);
  if (!cache) {
    return null;
  }
  if (cache.fingerprint !== fingerprint) {
    logger13.warn("PDF fingerprint mismatch, cache invalidated", {
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
    logger13.debug("Provider hash mismatch for page", { page, pageKey });
    return null;
  }
  logger13.debug("Cache hit for page", { page });
  return result;
};
var setCachedOcrPage = (pdfPath, fingerprint, page, providerHash, ocrProvider, result) => {
  let cache = loadOcrCache(pdfPath);
  if (!cache) {
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
  if (cache.fingerprint !== fingerprint) {
    logger13.warn("PDF fingerprint changed, resetting cache", { pdfPath });
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
  const pageKey = String(page);
  cache.pages[pageKey] = {
    ...result,
    provider_hash: providerHash,
    cached_at: new Date().toISOString()
  };
  saveOcrCache(pdfPath, cache);
  logger13.debug("Cached OCR result for page", { page });
};
var getCachedOcrImage = (pdfPath, fingerprint, page, imageIndex, providerHash) => {
  const cache = loadOcrCache(pdfPath);
  if (!cache) {
    return null;
  }
  if (cache.fingerprint !== fingerprint) {
    logger13.warn("PDF fingerprint mismatch, cache invalidated", {
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
    logger13.debug("Provider hash mismatch for image", { page, imageIndex });
    return null;
  }
  logger13.debug("Cache hit for image", { page, imageIndex });
  return result;
};
var setCachedOcrImage = (pdfPath, fingerprint, page, imageIndex, providerHash, ocrProvider, result) => {
  let cache = loadOcrCache(pdfPath);
  if (!cache) {
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
  if (cache.fingerprint !== fingerprint) {
    logger13.warn("PDF fingerprint changed, resetting cache", { pdfPath });
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
  const imageKey = `${page}/${imageIndex}`;
  cache.images[imageKey] = {
    ...result,
    provider_hash: providerHash,
    cached_at: new Date().toISOString()
  };
  saveOcrCache(pdfPath, cache);
  logger13.debug("Cached OCR result for image", { page, imageIndex });
};

// src/utils/fingerprint.ts
import crypto from "node:crypto";
var getDocumentFingerprint = (pdfDocument, sourceDescription) => {
  const fingerprint = pdfDocument.fingerprints?.[0];
  if (fingerprint)
    return fingerprint;
  const fallback = `${sourceDescription}-${pdfDocument.numPages}`;
  return crypto.createHash("sha256").update(fallback).digest("hex");
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
  const text8 = data.text ?? data.ocr;
  if (!text8) {
    throw new Error("OCR provider response missing text field.");
  }
  return {
    provider: provider.name ?? "http",
    text: text8
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
  let text8;
  if (typeof content === "string") {
    text8 = content;
  } else if (Array.isArray(content)) {
    text8 = content.map((chunk) => chunk.text).filter(Boolean).join("");
  }
  if (!text8) {
    throw new Error("Mistral OCR response missing text field.");
  }
  return {
    provider: provider.name ?? "mistral",
    text: text8
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
    const text8 = result.pages?.[0]?.markdown;
    if (!text8) {
      throw new Error("Mistral OCR response missing text field.");
    }
    const basicResponse = {
      provider: provider.name ?? "mistral-ocr",
      text: text8
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

// src/handlers/pdfOcr.ts
var logger14 = createLogger("PdfOcr");
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
  if (decisionCache.has(key)) {
    decisionCache.delete(key);
  }
  decisionCache.set(key, decision);
  if (decisionCache.size > DECISION_CACHE_MAX_ENTRIES) {
    const oldestKey = decisionCache.keys().next().value;
    if (oldestKey) {
      decisionCache.delete(oldestKey);
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
  const nonAsciiCount = (trimmedText.match(/[^\u0000-\u007F]/gu) || []).length;
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
var checkDiskCacheForPage = (sourcePath, fingerprint, page, scale, providerKey, providerName, cacheKey, source, useCache) => {
  if (!useCache || !sourcePath)
    return;
  const diskCached = getCachedOcrPage(sourcePath, fingerprint, page, scale, providerKey);
  if (!diskCached)
    return;
  setCachedOcrText(fingerprint, cacheKey, {
    text: diskCached.text,
    provider: providerName
  });
  logger14.debug("Loaded OCR result from disk cache", { page, path: sourcePath });
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
  logger14.debug("Loaded OCR result from disk cache", { page, index, path: sourcePath });
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
  let decision = cached;
  if (!decision) {
    const pdfPage = await pdfDocument.getPage(page);
    const pageText = await extractTextFromPage(pdfPage);
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
          text: "",
          provider: "smart_ocr_skip",
          fingerprint,
          from_cache: false,
          page,
          decision: decision.reason,
          message: "Smart OCR determined that text extraction is sufficient."
        }
      }
    };
  }
  return;
};
var executePageOcrAndCache = async (pdfDocument, page, scale, provider, fingerprint, cacheKey, providerKey, sourcePath, source) => {
  const pdfPage = await pdfDocument.getPage(page);
  const { imageData } = await renderPageToPng(pdfPage, scale);
  const ocr = await performOcr(imageData, provider);
  setCachedOcrText(fingerprint, cacheKey, { text: ocr.text, provider: ocr.provider });
  if (sourcePath) {
    setCachedOcrPage(sourcePath, fingerprint, page, scale ?? 1, providerKey, provider.name ?? "unknown", {
      text: ocr.text,
      provider_hash: providerKey,
      cached_at: new Date().toISOString()
    });
    logger14.debug("Saved OCR result to disk cache", { page, path: sourcePath });
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
    logger14.info("No OCR provider configured, returning rendered page image", { page });
    const pdfPage = await pdfDocument.getPage(page);
    const { imageData } = await renderPageToPng(pdfPage, scale);
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
  const diskCached = checkDiskCacheForPage(source.path, fingerprint, page, scale ?? 1, providerKey, provider.name ?? "unknown", cacheKey, sourceDescription, useCache);
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
    logger14.info("No OCR provider configured, returning extracted image", { page, index });
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
    setCachedOcrImage(source.path, fingerprint, page, index, providerKey, provider.name ?? "unknown", {
      text: ocr.text,
      provider_hash: providerKey,
      cached_at: new Date().toISOString()
    });
    logger14.debug("Saved OCR result to disk cache", { page, index, path: source.path });
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
var pdfOcr = tool8().description(`STAGE 3: OCR for text in images

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
      return [
        text8(JSON.stringify(result.metadata, null, 2)),
        image2(result.imageData, "image/png")
      ];
    }
    return [text8(JSON.stringify(result.result, null, 2))];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger14.error("Failed to perform OCR", { sourceDescription, page, index, error: message });
    return toolError8(`Failed to perform OCR on ${sourceDescription}. Reason: ${message}`);
  }
});

// src/handlers/pdfRead.ts
import { text as text9, tool as tool9, toolError as toolError9 } from "@sylphx/mcp-server-sdk";

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
  const text9 = normalizedLines.join(`
`);
  if (maxCharsPerPage !== undefined && consumed > maxCharsPerPage) {
    truncated = true;
  }
  return { lines: normalizedLines, text: text9, truncated };
};

// src/schemas/pdfRead.ts
import {
  array as array7,
  bool as bool5,
  description as description9,
  gte as gte4,
  int as int4,
  num as num4,
  object as object10,
  optional as optional8
} from "@sylphx/vex";
var pdfReadArgsSchema = object10({
  sources: array7(pdfSourceSchema),
  include_image_indexes: optional8(bool5(description9("Include image indexes for each page (no image data is returned)."))),
  insert_markers: optional8(bool5(description9("Insert [IMAGE] and [TABLE] markers inline with text at their approximate positions. " + "Helps identify pages with complex content that may need OCR."))),
  max_chars_per_page: optional8(num4(int4, gte4(1), description9("Maximum characters to return per page before truncating."))),
  preserve_whitespace: optional8(bool5(description9("Preserve original whitespace from the PDF."))),
  trim_lines: optional8(bool5(description9("Trim leading/trailing whitespace for each text line."))),
  allow_full_document: optional8(bool5(description9("When true, allows reading the entire document if no pages are specified. When false, only a small sample of pages will be processed.")))
});

// src/handlers/pdfRead.ts
var logger15 = createLogger("PdfRead");
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
    logger15.warn("Error retrieving page labels", { sourceDescription, error: message });
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
    logger15.warn("Error destroying PDF document", { sourceDescription, error: message });
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
var pdfRead = tool9().description(`STAGE 1: Extract text from PDF pages

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
  const MAX_CONCURRENT_SOURCES2 = 3;
  const results = [];
  for (let i = 0;i < sources.length; i += MAX_CONCURRENT_SOURCES2) {
    const batch = sources.slice(i, i + MAX_CONCURRENT_SOURCES2);
    const batchResults = await Promise.all(batch.map((source) => {
      const sourceDescription = source.path ?? source.url ?? "unknown source";
      return processSourcePages(source, sourceDescription, options, allow_full_document ?? false);
    }));
    results.push(...batchResults);
  }
  if (results.every((r) => !r.success)) {
    const errors = results.map((r) => r.error).join("; ");
    return toolError9(`All sources failed to return page content: ${errors}`);
  }
  return [text9(JSON.stringify({ results }, null, 2))];
});

// src/handlers/readPdf.ts
import { image as image3, text as text10, tool as tool10, toolError as toolError10 } from "@sylphx/mcp-server-sdk";

// src/schemas/readPdf.ts
import { array as array8, bool as bool6, description as description10, object as object11, optional as optional9 } from "@sylphx/vex";
var readPdfArgsSchema = object11({
  sources: array8(pdfSourceSchema),
  include_full_text: optional9(bool6(description10("Include the full text content of each PDF (only if 'pages' is not specified for that source)."))),
  include_metadata: optional9(bool6(description10("Include metadata and info objects for each PDF."))),
  include_page_count: optional9(bool6(description10("Include the total number of pages for each PDF."))),
  include_images: optional9(bool6(description10("Extract and include embedded images from the PDF pages as base64-encoded data."))),
  allow_full_document: optional9(bool6(description10("When true, allows reading the entire document if no pages are specified. When false, only a small sample of pages will be processed.")))
});

// src/handlers/readPdf.ts
var logger16 = createLogger("ReadPdf");
var processSingleSource = async (source, options) => {
  const MAX_CONCURRENT_PAGES = 5;
  const sourceDescription = source.path ?? source.url ?? "unknown source";
  let individualResult = { source: sourceDescription, success: false };
  let pdfDocument = null;
  try {
    const targetPages = getTargetPages(source.pages, sourceDescription);
    const { pages: _pages, ...loadArgs } = source;
    pdfDocument = await loadPdfDocument(loadArgs, sourceDescription);
    const totalPages = pdfDocument.numPages;
    const metadataOutput = await extractMetadataAndPageCount(pdfDocument, options.includeMetadata, options.includePageCount);
    const output = { ...metadataOutput };
    const { pagesToProcess, invalidPages, guardWarning, rangeWarnings } = determinePagesToProcess(targetPages, totalPages, options.includeFullText, {
      allowFullDocument: options.allowFullDocument
    });
    const warnings = [
      ...rangeWarnings ?? [],
      ...buildWarnings(invalidPages, totalPages),
      ...guardWarning ? [guardWarning] : []
    ];
    if (warnings.length > 0) {
      output.warnings = warnings;
    }
    if (pagesToProcess.length > 0) {
      const pageContents = new Array(pagesToProcess.length);
      const imageWarnings = [];
      for (let i = 0;i < pagesToProcess.length; i += MAX_CONCURRENT_PAGES) {
        const batch = pagesToProcess.slice(i, i + MAX_CONCURRENT_PAGES);
        const batchResults = await Promise.all(batch.map((pageNum) => extractPageContent(pdfDocument, pageNum, options.includeImages, sourceDescription)));
        batchResults.forEach((result, idx) => {
          pageContents[i + idx] = result;
          if (result.warnings.length > 0) {
            imageWarnings.push(...result.warnings);
          }
        });
      }
      output.page_contents = pageContents.map((result, idx) => ({
        page: pagesToProcess[idx],
        items: result.items
      }));
      const extractedPageTexts = pageContents.map((result, idx) => ({
        page: pagesToProcess[idx],
        text: result.items.filter((item) => item.type === "text").map((item) => item.textContent).join("")
      }));
      if (targetPages.pages) {
        output.page_texts = extractedPageTexts;
      } else {
        output.full_text = extractedPageTexts.map((p) => p.text).join(`

`);
      }
      if (options.includeImages) {
        const extractedImages = pageContents.flatMap((result) => result.items.filter((item) => item.type === "image" && item.imageData)).map((item) => item.imageData).filter((img) => img !== undefined);
        if (extractedImages.length > 0) {
          output.images = extractedImages;
        }
      }
      if (imageWarnings.length > 0) {
        output.warnings = [...output.warnings ?? [], ...imageWarnings];
      }
    }
    individualResult = { ...individualResult, data: output, success: true };
  } catch (error) {
    let errorMessage = `Failed to process PDF from ${sourceDescription}.`;
    if (error instanceof Error) {
      errorMessage += ` Reason: ${error.message}`;
    } else {
      errorMessage += ` Unknown error: ${JSON.stringify(error)}`;
    }
    individualResult.error = errorMessage;
    individualResult.success = false;
    individualResult.data = undefined;
  } finally {
    if (pdfDocument && typeof pdfDocument.destroy === "function") {
      try {
        await pdfDocument.destroy();
      } catch (destroyError) {
        const message = destroyError instanceof Error ? destroyError.message : String(destroyError);
        logger16.warn("Error destroying PDF document", { sourceDescription, error: message });
      }
    }
  }
  return individualResult;
};
var readPdf = tool10().description("Reads content/metadata/images from one or more PDFs (local/URL). Each source can specify pages to extract.").input(readPdfArgsSchema).handler(async ({ input }) => {
  const {
    sources,
    include_full_text,
    include_metadata,
    include_page_count,
    include_images,
    allow_full_document
  } = input;
  const MAX_CONCURRENT_SOURCES2 = 3;
  const results = [];
  const options = {
    includeFullText: include_full_text ?? false,
    includeMetadata: include_metadata ?? true,
    includePageCount: include_page_count ?? true,
    includeImages: include_images ?? false,
    allowFullDocument: allow_full_document ?? false
  };
  for (let i = 0;i < sources.length; i += MAX_CONCURRENT_SOURCES2) {
    const batch = sources.slice(i, i + MAX_CONCURRENT_SOURCES2);
    const batchResults = await Promise.all(batch.map((source) => processSingleSource(source, options)));
    results.push(...batchResults);
  }
  const allFailed = results.every((r) => !r.success);
  if (allFailed) {
    const errorMessages = results.map((r) => r.error).join("; ");
    return toolError10(`All PDF sources failed to process: ${errorMessages}`);
  }
  const content = [];
  const resultsForJson = results.map((result) => {
    if (result.data) {
      const { images, page_contents, ...dataWithoutBinaryContent } = result.data;
      if (images) {
        const imageInfo = images.map((img) => ({
          page: img.page,
          index: img.index,
          width: img.width,
          height: img.height,
          format: img.format
        }));
        return { ...result, data: { ...dataWithoutBinaryContent, image_info: imageInfo } };
      }
      return { ...result, data: dataWithoutBinaryContent };
    }
    return result;
  });
  content.push(text10(JSON.stringify({ results: resultsForJson }, null, 2)));
  for (const result of results) {
    if (!result.success || !result.data?.page_contents)
      continue;
    for (const pageContent of result.data.page_contents) {
      for (const item of pageContent.items) {
        if (item.type === "text" && item.textContent) {
          content.push(text10(item.textContent));
        } else if (item.type === "image" && item.imageData) {
          content.push(image3(item.imageData.data, "image/png"));
        }
      }
    }
  }
  return content;
});

// src/handlers/renderPage.ts
import { image as image4, text as text11, tool as tool11, toolError as toolError11 } from "@sylphx/mcp-server-sdk";

// src/schemas/renderPage.ts
import { description as description11, gte as gte5, num as num5, object as object12, optional as optional10 } from "@sylphx/vex";
var renderPageArgsSchema = object12({
  source: pdfSourceSchema,
  page: num5(gte5(1), description11("1-based page number to render.")),
  scale: optional10(num5(gte5(0.1), description11("Rendering scale factor (1.0 = 100%).")))
});

// src/handlers/renderPage.ts
var logger17 = createLogger("RenderPage");
var renderTargetPage = async (source, sourceDescription, page, scale) => {
  return withPdfDocument(source, sourceDescription, async (pdfDocument) => {
    const totalPages = pdfDocument.numPages;
    if (page < 1 || page > totalPages) {
      throw new Error(`Requested page ${page} is out of bounds (1-${totalPages}).`);
    }
    const fingerprint = getDocumentFingerprint(pdfDocument, sourceDescription);
    const rendered = await renderPageToPng(pdfDocument, page, scale ?? 1.5);
    return {
      metadata: {
        page,
        width: rendered.width,
        height: rendered.height,
        scale: rendered.scale,
        fingerprint,
        recommendation: OCR_IMAGE_RECOMMENDATION
      },
      imageData: rendered.data
    };
  });
};
var pdfRenderPage = tool11().description("Rasterize a PDF page to PNG and return metadata plus base64 image content.").input(renderPageArgsSchema).handler(async ({ input }) => {
  const { source, page, scale } = input;
  const sourceDescription = source.path ?? source.url ?? "unknown source";
  const normalizedSource = {
    ...source.path ? { path: source.path } : {},
    ...source.url ? { url: source.url } : {}
  };
  try {
    const result = await renderTargetPage(normalizedSource, sourceDescription, page, scale);
    return [text11(JSON.stringify(result.metadata, null, 2)), image4(result.imageData, "image/png")];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger17.error("Failed to render page", { sourceDescription, page, error: message });
    return toolError11(`Failed to render page from ${sourceDescription}. Reason: ${message}`);
  }
});

// src/handlers/searchPdf.ts
import { text as text12, tool as tool12, toolError as toolError12 } from "@sylphx/mcp-server-sdk";

// src/schemas/pdfSearch.ts
import {
  array as array9,
  bool as bool7,
  description as description12,
  gte as gte6,
  int as int5,
  min as min2,
  num as num6,
  object as object13,
  optional as optional11,
  str as str4
} from "@sylphx/vex";
var pdfSearchArgsSchema = object13({
  sources: array9(pdfSourceSchema),
  query: str4(min2(1), description12("Plain text or regular expression to search for within pages.")),
  use_regex: optional11(bool7(description12("Treat the query as a regular expression."))),
  case_sensitive: optional11(bool7(description12("Enable case sensitive matching."))),
  context_chars: optional11(num6(int5, gte6(0), description12("Number of characters to include before/after each match."))),
  max_hits: optional11(num6(int5, gte6(1), description12("Maximum number of matches to return across all pages."))),
  max_chars_per_page: optional11(num6(int5, gte6(1), description12("Truncate each page before searching to control payload size."))),
  preserve_whitespace: optional11(bool7(description12("Preserve original whitespace when building text."))),
  trim_lines: optional11(bool7(description12("Trim leading/trailing whitespace for each text line."))),
  allow_full_document: optional11(bool7(description12("When true, allows searching the entire document if no pages are specified. When false, only a small sample of pages will be processed.")))
});

// src/handlers/searchPdf.ts
var logger18 = createLogger("PdfSearch");
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
  const regex = new RegExp(query, flags);
  const matches = [];
  let match = regex.exec(textToSearch);
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
    logger18.warn("Error retrieving page labels", { sourceDescription, error: message });
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
    logger18.warn("Error destroying PDF document", { sourceDescription, error: message });
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
var pdfSearch = tool12().description(`Search for specific text patterns across PDF pages

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
    try {
      new RegExp(query);
    } catch (regexError) {
      const message = regexError instanceof Error ? regexError.message : String(regexError);
      return toolError12(`Invalid regular expression: ${message}`);
    }
  }
  const MAX_CONCURRENT_SOURCES2 = 3;
  const results = [];
  let remainingHits = baseOptions.maxHits;
  for (let i = 0;i < sources.length; i += MAX_CONCURRENT_SOURCES2) {
    const batch = sources.slice(i, i + MAX_CONCURRENT_SOURCES2);
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
    return toolError12(`All sources failed to search: ${errors}`);
  }
  return [text12(JSON.stringify({ results }, null, 2))];
});

// src/index.ts
var originalStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, encodingOrCallback, callback) => {
  const str5 = chunk.toString();
  if (str5.includes("Cannot polyfill") || str5.includes("DOMMatrix")) {
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
  version: "2.1.0",
  instructions: "PDF toolkit for MCP clients: retrieve metadata, compute page statistics, inspect TOCs, read structured pages, search text, extract text/images, rasterize pages, perform OCR with caching, and manage caches (read_pdf maintained for compatibility).",
  tools: {
    pdf_info: pdfInfo,
    pdf_get_metadata: pdfGetMetadata,
    pdf_get_page_stats: pdfGetPageStats,
    pdf_get_toc: pdfGetToc,
    pdf_list_images: pdfListImages,
    pdf_extract_image: pdfExtractImage,
    pdf_render_page: pdfRenderPage,
    pdf_ocr: pdfOcr,
    _pdf_cache_stats: pdfCacheStats,
    _pdf_cache_clear: pdfCacheClear,
    pdf_read: pdfRead,
    pdf_search: pdfSearch,
    read_pdf: readPdf
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
