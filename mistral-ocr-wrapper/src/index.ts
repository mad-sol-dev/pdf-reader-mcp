import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { Server } from 'http';
import morgan from 'morgan';
import { Mistral } from '@mistralai/mistralai';

dotenv.config();

const DEFAULT_PORT = 3000;
const DEFAULT_MODEL = process.env.MISTRAL_MODEL ?? 'mistral-large-2512';
const MAX_BODY_SIZE = '50mb';
const DEFAULT_PROMPT =
  'Extract and transcribe all text from this image. Preserve the layout, structure, headings, lists, tables, and formatting as much as possible. Return the text in markdown format.';

if (!process.env.MISTRAL_API_KEY) {
  console.error('MISTRAL_API_KEY is required to start the OCR wrapper service.');
  process.exit(1);
}

const app = express();
const mistralClient = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

app.use(morgan('combined'));
app.use(cors());
app.use(express.json({ limit: MAX_BODY_SIZE }));

interface OcrExtras {
  prompt?: string;
  temperature?: number;
  maxTokens?: number;
  max_tokens?: number;
}

interface OcrRequestBody {
  image?: string;
  model?: string;
  language?: string;
  extras?: OcrExtras;
}

const parsePort = (value?: string): number => {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    console.warn(`Invalid PORT value "${value}". Falling back to ${DEFAULT_PORT}.`);
    return DEFAULT_PORT;
  }

  return parsed;
};

const buildImageDataUri = (image: string): string => {
  const trimmed = image.trim();
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }

  return `data:image/png;base64,${trimmed}`;
};

const buildPrompt = (language?: string, overridePrompt?: string): string => {
  const basePrompt = overridePrompt?.trim() || DEFAULT_PROMPT;

  if (!language) {
    return basePrompt;
  }

  return `${basePrompt}\n\nRespond in ${language} and keep any non-text elements (like tables) in markdown.`;
};

const normalizeExtras = (extras?: OcrExtras): OcrExtras | undefined => {
  if (!extras) {
    return undefined;
  }

  const normalized: OcrExtras = {};

  if (typeof extras.prompt === 'string' && extras.prompt.trim()) {
    normalized.prompt = extras.prompt;
  }

  if (typeof extras.temperature === 'number' && Number.isFinite(extras.temperature)) {
    normalized.temperature = extras.temperature;
  }

  if (typeof extras.maxTokens === 'number' && Number.isFinite(extras.maxTokens)) {
    normalized.maxTokens = extras.maxTokens;
  } else if (typeof extras.max_tokens === 'number' && Number.isFinite(extras.max_tokens)) {
    normalized.maxTokens = extras.max_tokens;
  }

  return normalized;
};

const validateRequest = (
  body: OcrRequestBody,
): { errors: string[]; payload?: Required<Pick<OcrRequestBody, 'image'>> & OcrRequestBody } => {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    errors.push('Request body must be a JSON object.');
    return { errors };
  }

  if (typeof body.image !== 'string' || !body.image.trim()) {
    errors.push('Field "image" is required and must be a non-empty string (base64 or data URI).');
  }

  if (body.language && typeof body.language !== 'string') {
    errors.push('Field "language" must be a string if provided.');
  }

  if (body.model && typeof body.model !== 'string') {
    errors.push('Field "model" must be a string if provided.');
  }

  if (body.extras && typeof body.extras !== 'object') {
    errors.push('Field "extras" must be an object if provided.');
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors,
    payload: {
      image: body.image!.trim(),
      language: body.language?.trim(),
      model: body.model?.trim(),
      extras: normalizeExtras(body.extras),
    },
  };
};

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.post('/v1/ocr', async (req: Request, res: Response, next: NextFunction) => {
  const { errors, payload } = validateRequest(req.body ?? {});

  if (errors.length > 0 || !payload) {
    return res.status(400).json({ error: 'Invalid request', details: errors });
  }

  const { image, model, language, extras } = payload;
  const prompt = buildPrompt(language, extras?.prompt);
  const imageDataUri = buildImageDataUri(image);

  try {
    const response = await mistralClient.chat.complete({
      model: model || DEFAULT_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              imageUrl: { url: imageDataUri },
            },
          ],
        },
      ],
      temperature: extras?.temperature ?? 0,
      maxTokens: extras?.maxTokens ?? 4000,
    });

    const text = response.choices?.[0]?.message?.content ?? '';

    return res.json({
      text,
      language: language || 'unspecified',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OCR processing failed';
    console.error('Mistral API error:', error);
    return next({ statusCode: 502, message });
  }
});

app.use((err: { statusCode?: number; message?: string }, _req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) {
    return;
  }

  const status = err?.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = err?.message || 'Internal server error';

  res.status(status).json({ error: message });
});

const port = parsePort(process.env.PORT);
let server: Server;

server = app.listen(port, () => {
  console.log(`Mistral OCR wrapper running on http://localhost:${port}`);
});

const shutdown = (signal: NodeJS.Signals) => {
  console.log(`Received ${signal}, shutting down gracefully...`);

  server.close((closeError) => {
    if (closeError) {
      console.error('Error during server shutdown:', closeError);
      process.exit(1);
    }

    console.log('HTTP server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Force exiting after graceful shutdown timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
