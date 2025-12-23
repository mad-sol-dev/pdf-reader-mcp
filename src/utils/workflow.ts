/**
 * Workflow guidance utilities for LLM agents
 *
 * Provides next_step suggestions to help LLMs understand the 3-stage workflow:
 * Stage 1: pdf_read (text extraction)
 * Stage 2: pdf_extract_image (vision analysis)
 * Stage 3: pdf_ocr (OCR for text in images)
 */

export interface NextStepHint {
  suggestion: string;
  recommended_tools?: string[];
}

interface WorkflowContext {
  stage: 'info' | 'read' | 'extract' | 'ocr' | 'search';
  hasImages?: boolean;
  imageCount?: number;
  hasText?: boolean;
  hasToc?: boolean;
  isScannedPage?: boolean;
}

const buildInfoStageHint = (): NextStepHint => ({
  suggestion: 'Use pdf_read (Stage 1) to extract content, or pdf_search to find specific text.',
  recommended_tools: ['pdf_read', 'pdf_search'],
});

const buildReadStageHint = (context: WorkflowContext): NextStepHint | undefined => {
  // Scanned page with no text
  if (!context.hasText && !context.hasImages) {
    return {
      suggestion:
        'No text or images found. This may be a scanned page. Use pdf_ocr (Stage 3) to OCR the entire page.',
      recommended_tools: ['pdf_ocr'],
    };
  }

  // Page has images
  if (context.hasImages && context.imageCount && context.imageCount > 0) {
    return {
      suggestion: `Found ${context.imageCount} image(s). Use pdf_extract_image (Stage 2) for diagrams/charts, or pdf_ocr (Stage 3) if images contain text.`,
      recommended_tools: ['pdf_extract_image', 'pdf_ocr'],
    };
  }

  // Page has text only
  if (context.hasText) {
    return {
      suggestion: 'Text extraction complete.',
    };
  }

  return undefined;
};

const buildExtractStageHint = (): NextStepHint => ({
  suggestion:
    'Image extracted for vision analysis. If other images contain text, use pdf_ocr (Stage 3).',
  recommended_tools: ['pdf_ocr'],
});

const buildOcrStageHint = (): NextStepHint => ({
  suggestion: 'OCR complete. Text extracted from image.',
});

const buildSearchStageHint = (): NextStepHint => ({
  suggestion: 'Search complete. Use pdf_read on relevant pages for full content.',
  recommended_tools: ['pdf_read'],
});

/**
 * Builds a next_step hint based on the current workflow stage and context
 */
export function buildNextStep(context: WorkflowContext): NextStepHint | undefined {
  if (context.stage === 'info') return buildInfoStageHint();
  if (context.stage === 'read') return buildReadStageHint(context);
  if (context.stage === 'extract') return buildExtractStageHint();
  if (context.stage === 'ocr') return buildOcrStageHint();
  if (context.stage === 'search') return buildSearchStageHint();
  return undefined;
}
