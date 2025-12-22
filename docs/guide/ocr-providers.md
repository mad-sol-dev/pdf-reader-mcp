# OCR Providers

Use OCR when a page renders as images or when embedded text is unreliable. The MCP server leans on HTTP-friendly provider wrappers so you can swap vision backends without changing client code.

## Capabilities

- `pdf_ocr_page` — renders a page to PNG (respecting `scale`) and POSTs it to your HTTP wrapper; returns OCR `text`, provider metadata, and `from_cache`.
- `pdf_ocr_image` — reuses an embedded image (by index) without re-rendering the page; same request shape as `pdf_ocr_page`.
- Both tools accept `provider` configs (`type: "http"`, `endpoint`, `model`, `language`, `extras`) and optionally `api_key`. Set `cache: true` to reuse responses across identical inputs.

## Architecture

`pdf-reader-mcp` → lightweight HTTP wrapper → upstream vision API. The server never talks directly to cloud vision APIs; you own the wrapper so you can inject prompts, redact data, log, or mock responses. Wrappers accept a JSON body `{ image, model, language, extras }` where `image` is a base64 PNG or data URI.

## Provider recipes (copy/paste-ready)

The patterns below mirror the Option B wrapper in `OCR_BACKLOG.md`: single POST endpoint, direct vision call, and minimal plumbing. Replace the API keys and models with your own. These are docs-only examples—run them from a separate node/ts project.

### Mistral Vision (simple, fast)

```typescript
// mistral-ocr-wrapper.ts
import express from 'express';
import { Mistral } from '@mistralai/mistralai';

const app = express();
app.use(express.json({ limit: '50mb' }));
const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

app.post('/v1/ocr', async (req, res) => {
  const { image, model, language, extras } = req.body;
  const imageUrl = image.startsWith('data:') ? image : `data:image/png;base64,${image}`;
  const prompt = extras?.prompt || 'Extract and transcribe all text from this image. Preserve layout and return markdown.';

  try {
    const response = await client.chat.complete({
      model: model || 'mistral-large-2512',
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: imageUrl }] }],
      temperature: extras?.temperature ?? 0,
      maxTokens: extras?.max_tokens ?? 4000
    });

    res.json({ text: response.choices[0].message.content, language });
  } catch (error) {
    res.status(500).json({ error: error.message || 'OCR processing failed' });
  }
});

app.listen(3000, () => console.log('Mistral OCR wrapper on http://localhost:3000'));
```

**Setup**

```bash
npm init -y
npm install express @mistralai/mistralai dotenv
echo "MISTRAL_API_KEY=sk-..." > .env
npx tsx mistral-ocr-wrapper.ts
```

**Provider config**

```json
{
  "type": "http",
  "endpoint": "http://localhost:3000/v1/ocr",
  "model": "mistral-large-2512",
  "language": "en",
  "extras": { "prompt": "Preserve tables; return markdown", "temperature": 0 }
}
```

### Mistral OCR API (Dedicated - Best Quality)

The dedicated Mistral OCR API provides superior quality for complex layouts, tables, and technical documents without building your own wrapper.

**Mistral Vision vs. Mistral OCR**:
- Vision (`type: "mistral"`) — fast, simple, chat-based, best for quick extraction.
- OCR (`type: "mistral-ocr"`) — best quality, structured output, and specialized OCR model (3 API calls: upload → process → cleanup).

**Trade-offs vs. Vision API**:
- ✅ Dedicated OCR model (`mistral-ocr-latest`)
- ✅ Structured output (markdown, tables, hyperlinks)
- ✅ Better accuracy for complex layouts
- ⚠️ Higher latency (3 API calls vs. 1)
- ⚠️ More setup (direct API key, optional extras)

**Provider config**:

```json
{
  "type": "mistral-ocr",
  "model": "mistral-ocr-latest",
  "api_key": "sk-...",
  "extras": {
    "tableFormat": "markdown",
    "extractHeader": true,
    "extractFooter": true
  }
}
```

**Example usage**:

```json
{
  "source": { "path": "./docs/report.pdf" },
  "page": 5,
  "provider": {
    "type": "mistral-ocr",
    "model": "mistral-ocr-latest",
    "api_key": "sk-...",
    "extras": { "tableFormat": "markdown" }
  }
}
```

**When to use**:
- Complex tables and layouts
- Technical diagrams with labels
- Documents requiring high accuracy
- When structure extraction matters

**When to use Vision instead**:
- Simple text extraction
- Speed is critical
- Lower cost requirements

### OpenAI Vision (similar pattern)

