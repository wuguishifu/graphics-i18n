import { fixtureScene } from '../testing/fixture.js';
import type { GraphicError } from '../types/errors.js';
import type { TextNode, SvgNode } from '../types/scene.js';
import { applyPatch } from './applyPatch.js';

describe('applyPatch', () => {
  it('overrides existing nodes without mutating the input', () => {
    const scene = fixtureScene();
    const patched = applyPatch(scene, {
      nodes: {
        logo: { visible: false },
        title: { style: { color: '#ff0000' }, box: { width: 620 } },
      },
    });
    const logo = patched.root.find((n) => n.id === 'logo') as SvgNode;
    const title = patched.root.find((n) => n.id === 'title') as TextNode;
    expect(logo.visible).toBe(false);
    expect(title.style.color).toBe('#ff0000');
    expect(title.box.width).toBe(620);
    // Untouched fields survive the merge.
    expect(title.style.fontSize).toBe(64);
    // Original scene untouched.
    const originalTitle = scene.root.find((n) => n.id === 'title') as TextNode;
    expect(originalTitle.style.color).toBe('#111111');
  });

  it('reports and ignores unknown node ids (v1 rule)', () => {
    const diagnostics: GraphicError[] = [];
    const patched = applyPatch(
      fixtureScene(),
      { nodes: { ghost: { visible: false } } },
      diagnostics,
    );
    expect(patched.root).toHaveLength(fixtureScene().root.length);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('ghost');
  });

  it('is a no-op for a missing patch', () => {
    const scene = fixtureScene();
    expect(applyPatch(scene, undefined)).toBe(scene);
  });
});
