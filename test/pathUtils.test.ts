import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ErrorCode, PdfError } from '../src/utils/errors.js';
import { PROJECT_ROOT, getPathGuardConfig, resolvePath } from '../src/utils/pathUtils.js';

describe('resolvePath Utility', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
    delete process.env.PDF_ALLOWED_PATHS;
    delete process.env.PDF_BASE_DIR;
    delete process.env.PDF_ALLOW_UNSAFE_ABSOLUTE;
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('should resolve a valid relative path correctly', () => {
    const userPath = 'some/file.txt';
    const expectedPath = path.resolve(PROJECT_ROOT, userPath);
    expect(resolvePath(userPath)).toBe(expectedPath);
  });

  it('should resolve paths with "." correctly', () => {
    const userPath = './some/./other/file.txt';
    const expectedPath = path.resolve(PROJECT_ROOT, 'some/other/file.txt');
    expect(resolvePath(userPath)).toBe(expectedPath);
  });

  it('should resolve paths with ".." correctly', () => {
    const userPath = 'some/folder/../other/file.txt';
    const expectedPath = path.resolve(PROJECT_ROOT, 'some/other/file.txt');
    expect(resolvePath(userPath)).toBe(expectedPath);
  });

  it('should accept absolute paths and return them normalized', () => {
    const userPath = path.resolve(PROJECT_ROOT, 'absolute/file.txt');
    expect(resolvePath(userPath)).toBe(path.normalize(userPath));
  });

  it('should reject relative paths that escape PROJECT_ROOT', () => {
    const userPath = '../outside/file.txt';
    expect(() => resolvePath(userPath)).toThrow(PdfError);
    expect(() => resolvePath(userPath)).toThrow('Resolved path is outside the allowed directories.');
  });

  it('should reject absolute paths outside allowed roots', () => {
    const absolutePath = path.sep === '/' ? '/etc/passwd' : 'C:\\Windows\\System32\\config.txt';
    expect(() => resolvePath(absolutePath)).toThrow(PdfError);
    expect(() => resolvePath(absolutePath)).toThrow('Resolved path is outside the allowed directories.');
  });

  it('should throw PdfError for non-string input', () => {
    const userPath = 123 as unknown as string;
    expect(() => resolvePath(userPath)).toThrow(PdfError);
    expect(() => resolvePath(userPath)).toThrow('Path must be a string.');
    try {
      resolvePath(userPath);
    } catch (e) {
      expect(e).toBeInstanceOf(PdfError);
      expect((e as PdfError).code).toBe(ErrorCode.InvalidParams);
    }
  });

  it('should handle empty string input', () => {
    const userPath = '';
    const expectedPath = path.resolve(PROJECT_ROOT, '');
    expect(resolvePath(userPath)).toBe(expectedPath);
  });

  it('should allow absolute paths when allowUnsafeAbsolute is true', () => {
    const absolutePath = path.sep === '/' ? '/etc/passwd' : 'C:\\Windows\\System32\\config.txt';
    expect(resolvePath(absolutePath, { allowUnsafeAbsolute: true })).toBe(path.normalize(absolutePath));
  });

  it('should allow paths within a custom allowed root', () => {
    const customRoot =
      path.sep === '/'
        ? path.join(path.sep, 'tmp', 'pdf-reader-root')
        : path.join('C:\\', 'temp', 'pdf-reader-root');
    const userPath = path.join('nested', 'file.txt');
    const resolved = resolvePath(userPath, { baseDir: customRoot, allowedRoots: [customRoot] });
    expect(resolved).toBe(path.resolve(customRoot, userPath));
  });

  it('should use environment allowlist when no options are provided', () => {
    const allowedRoot =
      path.sep === '/'
        ? path.join(path.sep, 'var', 'pdf-root')
        : path.join('C:\\', 'pdf-root');
    process.env.PDF_ALLOWED_PATHS = allowedRoot;
    process.env.PDF_BASE_DIR = allowedRoot;

    const config = getPathGuardConfig();
    const resolved = resolvePath('docs/file.pdf', config);
    expect(resolved).toBe(path.resolve(allowedRoot, 'docs/file.pdf'));
    expect(() => resolvePath('../escape.pdf', config)).toThrow(PdfError);
  });

  it('should allow unsafe absolute paths when enabled by environment', () => {
    const absolutePath = path.sep === '/' ? '/etc/passwd' : 'C:\\Windows\\System32\\config.txt';
    process.env.PDF_ALLOW_UNSAFE_ABSOLUTE = 'true';
    const config = getPathGuardConfig();
    expect(resolvePath(absolutePath, config)).toBe(path.normalize(absolutePath));
  });
});