```typescript
// openai-ocr-wrapper.ts
import express from 'express';
import OpenAI from 'openai';

const app = express();
app.use(express.json({ limit: '50mb' }));
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/v1/ocr', async (req, res) => {
  const { image, model, language, extras } = req.body;
  const imageUrl = image.startsWith('data:') ? image : `data:image/png;base64,${image}`;
  const prompt = extras?.prompt || 'Extract all text; keep headings, lists, and tables; return markdown.';

  try {
    const completion = await client.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageUrl } }] }],
      temperature: extras?.temperature ?? 0,
      max_tokens: extras?.max_tokens ?? 4000
    });

    res.json({ text: completion.choices[0].message.content, language });
  } catch (error) {
    res.status(500).json({ error: error.message || 'OCR processing failed' });
  }
});

app.listen(3001, () => console.log('OpenAI OCR wrapper on http://localhost:3001'));
```

**Setup**

```bash
npm init -y
npm install express openai dotenv
echo "OPENAI_API_KEY=sk-..." > .env
npx tsx openai-ocr-wrapper.ts
```

**Provider config**

```json
{
  "type": "http",
  "endpoint": "http://localhost:3001/v1/ocr",
  "model": "gpt-4o-mini",
  "language": "en"
}
```

### Google Cloud Vision (brief JSON wrapper)

```typescript
// gcv-ocr-wrapper.ts
import express from 'express';
import vision from '@google-cloud/vision';

const app = express();
app.use(express.json({ limit: '50mb' }));
const client = new vision.ImageAnnotatorClient();

app.post('/v1/ocr', async (req, res) => {
  const { image, language } = req.body;
  const imageContent = image.startsWith('data:') ? image.split(',')[1] : image;

  try {
    const [result] = await client.documentTextDetection({ image: { content: imageContent } });
    const text = result.fullTextAnnotation?.text || '';
    res.json({ text, language });
  } catch (error) {
    res.status(500).json({ error: error.message || 'OCR processing failed' });
  }
});

app.listen(3002, () => console.log('GCV OCR wrapper on http://localhost:3002'));
```

**Setup**

```bash
npm init -y
npm install express @google-cloud/vision dotenv
# Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
npx tsx gcv-ocr-wrapper.ts
```

**Provider config**

```json
{
  "type": "http",
  "endpoint": "http://localhost:3002/v1/ocr",
  "language": "en"
}
```

## Environment variables

- `MISTRAL_API_KEY`, `OPENAI_API_KEY` — required for their wrappers.
- `GOOGLE_APPLICATION_CREDENTIALS` — path to a service account JSON with Vision scope.
- Optional: `PROXY`, `HTTPS_PROXY` if wrappers run behind egress controls.

Load keys via `.env` in wrapper projects; the MCP server does not read them directly when calling `type: "http"` providers.

## Testing with a mock provider

Use a no-network stub to validate end-to-end OCR flows:

```typescript
// mock-ocr-wrapper.ts
import express from 'express';
const app = express();
app.use(express.json({ limit: '5mb' }));
app.post('/v1/ocr', (req, res) => res.json({ text: `MOCK TEXT for page/image`, language: req.body.language || 'en' }));
app.listen(3999, () => console.log('Mock OCR wrapper on http://localhost:3999'));
```

Point `provider.endpoint` to `http://localhost:3999/v1/ocr` and run `pdf_ocr_page` to confirm request shape, cache keys, and error handling without consuming API quota.

## Troubleshooting

- HTTP 401/403: confirm API keys and that the wrapper forwards `Authorization` if your upstream expects it.
- Empty or partial text: increase render `scale` (e.g., 1.5–2.0) or raise `max_tokens` in `extras`.
- Mixed languages: set `language` or include a hint in `extras.prompt`.
- Timeouts: wrappers should set generous `express.json` limits and upstream timeouts; large pages can exceed 10s on some providers.
- Wrong endpoint: verify the MCP server can reach `http://localhost:PORT`; Docker/WSL may need `0.0.0.0` binding.

## Cache behavior

- OCR caches are keyed by source fingerprint, page/index, scale (for `pdf_ocr_page`), provider endpoint, model, language, and `extras`.
- `cache: true` reuses prior responses and skips provider calls; `cache: false` forces a fresh request and updates the cache.
- Manage caches with `pdf_cache_stats` (inspect keys/counts) and `pdf_cache_clear` (`scope: "ocr"` or `"all"`).
- When wrappers change prompts or models, bump `extras.prompt` or `model` to avoid stale responses.
