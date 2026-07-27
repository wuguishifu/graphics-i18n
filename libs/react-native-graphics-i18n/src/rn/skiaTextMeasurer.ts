import { matchFont, Skia, type SkFont } from '@shopify/react-native-skia';
import type { TextMeasurer } from '../layout/textMeasurer.js';
import type { TextStyle } from '../types/scene.js';
import { selectTypeface, type LoadedFonts } from './loadFont.js';

function fontKey(style: TextStyle, fontSize: number): string {
  return `${style.fontFamily}|${style.fontWeight ?? 'normal'}|${style.fontStyle ?? 'normal'}|${fontSize}`;
}

function toRnWeight(
  weight: TextStyle['fontWeight'],
): 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' {
  if (weight === undefined || weight === 'normal' || weight === 'bold') {
    return weight ?? 'normal';
  }
  const rounded = Math.min(900, Math.max(100, Math.round(weight / 100) * 100));
  return String(rounded) as '100';
}

/**
 * Skia-backed measurement. Prefers typefaces embedded in the package and
 * falls back to system font matching, so fitting decisions track the exact
 * glyph advances used at draw time.
 */
export class SkiaTextMeasurer implements TextMeasurer {
  private readonly fontInstances = new Map<string, SkFont>();

  constructor(private readonly loaded: LoadedFonts) {}

  getFont(style: TextStyle, fontSize: number): SkFont {
    const key = fontKey(style, fontSize);
    const existing = this.fontInstances.get(key);
    if (existing) return existing;
    const typeface = selectTypeface(this.loaded, style.fontFamily, style.fontWeight, style.fontStyle);
    let font: SkFont;
    if (typeface) {
      font = Skia.Font(typeface, fontSize);
    } else {
      font = matchFont({
        fontFamily: style.fontFamily,
        fontSize,
        fontWeight: toRnWeight(style.fontWeight),
        fontStyle: style.fontStyle ?? 'normal',
      });
      // Unknown families yield a null typeface (a font that measures 0 and
      // draws nothing) — fall back to the platform default family instead.
      if (!font.getTypeface()) {
        font = matchFont({
          fontSize,
          fontWeight: toRnWeight(style.fontWeight),
          fontStyle: style.fontStyle ?? 'normal',
        });
      }
    }
    this.fontInstances.set(key, font);
    return font;
  }

  measureWidth(text: string, style: TextStyle, fontSize: number): number {
    if (text.length === 0) return 0;
    const font = this.getFont(style, fontSize);
    let width = font.measureText(text).width;
    if (style.letterSpacing) {
      width += style.letterSpacing * Math.max(0, [...text].length - 1);
    }
    return width;
  }
}
