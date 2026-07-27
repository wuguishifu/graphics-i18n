import { resolveDirection } from '../layout/resolveDirection.js';
import type { GraphicError } from '../types/errors.js';
import type { LocalePack } from '../types/locale.js';
import type { PackageManifest } from '../types/manifest.js';
import type { Scene, TextNode } from '../types/scene.js';
import { cloneScene, walkNodes } from './parseScene.js';

/** Badge text is a literal unless prefixed with "@", which marks a key. */
export const BADGE_KEY_PREFIX = '@';

export type ApplyLocaleOptions = {
  manifest: PackageManifest;
  pack: LocalePack;
  /** Pack used when a string is missing; may be the same object as `pack`. */
  fallbackPack: LocalePack;
  diagnostics?: GraphicError[];
};

export type LocalizedScene = {
  scene: Scene;
  /** node id -> final localized text for text/badge nodes */
  texts: Map<string, string>;
  direction: 'ltr' | 'rtl';
};

/**
 * Stage 4 locale application (spec §4.2): resolve localization keys with
 * fallback, then font overrides, then node overrides. Node-level
 * `localeOverrides` apply first; pack-level `nodeOverrides` win over them.
 */
export function applyLocale(scene: Scene, options: ApplyLocaleOptions): LocalizedScene {
  const { manifest, pack, fallbackPack } = options;
  const diagnostics = options.diagnostics ?? [];
  const next = cloneScene(scene);
  const texts = new Map<string, string>();
  const direction = resolveDirection(pack, manifest);

  const resolveKey = (key: string, node: { id: string; fallbackText?: string }): string => {
    if (key in pack.strings) return pack.strings[key];
    if (key in fallbackPack.strings) {
      diagnostics.push({
        code: 'STRING_MISSING',
        message: `String "${key}" missing in locale "${pack.locale}"; used fallback locale "${fallbackPack.locale}"`,
        key,
        locale: pack.locale,
      });
      return fallbackPack.strings[key];
    }
    diagnostics.push({
      code: 'STRING_MISSING',
      message: `String "${key}" missing in locale "${pack.locale}" and fallback "${fallbackPack.locale}"`,
      key,
      locale: pack.locale,
    });
    return node.fallbackText ?? '';
  };

  const overrideFont = (node: { style: { fontFamily: string } }): void => {
    const fontId = pack.fontOverrides?.[node.style.fontFamily];
    if (!fontId) return;
    const font = manifest.fonts?.[fontId];
    if (!font) {
      diagnostics.push({
        code: 'FONT_MISSING',
        message: `Locale "${pack.locale}" overrides font family "${node.style.fontFamily}" with unknown font id "${fontId}"`,
        fontId,
      });
      return;
    }
    node.style.fontFamily = font.family;
  };

  walkNodes(next.root, (node) => {
    if (node.type === 'text') {
      texts.set(node.id, resolveKey(node.bind, node));
      overrideFont(node);
      applyTextOverrides(node, pack);
    } else if (node.type === 'badge') {
      texts.set(
        node.id,
        node.text.startsWith(BADGE_KEY_PREFIX)
          ? resolveKey(node.text.slice(BADGE_KEY_PREFIX.length), { id: node.id })
          : node.text,
      );
      overrideFont(node);
    } else if (node.type === 'image' || node.type === 'svg') {
      const overrideAsset = pack.assetOverrides?.[node.assetId];
      if (overrideAsset) {
        node.assetId = overrideAsset;
      }
    }
  });

  return { scene: next, texts, direction };
}

function applyTextOverrides(node: TextNode, pack: LocalePack): void {
  // Author-side per-locale overrides on the node itself…
  const nodeLevel = node.localeOverrides?.[pack.locale];
  // …then translation-side overrides from the locale pack take precedence.
  for (const override of [nodeLevel, pack.nodeOverrides?.[node.id]]) {
    if (!override) continue;
    if (override.box) node.box = { ...node.box, ...override.box };
    if (override.style) node.style = { ...node.style, ...override.style };
    if (override.fit) node.fit = { mode: 'none', ...node.fit, ...override.fit };
    if (override.wrap) node.wrap = { mode: 'word', ...node.wrap, ...override.wrap };
  }
}
