import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { performOcr } from '../../src/utils/ocr.js';

const mistralMocks = vi.hoisted(() => {
  const upload = vi.fn();
  const process = vi.fn();
  const remove = vi.fn();
  const ctor = vi.fn().mockImplementation(() => ({
    files: { upload, delete: remove },
    ocr: { process },
  }));

  return { upload, process, remove, ctor };
});

vi.mock('@mistralai/mistralai', () => ({ Mistral: mistralMocks.ctor }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('performOcr (mistral provider)', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
    process.env.MISTRAL_API_KEY = undefined;
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = { ...envBackup };
    vi.useRealTimers();
  });

  it('throws when MISTRAL_API_KEY is missing', async () => {
    await expect(performOcr('base64-image', { type: 'mistral' })).rejects.toThrow(
      'Mistral OCR provider requires MISTRAL_API_KEY.'
    );
  });

  it('times out Mistral requests and aborts fetch', async () => {
    vi.useFakeTimers();
    process.env.MISTRAL_API_KEY = 'test-key';

    mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const abortError = new Error('Aborted');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      });
    });

    const promise = performOcr('base64-image', {
      type: 'mistral',
      timeout_ms: 10,
      endpoint: 'https://api.mistral.ai/v1/chat/completions',
    });

    const assertion = expect(promise).rejects.toThrow('OCR request timed out after 10ms.');
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('returns text for successful Mistral responses', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';

    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Extracted text' } }],
        }),
        { status: 200 }
      )
    );

    const result = await performOcr('base64-image', {
      type: 'mistral',
      model: 'mistral-large-2512',
    });

    expect(result).toEqual({ provider: 'mistral', text: 'Extracted text' });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.mistral.ai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      })
    );
  });
});

describe('performOcr (mistral-ocr provider)', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
    process.env.MISTRAL_API_KEY = undefined;
    mistralMocks.upload.mockReset();
    mistralMocks.process.mockReset();
    mistralMocks.remove.mockReset();
    mistralMocks.ctor.mockClear();
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('throws when MISTRAL_API_KEY is missing', async () => {
    await expect(performOcr('base64-image', { type: 'mistral-ocr' })).rejects.toThrow(
      'Mistral OCR provider requires MISTRAL_API_KEY.'
    );
  });

  it('uploads image, processes OCR, and deletes the temp file', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    mistralMocks.upload.mockResolvedValue({ id: 'file-123' });
    mistralMocks.process.mockResolvedValue({
      pages: [{ markdown: 'Extracted markdown' }],
    });
    mistralMocks.remove.mockResolvedValue({});

    const result = await performOcr('YmFzZTY0LWltYWdl', {
      type: 'mistral-ocr',
      model: 'mistral-ocr-latest',
      extras: { tableFormat: 'markdown' },
    });

    expect(result).toEqual({ provider: 'mistral-ocr', text: 'Extracted markdown' });
    expect(mistralMocks.ctor).toHaveBeenCalledWith({ apiKey: 'test-key' });
    expect(mistralMocks.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'ocr',
        file: expect.objectContaining({
          fileName: 'page.png',
          content: expect.any(Buffer),
        }),
      })
    );
    expect(mistralMocks.process).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mistral-ocr-latest',
        document: { fileId: 'file-123' },
        tableFormat: 'markdown',
      })
    );
    expect(mistralMocks.remove).toHaveBeenCalledWith({ fileId: 'file-123' });
  });

  it('cleans up uploaded file when OCR processing fails', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    mistralMocks.upload.mockResolvedValue({ id: 'file-456' });
    mistralMocks.process.mockRejectedValue(new Error('OCR failed'));
    mistralMocks.remove.mockResolvedValue({});

    await expect(
      performOcr('YmFzZTY0LWltYWdl', {
        type: 'mistral-ocr',
      })
    ).rejects.toThrow('OCR failed');

    expect(mistralMocks.remove).toHaveBeenCalledWith({ fileId: 'file-456' });
  });
});
