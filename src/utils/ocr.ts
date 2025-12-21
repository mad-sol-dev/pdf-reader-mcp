export interface OcrProviderOptions {
  name?: string;
  type?: 'http' | 'mock';
  endpoint?: string;
  api_key?: string;
  model?: string;
  language?: string;
  extras?: Record<string, unknown>;
}

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
    headers.Authorization = `Bearer ${provider.api_key}`;
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
