import { describe, expect, it } from 'vitest';
import { calculateLineEpsilon, multiplyTransform, type Transform6, transformXY } from '../../src/pdf/geometry.js';

describe('PDF Geometry Utilities', () => {
  describe('multiplyTransform', () => {
    it('should correctly multiply identity matrices', () => {
      const identity: Transform6 = [1, 0, 0, 1, 0, 0];
      const result = multiplyTransform(identity, identity);

      expect(result).toEqual([1, 0, 0, 1, 0, 0]);
    });

    it('should apply translation', () => {
      const identity: Transform6 = [1, 0, 0, 1, 0, 0];
      const translate: Transform6 = [1, 0, 0, 1, 10, 20]; // Translate by (10, 20)
      const result = multiplyTransform(identity, translate);

      expect(result).toEqual([1, 0, 0, 1, 10, 20]);
    });

    it('should apply scaling', () => {
      const identity: Transform6 = [1, 0, 0, 1, 0, 0];
      const scale: Transform6 = [2, 0, 0, 2, 0, 0]; // Scale by 2x
      const result = multiplyTransform(identity, scale);

      expect(result).toEqual([2, 0, 0, 2, 0, 0]);
    });

    it('should handle 90° rotation (clockwise)', () => {
      // 90° clockwise: x' = y, y' = -x
      // Matrix: [0, -1, 1, 0, 0, 0]
      const rotate90: Transform6 = [0, -1, 1, 0, 0, 0];
      const translate: Transform6 = [1, 0, 0, 1, 10, 20];
      const result = multiplyTransform(rotate90, translate);

      // Expected: rotation applied to translation
      // x' = 0*1 + 1*0 = 0, y' = -1*1 + 0*0 = -1 (scale)
      // Translation: 0*10 + 1*20 + 0 = 20, -1*10 + 0*20 + 0 = -10
      expect(result).toEqual([0, -1, 1, 0, 20, -10]);
    });

    it('should handle 180° rotation', () => {
      // 180°: x' = -x, y' = -y
      // Matrix: [-1, 0, 0, -1, 0, 0]
      const rotate180: Transform6 = [-1, 0, 0, -1, 0, 0];
      const translate: Transform6 = [1, 0, 0, 1, 10, 20];
      const result = multiplyTransform(rotate180, translate);

      expect(result).toEqual([-1, 0, 0, -1, -10, -20]);
    });

    it('should handle 270° rotation (counterclockwise 90°)', () => {
      // 270° clockwise = 90° counterclockwise: x' = -y, y' = x
      // Matrix: [0, 1, -1, 0, 0, 0]
      const rotate270: Transform6 = [0, 1, -1, 0, 0, 0];
      const translate: Transform6 = [1, 0, 0, 1, 10, 20];
      const result = multiplyTransform(rotate270, translate);

      expect(result).toEqual([0, 1, -1, 0, -20, 10]);
    });

    it('should combine multiple transformations correctly', () => {
      // Scale by 2, then translate by (5, 10)
      const scale: Transform6 = [2, 0, 0, 2, 0, 0];
      const translate: Transform6 = [1, 0, 0, 1, 5, 10];
      const result = multiplyTransform(translate, scale);

      expect(result).toEqual([2, 0, 0, 2, 5, 10]);
    });

    it('should handle viewport transformation (typical PDF rendering)', () => {
      // Typical viewport: y-flip + translation
      // For A4 page (595×842): [1, 0, 0, -1, 0, 842]
      const viewport: Transform6 = [1, 0, 0, -1, 0, 842];
      const item: Transform6 = [12, 0, 0, 12, 100, 200];
      const result = multiplyTransform(viewport, item);

      // Expected:
      // Scale: 1*12 + 0*0 = 12, 0*12 + -1*0 = 0, etc.
      // Translation: 1*100 + 0*200 + 0 = 100, 0*100 + -1*200 + 842 = 642
      expect(result).toEqual([12, 0, 0, -12, 100, 642]);
    });
  });

  describe('transformXY', () => {
    it('should extract coordinates from identity transform', () => {
      const identity: Transform6 = [1, 0, 0, 1, 0, 0];
      const translate: Transform6 = [1, 0, 0, 1, 100, 200];
      const { x, y } = transformXY(identity, translate);

      expect(x).toBe(100);
      expect(y).toBe(200);
    });

    it('should apply viewport transformation to item coordinates', () => {
      // Viewport with y-flip (typical PDF rendering)
      const viewport: Transform6 = [1, 0, 0, -1, 0, 842];
      const item: Transform6 = [1, 0, 0, 1, 50, 100];
      const { x, y } = transformXY(viewport, item);

      expect(x).toBe(50);
      expect(y).toBe(742); // 842 - 100
    });

    it('should handle 90° rotated page coordinates', () => {
      // 90° rotation viewport: [0, -1, 1, 0, 0, 595]
      const viewport: Transform6 = [0, -1, 1, 0, 0, 595];
      const item: Transform6 = [1, 0, 0, 1, 100, 200];
      const { x, y } = transformXY(viewport, item);

      expect(x).toBe(200); // Original y becomes x
      expect(y).toBe(495); // 595 - original x
    });

    it('should handle scaled coordinates', () => {
      const viewport: Transform6 = [2, 0, 0, 2, 0, 0]; // 2x scale
      const item: Transform6 = [1, 0, 0, 1, 50, 75];
      const { x, y } = transformXY(viewport, item);

      expect(x).toBe(100); // 50 × 2
      expect(y).toBe(150); // 75 × 2
    });

    it('should handle text item with font size transform', () => {
      // Typical text item: font size 12, position (100, 500)
      const viewport: Transform6 = [1, 0, 0, -1, 0, 842];
      const textTransform: Transform6 = [12, 0, 0, 12, 100, 500];
      const { x, y } = transformXY(viewport, textTransform);

      expect(x).toBe(100);
      expect(y).toBe(342); // 842 - 500
    });

    it('should handle image transform', () => {
      // Image transform typically includes size: [width, 0, 0, height, x, y]
      const viewport: Transform6 = [1, 0, 0, -1, 0, 842];
      const imageTransform: Transform6 = [200, 0, 0, 150, 50, 300];
      const { x, y } = transformXY(viewport, imageTransform);

      expect(x).toBe(50);
      expect(y).toBe(542); // 842 - 300
    });
  });

  describe('calculateLineEpsilon', () => {
    it('should return default epsilon when no font size provided', () => {
      const epsilon = calculateLineEpsilon();
      expect(epsilon).toBe(2.5);
    });

    it('should return default epsilon when font size is undefined', () => {
      const epsilon = calculateLineEpsilon(undefined);
      expect(epsilon).toBe(2.5);
    });

    it('should return default epsilon when font size is zero', () => {
      const epsilon = calculateLineEpsilon(0);
      expect(epsilon).toBe(2.5);
    });

    it('should return default epsilon when font size is negative', () => {
      const epsilon = calculateLineEpsilon(-10);
      expect(epsilon).toBe(2.5);
    });

    it('should calculate epsilon as 20% of font size', () => {
      const epsilon = calculateLineEpsilon(10);
      expect(epsilon).toBe(2); // 10 × 0.2
    });

    it('should handle typical font sizes correctly', () => {
      expect(calculateLineEpsilon(12)).toBeCloseTo(2.4); // 12pt font
      expect(calculateLineEpsilon(14)).toBeCloseTo(2.8); // 14pt font
      expect(calculateLineEpsilon(18)).toBeCloseTo(3.6); // 18pt heading
      expect(calculateLineEpsilon(24)).toBeCloseTo(4.8); // 24pt title
    });

    it('should handle small font sizes', () => {
      const epsilon = calculateLineEpsilon(8);
      expect(epsilon).toBe(1.6); // 8 × 0.2
    });

    it('should handle large font sizes', () => {
      const epsilon = calculateLineEpsilon(48);
      expect(epsilon).toBeCloseTo(9.6); // 48 × 0.2
    });

    it('should handle fractional font sizes', () => {
      const epsilon = calculateLineEpsilon(10.5);
      expect(epsilon).toBe(2.1); // 10.5 × 0.2
    });
  });

  describe('Integration: Realistic PDF scenarios', () => {
    it('should handle portrait A4 page (595×842)', () => {
      const viewport: Transform6 = [1, 0, 0, -1, 0, 842];

      // Text at top of page
      const topText: Transform6 = [12, 0, 0, 12, 100, 50];
      const topCoords = transformXY(viewport, topText);

      // Text at bottom of page
      const bottomText: Transform6 = [12, 0, 0, 12, 100, 800];
      const bottomCoords = transformXY(viewport, bottomText);

      // With y-flip viewport: top of page (small PDF y) → large screen y
      expect(topCoords.y).toBeGreaterThan(bottomCoords.y);
      expect(topCoords.y).toBe(792); // 842 - 50
      expect(bottomCoords.y).toBe(42); // 842 - 800
    });

    it('should handle landscape A4 page (842×595, 90° rotation)', () => {
      const viewport: Transform6 = [0, -1, 1, 0, 0, 595];

      const text1: Transform6 = [12, 0, 0, 12, 100, 200];
      const coords1 = transformXY(viewport, text1);

      const text2: Transform6 = [12, 0, 0, 12, 300, 200];
      const coords2 = transformXY(viewport, text2);

      // Items with same PDF y-coordinate should have same screen x-coordinate
      expect(coords1.x).toBe(coords2.x);
      expect(coords1.x).toBe(200);

      // Items with different PDF x-coordinate should have different screen y-coordinate
      expect(coords1.y).not.toBe(coords2.y);
    });

    it('should group text items on same line using epsilon', () => {
      const fontSize = 12;
      const epsilon = calculateLineEpsilon(fontSize);

      const baseY = 500;
      const item1Y = baseY;
      const item2Y = baseY + 1; // Very close
      const item3Y = baseY + 2; // Still within epsilon (2.4)
      const item4Y = baseY + 5; // Outside epsilon, different line

      expect(Math.abs(item1Y - item2Y)).toBeLessThanOrEqual(epsilon);
      expect(Math.abs(item1Y - item3Y)).toBeLessThanOrEqual(epsilon);
      expect(Math.abs(item1Y - item4Y)).toBeGreaterThan(epsilon);
    });
  });
});
