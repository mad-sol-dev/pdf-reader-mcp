# Bug Report: PDF Rendering Failure - "Image or Canvas expected"

**Date:** 2025-12-22
**Status:** UNRESOLVED
**Severity:** CRITICAL - Blocks all OCR functionality

---

## Problem Summary

PDF rendering fails with `TypeError: Image or Canvas expected` when attempting to render pages containing embedded images (JPEG/PNG) using `pdf_render_page` or `pdf_ocr_page` tools.

### Error Message
```
Failed to render page from test-data/N3290x_Design_Guide_A1.pdf. Reason: Image or Canvas expected
```

### Impact
- ❌ `pdf_render_page` - Cannot render any pages with images
- ❌ `pdf_ocr_page` - Cannot perform OCR (requires rendering)
- ❌ `pdf_ocr_image` - Cannot OCR extracted images (requires rendering context)
- ✅ `pdf_read_pages` - Works (text extraction only, no rendering)
- ✅ `pdf_get_metadata` - Works
- ✅ `pdf_search` - Works

---

## Environment

### Versions
- **pdfjs-dist:** 5.4.449
- **canvas (node-canvas):** 3.2.0
- **Node.js:** 22.x
- **Platform:** Linux 6.12.57+deb12-amd64
- **Bun:** 1.3.5

### Test Case
- **PDF:** N3290x_Design_Guide_A1.pdf (15MB, 890 pages)
- **Page:** 890 (Power-on Sequence - contains timing diagram image)
- **Content:** Page has minimal text, primary content is a technical diagram (918x482px JPEG)

---

## Root Cause Analysis

The error occurs in PDF.js's `CanvasGraphics_paintJpegXObject` method when it attempts to render embedded images using node-canvas. This is a known compatibility issue between PDF.js and node-canvas.

### Technical Details

**When the error occurs:**
1. PDF.js successfully loads the document
2. Rendering begins for the requested page
3. PDF.js encounters an embedded image (JPEG/PNG) in the page content
4. PDF.js attempts to create an Image object to draw the image onto the canvas
5. **FAILURE:** node-canvas Image objects are not recognized by PDF.js's canvas context

**Error Location:**
- PDF.js internal: `CanvasGraphics_paintJpegXObject`
- Called from: `src/pdf/render.ts:57` (`await page.render(renderContext).promise`)

---

## What We've Tried

### ✅ Attempt 1: Add `reset()` method to NodeCanvasFactory
**File:** `src/pdf/render.ts:26-31`

**Change:**
```typescript
class NodeCanvasFactory {
  create(width, height) { ... }
  reset(canvasAndContext, width, height) {  // ← Added
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext) { ... }
}
```

**Result:** ❌ Still fails
**Reason:** Missing method was causing issues, but not the root cause

---

### ✅ Attempt 2: Pass canvasFactory to getDocument()
**File:** `src/pdf/loader.ts:286-292`

**Change:**
```typescript
const canvasFactory = new NodeCanvasFactory();
const loadingTask = getDocument({
  data: pdfDataSource,
  cMapUrl: CMAP_URL,
  cMapPacked: true,
  canvasFactory,  // ← Added
});
```

**Result:** ❌ Still fails
**Reason:** Factory is now available at document load time, but Image creation still fails

---

### ✅ Attempt 3: Remove `canvas: null` from renderContext
**File:** `src/pdf/render.ts:56-59`

**Before:**
```typescript
const renderContext = {
  canvasContext: context,
  canvas: null,  // ← Removed this
  viewport,
  canvasFactory,
};
```

**After:**
```typescript
const renderContext = {
  canvasContext: context,
  viewport,
  canvasFactory,
};
```

**Result:** ❌ Still fails
**Reason:** Passing null was not the issue

---

## Research Findings

### Known Issues
1. **node-canvas Issue #487** - "TypeError: Image or Canvas expected when importing node-canvas in different modules"
   - URL: https://github.com/Automattic/node-canvas/issues/487
   - **Cause:** Multiple instances of node-canvas being loaded can break compatibility
   - **Solution:** Ensure both PDF.js and application use the same canvas instance

2. **node-canvas Issue #338** - "Context2d#drawImage() throws 'TypeError: Image or Canvas expected'"
   - URL: https://github.com/Automattic/node-canvas/issues/338
   - **Cause:** Image objects from node-canvas not recognized by drawImage()
   - **Status:** Long-standing compatibility issue

3. **pdf-extractor Issue #3** - "Issue rendering pdf images (imageObject)"
   - URL: https://github.com/ScientaNL/pdf-extractor/issues/3
   - **Exact error:** Same error at `CanvasGraphics_paintJpegXObject`
   - **Status:** Unresolved in that project

