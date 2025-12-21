export interface OcrProviderOptions {
  name?: string | undefined;
  type?: 'http' | 'mock' | undefined;
  endpoint?: string | undefined;
  api_key?: string | undefined;
  model?: string | undefined;
  language?: string | undefined;
  extras?: Record<string, unknown> | undefined;
}

export type LooseOcrProviderOptions = {
  name?: string | undefined;
  type?: string | undefined;
  endpoint?: string | undefined;
  api_key?: string | undefined;
  model?: string | undefined;
  language?: string | undefined;
  extras?: Record<string, unknown> | undefined;
};

interface OcrResult {
  provider: string;
  text: string;
}

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

  const response = await fetch(provider.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      image: base64Image,
      model: provider.model,
      language: provider.language,
      extras: provider.extras,
    }),
  });

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

export const sanitizeProviderOptions = (
  provider?: LooseOcrProviderOptions
): OcrProviderOptions | undefined => {
  if (!provider) {
    return undefined;
  }

  const sanitized: OcrProviderOptions = {};

  if (typeof provider.name === 'string') sanitized.name = provider.name;
  if (provider.type === 'http' || provider.type === 'mock') sanitized.type = provider.type;
  if (typeof provider.endpoint === 'string') sanitized.endpoint = provider.endpoint;
  if (typeof provider.api_key === 'string') sanitized.api_key = provider.api_key;
  if (typeof provider.model === 'string') sanitized.model = provider.model;
  if (typeof provider.language === 'string') sanitized.language = provider.language;
  if (provider.extras) sanitized.extras = provider.extras;

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
};

export const performOcr = async (
  base64Image: string,
  provider?: OcrProviderOptions
): Promise<OcrResult> => {
  if (!provider || provider.type === 'mock') {
    return handleMockOcr(provider);
  }

  if (provider.type === 'http') {
    return handleHttpOcr(base64Image, provider);
  }

  throw new Error('Unsupported OCR provider configuration.');
};
