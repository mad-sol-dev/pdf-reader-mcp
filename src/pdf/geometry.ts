// Affine transformation matrix utilities for PDF coordinate transforms

/**
 * 6-element affine transformation matrix: [a, b, c, d, e, f]
 * Represents: | a c e |
 *             | b d f |
 *             | 0 0 1 |
 *
 * Used to transform coordinates from PDF space to viewport (screen) space,
 * accounting for rotation, scaling, and translation.
 */
export type Transform6 = readonly [number, number, number, number, number, number];

/**
 * Multiply two 2D affine transformation matrices
 *
 * This is used to combine viewport transformation with item transformation.
 * Matrix multiplication order: result = m1 × m2
 *
 * @param m1 - First transformation matrix (typically viewport transform)
 * @param m2 - Second transformation matrix (typically item transform)
 * @returns Combined transformation matrix
 *
 * @example
 * const viewport: Transform6 = [1, 0, 0, -1, 0, 842]; // 90° rotation
 * const item: Transform6 = [12, 0, 0, 12, 100, 200]; // Text item transform
 * const combined = multiplyTransform(viewport, item);
 */
export const multiplyTransform = (m1: Transform6, m2: Transform6): Transform6 => {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;

  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
};

/**
 * Apply viewport transformation to PDF item transform
 *
 * Extracts the translation components (x, y) from the combined transform.
 * Returns screen coordinates where viewport y-axis typically runs top-to-bottom.
 *
 * @param viewportTransform - Viewport transformation matrix from page.getViewport()
 * @param itemTransform - Item transformation matrix (e.g., textItem.transform)
 * @returns Screen coordinates {x, y}
 *
 * @example
 * const viewport = page.getViewport({ scale: 1.0 });
 * const viewportT = viewport.transform as Transform6;
 * const itemT = textItem.transform as Transform6;
 * const { x, y } = transformXY(viewportT, itemT);
 */
export const transformXY = (
  viewportTransform: Transform6,
  itemTransform: Transform6
): { x: number; y: number } => {
  const combined = multiplyTransform(viewportTransform, itemTransform);
  // Translation components are at indices 4 (x) and 5 (y)
  return { x: combined[4], y: combined[5] };
};

/**
 * Calculate epsilon tolerance for line grouping based on font size
 *
 * Text items within epsilon distance on the Y-axis are considered to be on the same line.
 * Uses a dynamic epsilon based on font size when available, with a sensible default.
 *
 * @param fontSize - Font size in points (optional)
 * @returns Epsilon value for line grouping
 *
 * @example
 * const epsilon = calculateLineEpsilon(12); // Returns 2.4 (12 × 0.2)
 * const defaultEpsilon = calculateLineEpsilon(); // Returns 2.5
 */
export const calculateLineEpsilon = (fontSize?: number): number => {
  const DEFAULT_EPSILON = 2.5;
  const EPSILON_RATIO = 0.2; // 20% of font size

  return fontSize && fontSize > 0 ? fontSize * EPSILON_RATIO : DEFAULT_EPSILON;
};
