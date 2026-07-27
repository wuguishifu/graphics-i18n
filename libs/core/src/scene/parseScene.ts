import { LpkgError } from '../types/errors.js';
import type { Scene, SceneNode } from '../types/scene.js';

export const KNOWN_NODE_TYPES = new Set([
  'group',
  'rect',
  'image',
  'svg',
  'text',
  'path',
  'line',
  'badge',
]);

function fail(message: string, details?: unknown): never {
  throw new LpkgError({ code: 'SCENE_PARSE_FAILED', message, details });
}

function checkNodes(nodes: unknown, seenIds: Set<string>, path: string): void {
  if (!Array.isArray(nodes)) {
    fail(`${path} must be an array of nodes`);
  }
  for (const node of nodes) {
    if (typeof node !== 'object' || node === null) {
      fail(`${path} contains a non-object node`);
    }
    const { id, type } = node as { id?: unknown; type?: unknown };
    if (typeof id !== 'string' || id.length === 0) {
      fail(`${path} contains a node without a stable string id`);
    }
    if (typeof type !== 'string') {
      fail(`Node "${id}" has no type`);
    }
    if (seenIds.has(id)) {
      fail(`Duplicate node id: "${id}"`);
    }
    seenIds.add(id);
    if (type === 'group') {
      checkNodes((node as { children?: unknown }).children ?? [], seenIds, `${path}/${id}`);
    }
  }
}

/**
 * Validate scene.json (spec §3.5). Unknown node types are tolerated here for
 * forward compatibility — they are skipped with a diagnostic at build time.
 */
export function parseScene(raw: unknown): Scene {
  if (typeof raw !== 'object' || raw === null) {
    fail('scene.json must be an object');
  }
  const scene = raw as Partial<Scene>;
  if (typeof scene.sceneVersion !== 'string') {
    fail('scene.sceneVersion must be a string');
  }
  checkNodes(scene.root, new Set(), 'root');
  return raw as Scene;
}

/** Depth-first walk over every node in the tree. */
export function walkNodes(nodes: SceneNode[], visit: (node: SceneNode) => void): void {
  for (const node of nodes) {
    visit(node);
    if (node.type === 'group') {
      walkNodes(node.children, visit);
    }
  }
}

/** Structurally clone the scene tree so mutation stages stay isolated. */
export function cloneScene(scene: Scene): Scene {
  return JSON.parse(JSON.stringify(scene)) as Scene;
}
