import path from 'node:path';
import { ErrorCode, PdfError } from './errors.js';

// Use the server's current working directory as the project root.
// This relies on the process launching the server to set the CWD correctly.
export const PROJECT_ROOT = process.cwd();
const ENV_ALLOWED_PATHS = 'PDF_ALLOWED_PATHS';
const ENV_BASE_DIR = 'PDF_BASE_DIR';
const ENV_ALLOW_UNSAFE_ABSOLUTE = 'PDF_ALLOW_UNSAFE_ABSOLUTE';

const parseAllowedRoots = (value: string | undefined): string[] | undefined => {
  if (!value) {
    return undefined;
  }
  return value
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

export const getPathGuardConfig = (): ResolvePathOptions => ({
  baseDir: process.env[ENV_BASE_DIR] ?? PROJECT_ROOT,
  allowedRoots: parseAllowedRoots(process.env[ENV_ALLOWED_PATHS]),
  allowUnsafeAbsolute: process.env[ENV_ALLOW_UNSAFE_ABSOLUTE] === 'true',
});

type ResolvePathOptions = {
  allowedRoots?: string[];
  baseDir?: string;
  allowUnsafeAbsolute?: boolean;
};

const isWithinRoot = (root: string, target: string): boolean => {
  const normalizedRoot = path.resolve(root);
  const normalizedTarget = path.resolve(target);
  const relative = path.relative(normalizedRoot, normalizedTarget);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

/**
 * Resolves a user-provided path, accepting both absolute and relative paths.
 * Relative paths are resolved against the current working directory (PROJECT_ROOT).
 * @param userPath The path provided by the user (absolute or relative).
 * @param options Optional constraints on allowed roots and absolute path behavior.
 * @returns The resolved absolute path.
 * @throws {PdfError} If path is invalid or outside allowed roots.
 */
export const resolvePath = (userPath: string, options: ResolvePathOptions = {}): string => {
  if (typeof userPath !== 'string') {
    throw new PdfError(ErrorCode.InvalidParams, 'Path must be a string.');
  }

  const envConfig = getPathGuardConfig();
  const baseDir = options.baseDir ?? envConfig.baseDir ?? PROJECT_ROOT;
  const allowedRoots = options.allowedRoots ?? envConfig.allowedRoots ?? [baseDir];
  const allowUnsafeAbsolute = options.allowUnsafeAbsolute ?? envConfig.allowUnsafeAbsolute ?? false;

  const normalizedUserPath = path.normalize(userPath);
  const resolvedPath = path.isAbsolute(normalizedUserPath)
    ? normalizedUserPath
    : path.resolve(baseDir, normalizedUserPath);

  if (path.isAbsolute(normalizedUserPath) && allowUnsafeAbsolute) {
    return path.normalize(resolvedPath);
  }

  const isAllowed = allowedRoots.some((root) => isWithinRoot(root, resolvedPath));
  if (!isAllowed) {
    throw new PdfError(
      ErrorCode.InvalidRequest,
      `Resolved path is outside the allowed directories.`
    );
  }

  return path.normalize(resolvedPath);
};
