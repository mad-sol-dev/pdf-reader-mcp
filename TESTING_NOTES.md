# Real-World Testing Notes

## Test Session: Technical PDF Analysis (2024-12-24)

### Test Document
- **File**: N3290x_Design_Guide_A1.pdf (897 pages)
- **Type**: Technical chip documentation (N3290x SoC family)
- **Use Case**: Reverse engineering ZK-Inkjet printer

### Tools Tested
1. `pdf_read` - Text extraction with `insert_markers=true`
2. `pdf_vision` - Mistral Vision API for diagrams/charts
3. `pdf_extract_image` - Raw image extraction for Claude Vision fallback
4. `pdf_ocr` - OCR for scanned content

### Key Findings

#### ✅ What Works Excellently
- **Text extraction** (pdf_read): Reliable for register maps, tables, pin descriptions
- **Embedded bitmap images**:
  - Example: SPI block diagram (page 781)
  - Can be saved via right-click in PDF viewer
  - Vision analysis works perfectly
  - Both pdf_vision and pdf_extract_image work flawlessly

#### ⚠️ Limitations
- **Vector graphics**:
  - Example: ADC/AGC diagrams (pages 815-816)
  - Cannot be extracted as images
  - Right-click "Save Image" doesn't work in PDF viewer
  - Vision APIs can't analyze without full page rendering
  - Workaround: Render entire page or rely on text reconstruction

#### 🔍 Practical Workflow
1. **Stage 1**: Use `pdf_read` with `insert_markers=true` to find [IMAGE] markers
2. **Stage 2a**: Try `pdf_vision` for embedded diagrams (works for bitmaps)
3. **Stage 2b**: Use `pdf_extract_image` as fallback for Claude Vision
4. **Note**: Vector graphics require different approach (OCR full page or text-based analysis)

### Verdict: "Tauglich" (Suitable)

Despite mixed results with vector graphics, the toolset is **good enough** for:
- Technical documentation analysis
- Reverse engineering projects
- Chip datasheets and design guides
- Mixed content PDFs with text, tables, and embedded images

The workflow is **functional** for real-world use cases despite some limitations.

## Auto-Fallback Behavior

When `MISTRAL_API_KEY` is not configured:
- `pdf_vision` returns base64 PNG for Claude Vision analysis (page or image)
- `pdf_ocr` returns base64 PNG for Claude Vision analysis (page or image)
- Graceful degradation without errors

## Cache Architecture

- **In-memory cache**: fingerprint#page#options → fast repeated access
- **Disk cache**: Persistent storage in `{pdf_basename}_ocr.json`
- **Provider-specific**: Different cache keys for different OCR/Vision providers
