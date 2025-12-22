// Global polyfills for PDF.js to use @napi-rs/canvas implementations
// This ensures PDF.js uses the native implementations instead of its own polyfills

import { Canvas, Image, Path2D } from '@napi-rs/canvas';

// @ts-ignore - Setting globals for PDF.js compatibility
global.Canvas = Canvas;
// @ts-ignore
global.Image = Image;
// @ts-ignore
global.Path2D = Path2D;
