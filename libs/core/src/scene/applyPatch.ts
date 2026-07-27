import type { GraphicError } from '../types/errors.js';
import type { LocalePatch } from '../types/locale.js';
import type { Scene, SceneNode, TextNode, BadgeNode } from '../types/scene.js';
import { cloneScene, walkNodes } from './parseScene.js';

/**
 * Apply a locale patch to a scene (spec §3.7). Patches may only override
 * existing node IDs in v1 — unknown IDs are reported as diagnostics and
 * ignored. Returns a new scene; the input is not mutated.
 */
export function applyPatch(
  scene: Scene,
  patch: LocalePatch | undefined,
  diagnostics: GraphicError[] = [],
): Scene {
  if (!patch || Object.keys(patch.nodes).length === 0) {
    return scene;
  }
  const next = cloneScene(scene);
  const seen = new Set<string>();
  walkNodes(next.root, (node) => {
    const override = patch.nodes[node.id];
    if (!override) return;
    seen.add(node.id);
    if (override.visible !== undefined) {
      node.visible = override.visible;
    }
    if (override.transform) {
      node.transform = { ...node.transform, ...override.transform };
    }
    if (override.box && hasBox(node)) {
      node.box = { ...node.box, ...override.box };
    }
    if (override.style && hasTextStyle(node)) {
      node.style = { ...node.style, ...override.style };
    }
    if (override.fit && node.type === 'text') {
      node.fit = { mode: 'none', ...node.fit, ...override.fit };
    }
  });
  for (const id of Object.keys(patch.nodes)) {
    if (!seen.has(id)) {
      diagnostics.push({
        code: 'SCENE_PARSE_FAILED',
        message: `Patch references unknown node id "${id}"; ignored (patches may not add nodes in v1)`,
      });
    }
  }
  return next;
}

function hasBox(node: SceneNode): node is TextNode | BadgeNode {
  return node.type === 'text' || node.type === 'badge';
}

function hasTextStyle(node: SceneNode): node is TextNode | BadgeNode {
  return node.type === 'text' || node.type === 'badge';
}
