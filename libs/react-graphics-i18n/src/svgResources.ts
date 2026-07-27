import {
  bytesToBase64,
  collectVisibleAssetIds,
  collectVisibleFontFamilies,
  type EffectiveScene,
  type GraphicError,
  type LpkgContainer,
  type PackageManifest,
} from '@wuguishifu/core';

export type SvgResources = {
  /** assetId -> data URI usable as an <image> href */
  hrefs: Map<string, string>;
  /** `@font-face` rules (data-URI sources) for fonts used by visible text */
  fontCss: string;
  diagnostics: GraphicError[];
};

const MIME_BY_TYPE: Record<string, string> = {
  svg: 'image/svg+xml',
  image: 'image/png',
};

function fontMime(path: string): string {
  if (path.endsWith('.otf')) return 'font/otf';
  if (path.endsWith('.woff2')) return 'font/woff2';
  if (path.endsWith('.woff')) return 'font/woff';
  return 'font/ttf';
}

/**
 * Resolve everything an SVG render needs into self-contained data URIs, so
 * the output works in the browser and in server-rendered static markup
 * alike. Only assets/fonts referenced by visible nodes are inlined
 * (spec §4.2 stage 3).
 */
export function buildSvgResources(
  container: LpkgContainer,
  manifest: PackageManifest,
  scene: EffectiveScene,
): SvgResources {
  const hrefs = new Map<string, string>();
  const diagnostics: GraphicError[] = [];

  for (const assetId of collectVisibleAssetIds(scene)) {
    const entry = manifest.assets[assetId];
    if (!entry) {
      diagnostics.push({
        code: 'ASSET_MISSING',
        message: `Asset "${assetId}" is not declared in the manifest`,
        assetId,
      });
      continue;
    }
    try {
      const bytes = container.readChunk(entry.path);
      const mime = entry.mimeType ?? MIME_BY_TYPE[entry.type] ?? 'application/octet-stream';
      hrefs.set(assetId, `data:${mime};base64,${bytesToBase64(bytes)}`);
    } catch (cause) {
      diagnostics.push({
        code: 'ASSET_MISSING',
        message: `Failed to read asset "${assetId}" (${entry.path}): ${String(cause)}`,
        assetId,
      });
    }
  }

  const usedFamilies = new Set(collectVisibleFontFamilies(scene));
  const rules: string[] = [];
  for (const [fontId, font] of Object.entries(manifest.fonts ?? {})) {
    if (!usedFamilies.has(font.family)) continue;
    try {
      const bytes = container.readChunk(font.path);
      rules.push(
        `@font-face{font-family:${JSON.stringify(font.family)};` +
          `font-weight:${font.weight ?? 400};font-style:${font.style ?? 'normal'};` +
          `src:url(data:${fontMime(font.path)};base64,${bytesToBase64(bytes)});}`,
      );
    } catch (cause) {
      diagnostics.push({
        code: 'FONT_MISSING',
        message: `Failed to read font "${fontId}" (${font.path}): ${String(cause)}`,
        fontId,
      });
    }
  }

  return { hrefs, fontCss: rules.join('\n'), diagnostics };
}
