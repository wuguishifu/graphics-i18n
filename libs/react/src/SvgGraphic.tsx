import type { EffectiveScene } from '@graphics-i18n/core';
import type { CSSProperties } from 'react';
import { drawDebugBoundsSvg, drawNodeSvg } from './drawNodeSvg.js';
import type { SvgResources } from './svgResources.js';

export type SvgGraphicProps = {
  scene: EffectiveScene;
  resources: SvgResources;
  /**
   * Display size. When omitted the SVG has only a viewBox and scales to its
   * container, keeping the canvas aspect ratio.
   */
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
  debug?: boolean;
};

/**
 * Pure SVG render of an effective scene. Self-contained (data-URI assets and
 * fonts), so it works with renderToStaticMarkup for SSR as well as in the
 * browser.
 */
export function SvgGraphic({
  scene,
  resources,
  width,
  height,
  className,
  style,
  debug,
}: SvgGraphicProps) {
  const { canvas } = scene;
  return (
    <svg
      viewBox={`0 0 ${canvas.width} ${canvas.height}`}
      width={width}
      height={height}
      className={className}
      style={style}
      role="img"
      xmlns="http://www.w3.org/2000/svg"
    >
      {resources.fontCss !== '' && <style>{resources.fontCss}</style>}
      {canvas.background !== undefined && (
        <rect
          x={0}
          y={0}
          width={canvas.width}
          height={canvas.height}
          fill={canvas.background}
        />
      )}
      {scene.nodes.map((node) => drawNodeSvg(node, resources))}
      {debug && scene.nodes.map((node) => drawDebugBoundsSvg(node))}
    </svg>
  );
}
