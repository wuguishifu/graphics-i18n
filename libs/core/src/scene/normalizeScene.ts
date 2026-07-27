import type { Matrix2D } from '../types/effective.js';
import type { GraphicError } from '../types/errors.js';
import type { Box, GroupNode, Scene, SceneNode, Transform2D } from '../types/scene.js';
import { KNOWN_NODE_TYPES } from './parseScene.js';

export type LeafNode = Exclude<SceneNode, GroupNode>;

export type FlatNode = {
  node: LeafNode;
  /** Composed world matrix mapping the node's local coords to canvas space. */
  matrix: Matrix2D;
  opacity: number;
  visible: boolean;
  zIndex: number;
};

export const IDENTITY: Matrix2D = [1, 0, 0, 1, 0, 0];

export function multiply(m: Matrix2D, n: Matrix2D): Matrix2D {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

function translation(x: number, y: number): Matrix2D {
  return [1, 0, 0, 1, x, y];
}

/**
 * Build a matrix for a Transform2D. Rotation/scale/skew pivot around the
 * anchor point, expressed relative to `bounds` (leaf nodes). Groups pivot
 * around the origin in v1.
 */
export function matrixFromTransform(t: Transform2D, bounds?: Box): Matrix2D {
  const px = bounds ? bounds.x + (t.anchorX ?? 0) * bounds.width : 0;
  const py = bounds ? bounds.y + (t.anchorY ?? 0) * bounds.height : 0;
  const rad = ((t.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const sx = t.scaleX ?? 1;
  const sy = t.scaleY ?? 1;
  const kx = Math.tan(((t.skewX ?? 0) * Math.PI) / 180);
  const ky = Math.tan(((t.skewY ?? 0) * Math.PI) / 180);

  let m = translation((t.x ?? 0) + px, (t.y ?? 0) + py);
  m = multiply(m, [cos, sin, -sin, cos, 0, 0]);
  m = multiply(m, [1, ky, kx, 1, 0, 0]);
  m = multiply(m, [sx, 0, 0, sy, 0, 0]);
  return multiply(m, translation(-px, -py));
}

/** Local-space bounds of a node; groups are the union of their children. */
export function nodeLocalBounds(node: SceneNode): Box | undefined {
  switch (node.type) {
    case 'rect':
    case 'image':
    case 'svg':
      return { x: node.x, y: node.y, width: node.width, height: node.height };
    case 'text':
    case 'badge':
      return { ...node.box };
    case 'line': {
      const x = Math.min(node.x1, node.x2);
      const y = Math.min(node.y1, node.y2);
      return { x, y, width: Math.abs(node.x2 - node.x1), height: Math.abs(node.y2 - node.y1) };
    }
    case 'group': {
      let box: Box | undefined;
      for (const child of node.children) {
        const childBox = nodeLocalBounds(child);
        if (!childBox) continue;
        const offset = { x: child.transform?.x ?? 0, y: child.transform?.y ?? 0 };
        const shifted = { ...childBox, x: childBox.x + offset.x, y: childBox.y + offset.y };
        box = box ? union(box, shifted) : shifted;
      }
      return box;
    }
    case 'path':
      return pathApproxBounds(node.d);
    default:
      return undefined;
  }
}

function union(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

/**
 * Approximate bounds from a path's coordinate tokens. Control points of
 * curves are included, so this over-estimates — good enough for debug
 * overlays and culling.
 */
function pathApproxBounds(d: string): Box | undefined {
  const numbers = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
  if (numbers.length < 2) return undefined;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    minX = Math.min(minX, numbers[i]);
    maxX = Math.max(maxX, numbers[i]);
    minY = Math.min(minY, numbers[i + 1]);
    maxY = Math.max(maxY, numbers[i + 1]);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Flatten the scene tree into painter-ordered leaf nodes with composed
 * matrices and inherited opacity/visibility. Group stacking layouts
 * (`vertical`/`horizontal`) re-position children along the main axis with
 * `gap` and align them on the cross axis (`justify` needs a container size
 * and is a no-op in v1).
 */
export function normalizeScene(scene: Scene, diagnostics: GraphicError[] = []): FlatNode[] {
  const flat: FlatNode[] = [];
  let zIndex = 0;

  const visit = (
    nodes: SceneNode[],
    parentMatrix: Matrix2D,
    parentOpacity: number,
    parentVisible: boolean,
    layoutOffsets?: Map<string, { dx: number; dy: number }>,
  ): void => {
    for (const node of nodes) {
      if (!KNOWN_NODE_TYPES.has(node.type)) {
        diagnostics.push({
          code: 'SCENE_PARSE_FAILED',
          message: `Skipping node "${node.id}" with unknown type "${node.type}"`,
        });
        continue;
      }
      const bounds = nodeLocalBounds(node);
      let matrix = parentMatrix;
      const offset = layoutOffsets?.get(node.id);
      if (offset) {
        matrix = multiply(matrix, [1, 0, 0, 1, offset.dx, offset.dy]);
      }
      if (node.transform) {
        matrix = multiply(matrix, matrixFromTransform(node.transform, node.type === 'group' ? undefined : bounds));
      }
      const opacity = parentOpacity * (node.opacity ?? 1);
      const visible = parentVisible && node.visible !== false;

      if (node.type === 'group') {
        visit(node.children, matrix, opacity, visible, stackingOffsets(node));
      } else {
        flat.push({ node, matrix, opacity, visible, zIndex: zIndex++ });
      }
    }
  };

  visit(scene.root, IDENTITY, 1, true);
  return flat;
}

function stackingOffsets(group: GroupNode): Map<string, { dx: number; dy: number }> | undefined {
  const mode = group.layout?.mode;
  if (mode !== 'vertical' && mode !== 'horizontal') {
    return undefined;
  }
  const gap = group.layout?.gap ?? 0;
  const align = group.layout?.align ?? 'start';
  const boxes = group.children
    .map((child) => ({ child, box: nodeLocalBounds(child) }))
    .filter((entry): entry is { child: SceneNode; box: Box } => entry.box !== undefined);
  const crossSize = boxes.reduce(
    (max, { box }) => Math.max(max, mode === 'vertical' ? box.width : box.height),
    0,
  );
  const offsets = new Map<string, { dx: number; dy: number }>();
  let cursor = 0;
  for (const { child, box } of boxes) {
    const main = cursor - (mode === 'vertical' ? box.y : box.x);
    const childCross = mode === 'vertical' ? box.width : box.height;
    let cross = 0;
    if (align === 'center') cross = (crossSize - childCross) / 2;
    else if (align === 'end') cross = crossSize - childCross;
    cross -= mode === 'vertical' ? box.x : box.y;
    offsets.set(
      child.id,
      mode === 'vertical' ? { dx: cross, dy: main } : { dx: main, dy: cross },
    );
    cursor += (mode === 'vertical' ? box.height : box.width) + gap;
  }
  return offsets;
}
