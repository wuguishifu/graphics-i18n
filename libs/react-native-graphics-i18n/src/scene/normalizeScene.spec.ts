import type { GraphicError } from '../types/errors.js';
import type { Scene } from '../types/scene.js';
import { matrixFromTransform, multiply, normalizeScene, IDENTITY } from './normalizeScene.js';

describe('normalizeScene', () => {
  it('flattens groups, composing transforms and opacity', () => {
    const scene: Scene = {
      sceneVersion: '1.0.0',
      root: [
        {
          id: 'g',
          type: 'group',
          opacity: 0.5,
          transform: { x: 10, y: 20 },
          children: [
            {
              id: 'r',
              type: 'rect',
              opacity: 0.5,
              x: 5,
              y: 5,
              width: 10,
              height: 10,
              fill: '#000',
            },
          ],
        },
      ],
    };
    const flat = normalizeScene(scene);
    expect(flat).toHaveLength(1);
    expect(flat[0].opacity).toBeCloseTo(0.25);
    // translation composed into the matrix
    expect(flat[0].matrix[4]).toBe(10);
    expect(flat[0].matrix[5]).toBe(20);
  });

  it('inherits invisibility from parent groups', () => {
    const scene: Scene = {
      sceneVersion: '1.0.0',
      root: [
        {
          id: 'g',
          type: 'group',
          visible: false,
          children: [{ id: 'r', type: 'rect', x: 0, y: 0, width: 1, height: 1 }],
        },
      ],
    };
    expect(normalizeScene(scene)[0].visible).toBe(false);
  });

  it('skips unknown node types with a diagnostic', () => {
    const scene = {
      sceneVersion: '1.0.0',
      root: [
        { id: 'future', type: 'hologram' },
        { id: 'r', type: 'rect', x: 0, y: 0, width: 1, height: 1 },
      ],
    } as unknown as Scene;
    const diagnostics: GraphicError[] = [];
    const flat = normalizeScene(scene, diagnostics);
    expect(flat).toHaveLength(1);
    expect(diagnostics[0].message).toContain('hologram');
  });

  it('stacks children in vertical layout groups with gap', () => {
    const scene: Scene = {
      sceneVersion: '1.0.0',
      root: [
        {
          id: 'stack',
          type: 'group',
          layout: { mode: 'vertical', gap: 8 },
          children: [
            { id: 'a', type: 'rect', x: 0, y: 0, width: 100, height: 20 },
            { id: 'b', type: 'rect', x: 0, y: 0, width: 100, height: 30 },
            { id: 'c', type: 'rect', x: 0, y: 0, width: 100, height: 10 },
          ],
        },
      ],
    };
    const flat = normalizeScene(scene);
    const ys = flat.map((entry) => entry.matrix[5]);
    expect(ys).toEqual([0, 28, 66]);
  });

  it('rotates around the anchor point', () => {
    const bounds = { x: 0, y: 0, width: 100, height: 100 };
    const m = matrixFromTransform({ rotation: 90, anchorX: 0.5, anchorY: 0.5 }, bounds);
    // The anchor (50,50) must map to itself.
    const x = m[0] * 50 + m[2] * 50 + m[4];
    const y = m[1] * 50 + m[3] * 50 + m[5];
    expect(x).toBeCloseTo(50);
    expect(y).toBeCloseTo(50);
    // A point right of center maps above/below it after 90° rotation.
    const px = m[0] * 100 + m[2] * 50 + m[4];
    const py = m[1] * 100 + m[3] * 50 + m[5];
    expect(px).toBeCloseTo(50);
    expect(py).toBeCloseTo(100);
  });

  it('multiplies matrices in the right order', () => {
    const translate: [number, number, number, number, number, number] = [1, 0, 0, 1, 10, 0];
    const scale: [number, number, number, number, number, number] = [2, 0, 0, 2, 0, 0];
    // translate then scale (child scale applied first in local coords)
    const combined = multiply(translate, scale);
    expect(combined).toEqual([2, 0, 0, 2, 10, 0]);
    expect(multiply(IDENTITY, translate)).toEqual(translate);
  });
});
