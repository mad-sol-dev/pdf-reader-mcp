# Mistral Vision OCR Wrapper

Standalone Express + TypeScript service that wraps the Mistral Vision API for OCR workloads. It exposes a single `/v1/ocr` endpoint with production-friendly defaults (logging, CORS, body limits, health check, graceful shutdown).

## Quick Start
1. Copy environment file and set your key:
   ```bash
   cp .env.example .env
   echo "MISTRAL_API_KEY=sk-..." >> .env
   ```
2. Install dependencies (Node 18+):
   ```bash
   npm install
   ```
3. Start in watch mode during development:
   ```bash
   npm run dev
   ```
4. Build and run for production:
   ```bash
   npm run build
   npm start
   ```

The service listens on `PORT` (default `3000`).

## Environment Variables
- `MISTRAL_API_KEY` (required): API key for Mistral.
- `PORT` (optional): HTTP port, defaults to `3000`.
- `MISTRAL_MODEL` (optional): Default model used when requests omit `model` (defaults to `mistral-large-2512`).

## API
### POST /v1/ocr
Extract text from an image using Mistral Vision.

**Request Body**
```json
{
  "image": "<base64 string or data URI>",
  "model": "mistral-large-2512",
  "language": "en",
  "extras": {
    "prompt": "Optional prompt override",
    "temperature": 0,
    "maxTokens": 4000
  }
}
```
- `image` (required): Base64-encoded image or data URI. If only base64 is provided, the server wraps it with `data:image/png;base64,`.
- `model` (optional): Vision-capable model. Defaults to `MISTRAL_MODEL` or `mistral-large-2512`.
- `language` (optional): Requested response language (used to hint the prompt).
- `extras` (optional):
  - `prompt`: Custom prompt text.
  - `temperature`: Generation temperature (default `0`).
  - `maxTokens` / `max_tokens`: Token limit (default `4000`).

**Response Body**
```json
{
  "text": "<extracted markdown text>",
  "language": "en"
}
```

**Error Codes**
- `400`: Validation errors (missing/invalid body fields).
- `502`: Mistral API failure.
- `500`: Unexpected server error.

### GET /health
Simple health probe with uptime info.

## Example Requests
Using `curl` with a data URI (replace `<DATA_URI>`):
```bash
curl -X POST http://localhost:3000/v1/ocr \
  -H "Content-Type: application/json" \
  -d '{
    "image": "<DATA_URI>",
    "language": "en"
  }'
```

Using base64 content (server will wrap it as PNG):
```bash
curl -X POST http://localhost:3000/v1/ocr \
  -H "Content-Type: application/json" \
  -d '{
    "image": "<BASE64_STRING>",
    "model": "mistral-large-2512",
    "extras": { "temperature": 0, "maxTokens": 4000 }
  }'
```

## Deployment Options
### Docker (example)
```Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY dist ./dist
CMD ["node", "dist/index.js"]
```
Build and run:
```bash
npm run build
docker build -t mistral-ocr-wrapper .
docker run -p 3000:3000 --env-file .env mistral-ocr-wrapper
```

### systemd (excerpt)
```
[Unit]
Description=Mistral OCR Wrapper
After=network.target

[Service]
WorkingDirectory=/opt/mistral-ocr-wrapper
ExecStart=/usr/bin/node dist/index.js
EnvironmentFile=/opt/mistral-ocr-wrapper/.env
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### PM2
```bash
npm install -g pm2
npm run build
pm2 start dist/index.js --name mistral-ocr-wrapper --env production
pm2 logs mistral-ocr-wrapper
```

## Notes
- Request payloads are capped at 50 MB.
- CORS is enabled for broad compatibility; tighten origins if needed.
- The service performs graceful shutdown on `SIGINT`/`SIGTERM` to finish in-flight requests.
