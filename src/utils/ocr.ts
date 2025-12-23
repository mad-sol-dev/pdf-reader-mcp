import { Mistral } from '@mistralai/mistralai';

export interface OcrProviderOptions {
  name?: string | undefined;
  type?: 'http' | 'mock' | 'mistral' | 'mistral-ocr' | undefined;
  endpoint?: string | undefined;
  api_key?: string | undefined;
  model?: string | undefined;
  language?: string | undefined;
  timeout_ms?: number | undefined;
  extras?: Record<string, unknown> | undefined;
}

export type LooseOcrProviderOptions = {
  name?: string | undefined;
  type?: string | undefined;
  endpoint?: string | undefined;
  api_key?: string | undefined;
  model?: string | undefined;
  language?: string | undefined;
  timeout_ms?: number | undefined;
  extras?: Record<string, unknown> | undefined;
};

interface MistralOcrImage {
  bbox?: [number, number, number, number];
  width?: number;
  height?: number;
  base64?: string;
}

interface MistralOcrTable {
  html?: string;
  bbox?: [number, number, number, number];
}

interface MistralOcrPage {
  index: number;
  markdown: string;
  images?: MistralOcrImage[];
  tables?: MistralOcrTable[];
  hyperlinks?: string[];
  header?: string | null;
  footer?: string | null;
  dimensions?: {
    width: number;
    height: number;
  };
}

interface MistralOcrUsageInfo {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface OcrResult {
  provider: string;
  text: string;
  // Optional full response fields (Mistral OCR only)
  pages?: MistralOcrPage[];
  model?: string;
  usage_info?: MistralOcrUsageInfo;
}

const DEFAULT_OCR_TIMEOUT_MS = 15000;
const DEFAULT_MISTRAL_ENDPOINT = 'https://api.mistral.ai/v1/chat/completions';

/**
 * Creates a default OCR provider from environment variables.
 * Priority: MISTRAL_API_KEY → mock provider
 */
const getDefaultProvider = (): OcrProviderOptions => {
  const mistralKey = process.env.MISTRAL_API_KEY;

  if (mistralKey) {
    return {
      type: 'mistral-ocr',
      api_key: mistralKey,
      name: 'mistral-ocr-default',
    };
  }

  // No API key available - use mock provider
  return {
    type: 'mock',
    name: 'mock-default',
  };
};

/**
 * Gets configured OCR provider from environment variables.
 * Returns undefined if no provider is configured (no API keys available).
 * This is used for auto-fallback scenarios where we want to return images
 * instead of attempting OCR when no provider is available.
 */
export const getConfiguredProvider = (): OcrProviderOptions | undefined => {
  const mistralKey = process.env.MISTRAL_API_KEY;

  if (mistralKey) {
    return {
      type: 'mistral-ocr',
      api_key: mistralKey,
      name: 'mistral-ocr-default',
    };
  }

  // No API key available - return undefined for auto-fallback
  return undefined;
};

const resolveTimeoutMs = (provider?: OcrProviderOptions): number =>
  provider?.timeout_ms && provider.timeout_ms > 0 ? provider.timeout_ms : DEFAULT_OCR_TIMEOUT_MS;

const fetchWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error: unknown) {
    if (timedOut) {
      throw new Error(`OCR request timed out after ${timeoutMs}ms.`);
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`OCR request timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const handleMockOcr = (provider?: OcrProviderOptions): OcrResult => ({
  provider: provider?.name ?? 'mock',
  text: 'OCR provider not configured. Supply provider options to enable OCR.',
});

const handleHttpOcr = async (
  base64Image: string,
  provider: OcrProviderOptions
): Promise<OcrResult> => {
  if (!provider.endpoint) {
    throw new Error('HTTP OCR provider requires an endpoint.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (provider.api_key) {
    headers['Authorization'] = `Bearer ${provider.api_key}`;
  }

  const response = await fetchWithTimeout(
    provider.endpoint,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        image: base64Image,
        model: provider.model,
        language: provider.language,
        extras: provider.extras,
      }),
    },
    resolveTimeoutMs(provider)
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OCR provider request failed with status ${response.status}: ${errorText || response.statusText}`
    );
  }

  const data = (await response.json()) as { text?: string; ocr?: string };
  const text = data.text ?? data.ocr;

  if (!text) {
    throw new Error('OCR provider response missing text field.');
  }

  return {
    provider: provider.name ?? 'http',
    text,
  };
};