### PDF.js Migration to @napi-rs/canvas
- PDF.js replaced node-canvas with @napi-rs/canvas in newer versions
- **Issue #15652:** "canvas should not be a dependency if possible"
  - URL: https://github.com/mozilla/pdf.js/issues/15652
- **Issue #19145:** "@napi-rs/canvas package loading errors"
  - URL: https://github.com/mozilla/pdf.js/issues/19145

---

## Current Implementation Status

### NodeCanvasFactory in loader.ts (lines 20-45)
```typescript
class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return { canvas, context };
  }

  reset(canvasAndContext, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}
```

### NodeCanvasFactory in render.ts (lines 12-37)
**Status:** Duplicate implementation (now redundant)

### Document Loading (loader.ts:286-292)
```typescript
const canvasFactory = new NodeCanvasFactory();
const loadingTask = getDocument({
  data: pdfDataSource,
  canvasUrl: CMAP_URL,
  cMapPacked: true,
  canvasFactory,  // ✅ Passed
});
```

### Rendering (render.ts:56-59)
```typescript
const renderContext = {
  canvasContext: context,
  viewport,
  canvasFactory,  // ✅ Passed
};
```

---

## Potential Solutions

### Option 1: Migrate to @napi-rs/canvas ⚠️ RISKY
**Pros:**
- PDF.js officially moved to this package
- Better maintained, fewer dependencies
- May have better compatibility

