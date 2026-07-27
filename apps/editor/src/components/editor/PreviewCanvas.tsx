'use client';

import type { EffectiveScene } from '@graphics-i18n/core';
import { SvgGraphic, type SvgResources } from '@graphics-i18n/react';
import type { EditorAction } from '@/lib/editor/reducer';

function matrixString(m: readonly number[]): string {
  return `matrix(${m[0]} ${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]})`;
}

/**
 * Live preview plus a hit-test overlay: every effective node gets a
 * transparent rect in canvas coordinates, so clicks map exactly to what the
 * renderer drew (patches, layout and transforms included).
 */
export function PreviewCanvas({
  scene,
  resources,
  selectedId,
  debug,
  dispatch,
}: {
  scene: EffectiveScene;
  resources: SvgResources;
  selectedId?: string;
  debug: boolean;
  dispatch: (action: EditorAction) => void;
}) {
  const { width, height } = scene.canvas;
  return (
    <div
      className="relative w-full max-w-4xl overflow-hidden rounded-xl border bg-[repeating-conic-gradient(#00000010_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] shadow-sm"
      onClick={() => dispatch({ type: 'select-node', id: undefined })}
    >
      <SvgGraphic
        scene={scene}
        resources={resources}
        debug={debug}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 h-full w-full"
        style={{ pointerEvents: 'none' }}
      >
        {scene.nodes.map((node) => (
          <g key={node.id} transform={matrixString(node.matrix)}>
            <rect
              x={node.bounds.x}
              y={node.bounds.y}
              width={node.bounds.width}
              height={node.bounds.height}
              fill="transparent"
              stroke={
                node.id === selectedId
                  ? 'oklch(0.62 0.19 259.8)'
                  : 'transparent'
              }
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: 'all', cursor: 'pointer' }}
              onClick={(event) => {
                event.stopPropagation();
                dispatch({ type: 'select-node', id: node.id });
              }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
