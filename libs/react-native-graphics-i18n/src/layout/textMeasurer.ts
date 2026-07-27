import type { TextStyle } from '../types/scene.js';

/**
 * Minimal measurement contract shared by all backends. Wrapping, fitting and
 * line-height math live in the layout module so results stay consistent
 * between the approximate measurer (tests, SSR) and the Skia measurer (RN).
 */
export interface TextMeasurer {
  /** Advance width in px of a single line of text at the given font size. */
  measureWidth(text: string, style: TextStyle, fontSize: number): number;
}

export const DEFAULT_LINE_HEIGHT = 1.2;

export function lineHeightPx(style: TextStyle, fontSize: number): number {
  return fontSize * (style.lineHeight ?? DEFAULT_LINE_HEIGHT);
}

const NARROW = /[iIljtf.,:;'"!|()[\]{} ]/;
const WIDE = /[mwMW@%&]/;
const DIGIT = /[0-9]/;
const UPPER = /[A-Z]/;
// CJK unified ideographs, kana, hangul, full-width forms
const FULL_WIDTH = /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-｠]/;

function charFactor(char: string): number {
  if (FULL_WIDTH.test(char)) return 1.0;
  if (WIDE.test(char)) return 0.85;
  if (NARROW.test(char)) return 0.3;
  if (DIGIT.test(char)) return 0.6;
  if (UPPER.test(char)) return 0.72;
  return 0.55;
}

/**
 * Deterministic font-agnostic measurer using per-character advance factors.
 * Accurate enough for fit decisions in tests and non-Skia environments;
 * runtime rendering on RN should use the Skia measurer instead.
 */
export class ApproxTextMeasurer implements TextMeasurer {
  measureWidth(text: string, style: TextStyle, fontSize: number): number {
    let width = 0;
    let count = 0;
    for (const char of text) {
      width += charFactor(char) * fontSize;
      count += 1;
    }
    const weight = style.fontWeight;
    const bold = weight === 'bold' || (typeof weight === 'number' && weight >= 600);
    if (bold) {
      width *= 1.05;
    }
    if (style.letterSpacing && count > 1) {
      width += style.letterSpacing * (count - 1);
    }
    return width;
  }
}

export const approxTextMeasurer: TextMeasurer = new ApproxTextMeasurer();