**Cons:**
- Breaking change
- Requires testing all functionality
- Some users report issues (GitHub #19145)

**Implementation:**
```bash
npm uninstall canvas
npm install @napi-rs/canvas
```

Update imports:
```typescript
// Before
import { createCanvas } from 'canvas';

// After
import { createCanvas } from '@napi-rs/canvas';
```

---

### Option 2: Downgrade pdfjs-dist 🔄 MODERATE RISK
**Rationale:** Try an older version known to work with node-canvas

**Candidates:**
- pdfjs-dist@3.x (older stable)
- pdfjs-dist@4.x (before @napi-rs/canvas migration)

**Implementation:**
```bash
npm install pdfjs-dist@^4.0.0
```

**Risk:** May lose features or introduce other bugs

---

### Option 3: Use PDF.js without canvas (server-side only) 🎯 RECOMMENDED
**Approach:** Render pages to raw pixel data, then convert to PNG separately

**Implementation:**
1. Use PDF.js to get raw image data
2. Convert to PNG using a separate library (sharp, jimp)
3. Bypass canvas rendering entirely

**Pros:**
- Avoids canvas compatibility issues
- More control over image processing
- Potentially faster

**Cons:**
- Requires refactoring render.ts
- More complex pipeline

---

### Option 4: Implement image extraction workaround 🔧 QUICK FIX
**For OCR specifically:** Extract images from PDF without rendering the page

**Implementation:**
1. Use `pdf_get_page` to extract embedded images directly
2. Pass image bytes to OCR API
3. Combine with text extraction results

**Pros:**
- Bypasses rendering issue
- May be faster than rendering
- Works for OCR use case

**Cons:**
- Doesn't fix rendering for other use cases
- More complex logic for combining text + image OCR

---

### Option 5: External rendering service 🌐 SCALABLE
**Approach:** Delegate rendering to external service (e.g., Gotenberg, pdfium)

**Pros:**
- Avoids Node.js canvas issues entirely
- Better rendering quality
- Scalable

**Cons:**
- Adds external dependency
- Network latency
- More complex deployment

---

## Recommended Next Steps

1. **Try Option 1** (@napi-rs/canvas) - FIRST
   - Quick change, official PDF.js direction
   - Test thoroughly with various PDFs

2. **If Option 1 fails, try Option 3** (canvas-free rendering) - BEST LONG-TERM
   - More robust solution
   - Better control

3. **Option 4 as fallback** (image extraction) - QUICK WIN FOR OCR
   - Unblocks OCR testing immediately
   - Can implement in parallel with other fixes

---

## Testing Checklist

When attempting fixes, validate:

- [ ] Render page with embedded JPEG images (page 890)
- [ ] Render page with embedded PNG images
- [ ] Render page with no images (text only)
- [ ] OCR page with images
- [ ] OCR extracted image
- [ ] Text extraction still works
- [ ] Metadata extraction still works
- [ ] All 156 tests pass
- [ ] Build succeeds without errors

---

## Related Files

### Primary
- `src/pdf/render.ts` - Page rendering implementation
- `src/pdf/loader.ts` - Document loading with canvasFactory
- `src/handlers/renderPage.ts` - MCP tool handler
- `src/handlers/ocrPage.ts` - OCR handler (blocked by this bug)
- `src/handlers/ocrImage.ts` - Image OCR handler (blocked by this bug)

### Dependencies
- `package.json` - pdfjs-dist@5.4.449, canvas@3.2.0

### Tests
- `test/handlers/ocrPage.test.ts` - Tests pass (mocked rendering)
- `test/utils/ocr.test.ts` - Tests pass (mocked)

---

## Additional Context

### Why This Blocks OCR Testing

We were attempting to test the newly implemented Mistral OCR API on page 890 of N3290x_Design_Guide_A1.pdf, which contains a Power-on Sequence timing diagram. The test plan was:

1. ✅ Text extraction works - page has minimal text
2. ❌ **BLOCKED:** Render page to PNG for OCR
3. ❌ **BLOCKED:** Send PNG to Mistral OCR API
4. ❌ **BLOCKED:** Compare results with Claude Vision baseline

### Workaround for Immediate OCR Testing

**Alternative:** Use Claude Vision API directly on the original PDF
- Claude can process PDF pages directly without rendering
- Would provide baseline for comparison
- Doesn't test our Mistral OCR integration

---

## References

### GitHub Issues
- [node-canvas #487](https://github.com/Automattic/node-canvas/issues/487) - Module import issues
- [node-canvas #338](https://github.com/Automattic/node-canvas/issues/338) - drawImage TypeError
- [pdf-extractor #3](https://github.com/ScientaNL/pdf-extractor/issues/3) - Same error with PDF.js
- [pdf.js #15652](https://github.com/mozilla/pdf.js/issues/15652) - Canvas dependency discussion
- [pdf.js #19145](https://github.com/mozilla/pdf.js/issues/19145) - @napi-rs/canvas issues

### Documentation
- [PDF.js Getting Started](https://mozilla.github.io/pdf.js/getting_started/)
- [PDF.js Node Examples](https://github.com/mozilla/pdf.js/tree/master/examples/node)
- [node-canvas Documentation](https://github.com/Automattic/node-canvas)

---

## UPDATE 2025-12-22 22:14 - @napi-rs/canvas Migration Results

### ✅ What We Fixed
1. Migrated from `canvas@3.2.0` to `@napi-rs/canvas@0.1.86`
2. Centralized `NodeCanvasFactory` in `src/pdf/canvasFactory.ts`
3. Updated all imports and removed duplicates
4. All 156 tests passing

### ❌ New Problem: Path2D Incompatibility

**Error:** `Value is non of these types 'String', 'Path'`

**Stack Trace:**
```
at CanvasGraphics.consumePath (pdf.mjs:18385:15)
at CanvasGraphics.endPath (pdf.mjs:17411:10)
at CanvasGraphics.constructPath (pdf.mjs:17320:13)
```

**Root Cause:** PDF.js 5.4.449 uses Path2D for vector graphics, but @napi-rs/canvas has an API mismatch in how it accepts Path2D objects.

**Debug Log Analysis:**
- ✅ Canvas creation works (919x1189px)
- ✅ Context creation works
- ❌ **FAILS** during `page.render()` when PDF.js tries to draw paths
- Error occurs in PDF.js's `CanvasGraphics.consumePath` method
- @napi-rs/canvas expects `String` or `Path` type, but receives something else

### Why This Happened

@napi-rs/canvas **does** support Path2D, but the API contract differs from what PDF.js expects. The error suggests type checking incompatibility at the native (Rust) layer.

---

## Conclusion

We have **two incompatible combinations tested:**

1. ❌ **pdfjs-dist@5.4.449 + node-canvas@3.2.0** → "Image or Canvas expected" (Image rendering fails)
2. ❌ **pdfjs-dist@5.4.449 + @napi-rs/canvas@0.1.86** → "Value is non of these types `String`, `Path`" (Path2D fails)

### Next Options (Re-evaluated)

**Option A: Downgrade PDF.js** 🔄 RECOMMENDED
- Try `pdfjs-dist@4.x` or `pdfjs-dist@3.x` with @napi-rs/canvas
- Older versions may have better canvas compatibility
- Risk: Missing features, but rendering might work

**Option B: Try unpdf/pdfium** 🌐 ALTERNATIVE
- Use `unpdf` package which handles PDF.js + canvas internally
- Or use Pdfium-based rendering (different engine)
- Pro: Avoids canvas issues entirely
- Con: Different API, may need significant refactor

**Option C: Canvas-free rendering** 🎯 LONG-TERM BEST
- Extract raw pixel data from PDF.js without canvas
- Convert using sharp/jimp
- Most robust solution

**Option D: Image extraction workaround** 🔧 QUICK WIN
- For OCR specifically: extract images directly from PDF
- Bypass page rendering entirely
- Implements minimal changes

The issue is **not with our code** - it's a fundamental incompatibility between PDF.js 5.x and available canvas libraries in Node.js.
