import {
  LruCache,
  type FontEntry,
  type GraphicError,
  type LpkgContainer,
  type PackageManifest,
} from '@graphics-i18n/core';
import { Skia, type SkTypeface } from '@shopify/react-native-skia';

export type LoadedFont = {
  fontId: string;
  entry: FontEntry;
  typeface: SkTypeface;
};

export type LoadedFonts = {
  fonts: LoadedFont[];
  diagnostics: GraphicError[];
};

const fontCache = new LruCache<string, LoadedFonts>(8);

/**
 * Decode every embedded font in the package (spec §4.5 — fonts are few and
 * needed before text measurement). Cached per package identity.
 */
export function loadFonts(
  container: LpkgContainer,
  manifest: PackageManifest,
  packageKey: string,
): LoadedFonts {
  const cached = fontCache.get(packageKey);
  if (cached) return cached;

  const fonts: LoadedFont[] = [];
  const diagnostics: GraphicError[] = [];
  for (const [fontId, entry] of Object.entries(manifest.fonts ?? {})) {
    try {
      const bytes = container.readChunk(entry.path);
      const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(
        Skia.Data.fromBytes(bytes),
      );
      if (typeface) {
        fonts.push({ fontId, entry, typeface });
      } else {
        diagnostics.push({
          code: 'FONT_MISSING',
          message: `Failed to decode font "${fontId}" (${entry.path})`,
          fontId,
        });
      }
    } catch {
      diagnostics.push({
        code: 'FONT_MISSING',
        message: `Missing font chunk for "${fontId}" (${entry.path})`,
        fontId,
      });
    }
  }
  const loaded: LoadedFonts = { fonts, diagnostics };
  fontCache.set(packageKey, loaded);
  return loaded;
}

function numericWeight(weight: number | 'normal' | 'bold' | undefined): number {
  if (weight === 'bold') return 700;
  if (typeof weight === 'number') return weight;
  return 400;
}

/** Closest match by family, then style, then weight distance. */
export function selectTypeface(
  loaded: LoadedFonts,
  family: string,
  weight?: number | 'normal' | 'bold',
  style?: 'normal' | 'italic',
): SkTypeface | undefined {
  const candidates = loaded.fonts.filter(
    (font) => font.entry.family === family,
  );
  if (candidates.length === 0) return undefined;
  const wantedWeight = numericWeight(weight);
  const wantedStyle = style ?? 'normal';
  let best = candidates[0];
  let bestScore = Infinity;
  for (const candidate of candidates) {
    const stylePenalty =
      (candidate.entry.style ?? 'normal') === wantedStyle ? 0 : 1000;
    const score =
      stylePenalty + Math.abs((candidate.entry.weight ?? 400) - wantedWeight);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best.typeface;
}
