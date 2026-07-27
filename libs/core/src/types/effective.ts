import type { GraphicError } from './errors.js';
import type { Box, Stroke, TextStyle } from './scene.js';

// Row-major 2D affine matrix: [a, b, c, d, tx, ty]
// x' = a*x + c*y + tx ; y' = b*x + d*y + ty
export type Matrix2D = [number, number, number, number, number, number];

export type ResolvedTextLayout = {
  text: string; // final localized text (after uppercase, before line breaking)
  lines: string[];
  fontSize: number; // final size after fitting
  lineHeight: number; // px per line
  style: TextStyle;
  direction: 'ltr' | 'rtl';
  overflowed: boolean;
  appliedEllipsis: boolean;
};

export type DrawInstruction =
  | {
      kind: 'rect';
      radius: number;
      fill?: string;
      stroke?: Stroke;
    }
  | {
      kind: 'image';
      assetId: string; // already locale-resolved
      fit: 'contain' | 'cover' | 'fill' | 'none';
    }
  | {
      kind: 'svg';
      assetId: string; // already locale-resolved
    }
  | {
      kind: 'text';
      layout: ResolvedTextLayout;
    }
  | {
      kind: 'badge';
      layout: ResolvedTextLayout;
      background: { fill: string; radius: number };
    }
  | {
      kind: 'path';
      d: string;
      fill?: string;
      stroke?: Stroke;
    }
  | {
      kind: 'line';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke: Stroke;
    };

export type EffectiveNode = {
  id: string;
  type: string;
  // Local-space bounds; `matrix` maps them into canvas space.
  bounds: Box;
  visible: boolean;
  zIndex: number;
  opacity: number;
  matrix: Matrix2D;
  draw: DrawInstruction;
};

export type EffectiveSceneMeta = {
  locale: string; // locale actually used
  requestedLocale: string;
  fallbackLocale: string;
  usedFallbackLocale: boolean;
  patchApplied: boolean;
  diagnostics: GraphicError[];
};

export type EffectiveScene = {
  canvas: {
    width: number;
    height: number;
    background?: string;
  };
  nodes: EffectiveNode[];
  meta: EffectiveSceneMeta;
};
