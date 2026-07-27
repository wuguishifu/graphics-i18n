import { fitText } from '../layout/fitText.js';
import { approxTextMeasurer, type TextMeasurer } from '../layout/textMeasurer.js';
import type { ResolvedLocale } from '../package/resolveLocale.js';
import { applyLocale } from '../scene/applyLocale.js';
import { applyPatch } from '../scene/applyPatch.js';
import { normalizeScene, nodeLocalBounds, type FlatNode } from '../scene/normalizeScene.js';
import type { DrawInstruction, EffectiveNode, EffectiveScene } from '../types/effective.js';
import type { GraphicError } from '../types/errors.js';
import type { LocalePack, LocalePatch } from '../types/locale.js';
import type { PackageManifest } from '../types/manifest.js';
import type { Scene } from '../types/scene.js';

export type BuildEffectiveSceneInput = {
  manifest: PackageManifest;
  scene: Scene;
  localePack: LocalePack;
  /** Pack for missing-string fallback; pass `localePack` again if identical. */
  fallbackPack: LocalePack;
  patch?: LocalePatch;
  resolved: ResolvedLocale;
  measurer?: TextMeasurer;
};

/**
 * Stage 4 (spec §4.2): patch, localize, normalize and lay out the scene into
 * the backend-agnostic EffectiveScene consumed by renderers.
 */
export function buildEffectiveScene(input: BuildEffectiveSceneInput): EffectiveScene {
  const { manifest, localePack, fallbackPack, patch, resolved } = input;
  const measurer = input.measurer ?? approxTextMeasurer;
  const diagnostics: GraphicError[] = [];

  const patched = applyPatch(input.scene, patch, diagnostics);
  const localized = applyLocale(patched, { manifest, pack: localePack, fallbackPack, diagnostics });
  const flat = normalizeScene(localized.scene, diagnostics);

  const nodes: EffectiveNode[] = [];
  for (const entry of flat) {
    const effective = toEffectiveNode(entry, localized.texts, localized.direction, measurer, manifest, diagnostics);
    if (effective) {
      nodes.push(effective);
    }
  }

  return {
    canvas: {
      width: manifest.canvas.width,
      height: manifest.canvas.height,
      background: manifest.canvas.background,
    },
    nodes,
    meta: {
      locale: resolved.locale,
      requestedLocale: resolved.requestedLocale,
      fallbackLocale: resolved.fallbackLocale,
      usedFallbackLocale: resolved.usedFallbackLocale,
      patchApplied: patch !== undefined,
      diagnostics,
    },
  };
}

function toEffectiveNode(
  entry: FlatNode,
  texts: Map<string, string>,
  direction: 'ltr' | 'rtl',
  measurer: TextMeasurer,
  manifest: PackageManifest,
  diagnostics: GraphicError[],
): EffectiveNode | undefined {
  const { node, matrix, opacity, visible, zIndex } = entry;
  let bounds = nodeLocalBounds(node) ?? { x: 0, y: 0, width: 0, height: 0 };
  let draw: DrawInstruction;

  switch (node.type) {
    case 'rect':
      draw = { kind: 'rect', radius: node.radius ?? 0, fill: node.fill, stroke: node.stroke };
      break;
    case 'image':
    case 'svg': {
      if (!manifest.assets[node.assetId]) {
        diagnostics.push({
          code: 'ASSET_MISSING',
          message: `Node "${node.id}" references unknown asset "${node.assetId}"`,
          assetId: node.assetId,
        });
        return undefined;
      }
      draw =
        node.type === 'image'
          ? { kind: 'image', assetId: node.assetId, fit: node.fit ?? 'fill' }
          : { kind: 'svg', assetId: node.assetId };
      break;
    }
    case 'text':
    case 'badge': {
      if (node.box.width <= 0 || node.box.height <= 0) {
        diagnostics.push({
          code: 'TEXT_LAYOUT_FAILED',
          message: `Node "${node.id}" has a non-positive text box`,
          nodeId: node.id,
        });
        return undefined;
      }
      const fitted = fitText({
        text: texts.get(node.id) ?? '',
        box: node.box,
        style: node.style,
        fit: node.type === 'text' ? node.fit : undefined,
        wrap: node.type === 'text' ? node.wrap : undefined,
        direction,
        rtlAware: node.type === 'text' ? node.rtlAware : true,
        measurer,
      });
      bounds = fitted.bounds;
      draw =
        node.type === 'text'
          ? { kind: 'text', layout: fitted.layout }
          : { kind: 'badge', layout: fitted.layout, background: node.background };
      break;
    }
    case 'path':
      draw = { kind: 'path', d: node.d, fill: node.fill, stroke: node.stroke };
      break;
    case 'line':
      draw = { kind: 'line', x1: node.x1, y1: node.y1, x2: node.x2, y2: node.y2, stroke: node.stroke };
      break;
  }

  return { id: node.id, type: node.type, bounds, visible, zIndex, opacity, matrix, draw };
}

/** Asset ids referenced by visible nodes — the lazy-load set (spec §4.2 stage 3). */
export function collectVisibleAssetIds(scene: EffectiveScene): string[] {
  const ids = new Set<string>();
  for (const node of scene.nodes) {
    if (!node.visible) continue;
    if (node.draw.kind === 'image' || node.draw.kind === 'svg') {
      ids.add(node.draw.assetId);
    }
  }
  return [...ids];
}

/** Font families referenced by visible text/badge nodes. */
export function collectVisibleFontFamilies(scene: EffectiveScene): string[] {
  const families = new Set<string>();
  for (const node of scene.nodes) {
    if (!node.visible) continue;
    if (node.draw.kind === 'text' || node.draw.kind === 'badge') {
      families.add(node.draw.layout.style.fontFamily);
    }
  }
  return [...families];
}
