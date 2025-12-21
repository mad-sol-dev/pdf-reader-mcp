import crypto from 'node:crypto';
import type * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export const getDocumentFingerprint = (
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  sourceDescription: string
): string => {
  const fingerprint = pdfDocument.fingerprints?.[0];
  if (fingerprint) return fingerprint;

  const fallback = `${sourceDescription}-${pdfDocument.numPages}`;
  return crypto.createHash('sha256').update(fallback).digest('hex');
};
