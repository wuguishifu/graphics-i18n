import {
  approxTextMeasurer,
  type LpkgContainer,
  type PackageManifest,
  type TextMeasurer,
  type TextStyle,
} from '@wuguishifu/core';

function cssWeight(weight: TextStyle['fontWeight']): string {
  if (weight === undefined) return '400';
  if (weight === 'normal') return '400';
  if (weight === 'bold') return '700';
  return String(weight);
}

class CanvasTextMeasurer implements TextMeasurer {
  constructor(private readonly context: CanvasRenderingContext2D) {}

  measureWidth(text: string, style: TextStyle, fontSize: number): number {
    if (text.length === 0) return 0;
    this.context.font = `${style.fontStyle ?? 'normal'} ${cssWeight(style.fontWeight)} ${fontSize}px ${JSON.stringify(style.fontFamily)}, sans-serif`;
    let width = this.context.measureText(text).width;
    if (style.letterSpacing) {
      width += style.letterSpacing * Math.max(0, [...text].length - 1);
    }
    return width;
  }
}

/**
 * Browser measurer: registers the package's embedded fonts via the FontFace
 * API (so canvas measurement uses the same glyphs the SVG draws with), then
 * measures through a 2D canvas context. Falls back to the deterministic
 * approximate measurer outside the DOM (SSR, tests).
 */
export async function createCanvasTextMeasurer(pkg: {
  manifest: PackageManifest;
  container: LpkgContainer;
}): Promise<TextMeasurer> {
  if (typeof document === 'undefined') {
    return approxTextMeasurer;
  }
  const context = document.createElement('canvas').getContext('2d');
  if (!context) {
    return approxTextMeasurer;
  }

  const loads: Promise<unknown>[] = [];
  for (const font of Object.values(pkg.manifest.fonts ?? {})) {
    try {
      const bytes = pkg.container.readChunk(font.path);
      const buffer = new Uint8Array(bytes).buffer as ArrayBuffer;
      const face = new FontFace(font.family, buffer, {
        weight: String(font.weight ?? 400),
        style: font.style ?? 'normal',
      });
      document.fonts.add(face);
      loads.push(face.load().catch(() => undefined));
    } catch {
      // Missing font chunks surface later as FONT_MISSING diagnostics.
    }
  }
  await Promise.all(loads);
  return new CanvasTextMeasurer(context);
}