const handleMistralOcr = async (
  base64Image: string,
  provider: OcrProviderOptions
): Promise<OcrResult> => {
  const apiKey = provider.api_key ?? process.env['MISTRAL_API_KEY'];
  if (!apiKey) {
    throw new Error('Mistral OCR provider requires MISTRAL_API_KEY.');
  }

  const endpoint = provider.endpoint ?? DEFAULT_MISTRAL_ENDPOINT;
  const imageUrl = base64Image.startsWith('data:')
    ? base64Image
    : `data:image/png;base64,${base64Image}`;
  const prompt =
    (provider.extras && typeof provider.extras['prompt'] === 'string'
      ? provider.extras['prompt']
      : undefined) ??
    'Extract and transcribe all text from this image. Preserve layout and return markdown.';
  const temperature =
    provider.extras && typeof provider.extras['temperature'] === 'string'
      ? Number.parseFloat(provider.extras['temperature'])
      : undefined;
  const maxTokens =
    provider.extras && typeof provider.extras['max_tokens'] === 'string'
      ? Number.parseInt(provider.extras['max_tokens'], 10)
      : undefined;

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model ?? 'mistral-large-2512',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: imageUrl },
            ],
          },
        ],
        temperature: Number.isFinite(temperature) ? temperature : 0,
        max_tokens: Number.isFinite(maxTokens) ? maxTokens : 4000,
      }),
    },
    resolveTimeoutMs(provider)
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Mistral OCR request failed with status ${response.status}: ${errorText || response.statusText}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
    text?: string;
  };
  const content = data.text ?? data.choices?.[0]?.message?.content;
  let text: string | undefined;

  if (typeof content === 'string') {
    text = content;
  } else if (Array.isArray(content)) {
    text = content
      .map((chunk) => chunk.text)
      .filter(Boolean)
      .join('');
  }

  if (!text) {
    throw new Error('Mistral OCR response missing text field.');
  }

  return {
    provider: provider.name ?? 'mistral',
    text,
  };
};

const handleMistralOcrDedicated = async (
  base64Image: string,
  provider: OcrProviderOptions
): Promise<OcrResult> => {
  const apiKey = provider.api_key ?? process.env['MISTRAL_API_KEY'];
  if (!apiKey) {
    throw new Error('Mistral OCR provider requires MISTRAL_API_KEY.');
  }

  const client = new Mistral({ apiKey });
  const payload = base64Image.startsWith('data:') ? (base64Image.split(',')[1] ?? '') : base64Image;
  const buffer = Buffer.from(payload, 'base64');
  const tableFormat =
    provider.extras && typeof provider.extras['tableFormat'] === 'string'
      ? provider.extras['tableFormat']
      : 'markdown';

  // Helper to parse boolean from string or boolean
  const parseBool = (value: unknown): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return false;
  };

  const includeFullResponse = parseBool(provider.extras?.['includeFullResponse']);
  const includeImageBase64 = parseBool(provider.extras?.['includeImageBase64']);
  const extractHeader = parseBool(provider.extras?.['extractHeader']);
  const extractFooter = parseBool(provider.extras?.['extractFooter']);

  let uploadedId: string | undefined;

  try {
    const uploaded = await client.files.upload({
      file: { fileName: 'page.png', content: buffer },
      purpose: 'ocr',
    });
    uploadedId = uploaded.id;

    const result = await client.ocr.process({
      model: provider.model ?? 'mistral-ocr-latest',
      document: { fileId: uploadedId },
      tableFormat,
      ...(includeImageBase64 ? { includeImageBase64 } : {}),
      ...(extractHeader ? { extractHeader } : {}),
      ...(extractFooter ? { extractFooter } : {}),
    });
    const text = result.pages?.[0]?.markdown;

    if (!text) {
      throw new Error('Mistral OCR response missing text field.');
    }

    // Basic response (backward compatible)
    const basicResponse: OcrResult = {
      provider: provider.name ?? 'mistral-ocr',
      text,
    };

    // Return full response if requested
    if (includeFullResponse) {
      return {
        ...basicResponse,
        pages: result.pages,
        model: result.model,
        usage_info: result.usage_info,
      };
    }

    return basicResponse;
  } finally {
    if (uploadedId) {
      try {
        await client.files.delete({ fileId: uploadedId });
      } catch {
        // Ignore cleanup failures to preserve original errors.
      }
    }
  }
};

export const sanitizeProviderOptions = (
  provider?: LooseOcrProviderOptions
): OcrProviderOptions | undefined => {
  if (!provider) {
    return undefined;
  }

  const sanitized: OcrProviderOptions = {};

  if (typeof provider.name === 'string') sanitized.name = provider.name;
  if (
    provider.type === 'http' ||
    provider.type === 'mock' ||
    provider.type === 'mistral' ||
    provider.type === 'mistral-ocr'
  ) {
    sanitized.type = provider.type;
  }
  if (typeof provider.endpoint === 'string') sanitized.endpoint = provider.endpoint;
  if (typeof provider.api_key === 'string') sanitized.api_key = provider.api_key;
  if (typeof provider.model === 'string') sanitized.model = provider.model;
  if (typeof provider.language === 'string') sanitized.language = provider.language;
  if (typeof provider.timeout_ms === 'number') sanitized.timeout_ms = provider.timeout_ms;
  if (provider.extras) sanitized.extras = provider.extras;

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
};

export const performOcr = async (
  base64Image: string,
  provider?: OcrProviderOptions
): Promise<OcrResult> => {
  // Use default provider from env if none provided
  const resolvedProvider = provider ?? getDefaultProvider();

  if (!resolvedProvider || resolvedProvider.type === 'mock') {
    return handleMockOcr(resolvedProvider);
  }

  if (resolvedProvider.type === 'http') {
    return handleHttpOcr(base64Image, resolvedProvider);
  }

  if (resolvedProvider.type === 'mistral') {
    return handleMistralOcr(base64Image, resolvedProvider);
  }

  if (resolvedProvider.type === 'mistral-ocr') {
    return handleMistralOcrDedicated(base64Image, resolvedProvider);
  }

  throw new Error('Unsupported OCR provider configuration.');
};
