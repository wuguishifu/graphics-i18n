import {
  IDENTITY,
  type Box,
  type EffectiveNode,
  type Matrix2D,
  type ResolvedTextLayout,
} from '@graphics-i18n/core';
import type { CSSProperties, ReactNode } from 'react';
import type { SvgResources } from './svgResources.js';

function isIdentity(m: Matrix2D): boolean {
  return (
    m === IDENTITY ||
    (m[0] === 1 &&
      m[1] === 0 &&
      m[2] === 0 &&
      m[3] === 1 &&
      m[4] === 0 &&
      m[5] === 0)
  );
}

function svgTransform(m: Matrix2D): string {
  return `matrix(${m[0]} ${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]})`;
}

const FIT_TO_PRESERVE: Record<string, string> = {
  contain: 'xMidYMid meet',
  cover: 'xMidYMid slice',
  fill: 'none',
  none: 'xMidYMid meet',
};

// Same fixed ascent heuristic as the Skia renderer so both backends place
// baselines identically for a given effective scene.
const ASCENT_RATIO = 0.8;

function textLines(layout: ResolvedTextLayout, bounds: Box): ReactNode[] {
  const { style, lines, fontSize, lineHeight, direction } = layout;
  const align = style.align ?? 'left';
  const anchor =
    align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
  const x =
    align === 'center'
      ? bounds.x + bounds.width / 2
      : align === 'right'
        ? bounds.x + bounds.width
        : bounds.x;
  const contentHeight = lines.length * lineHeight;
  const valign = style.valign ?? 'top';
  const offsetY =
    valign === 'middle'
      ? (bounds.height - contentHeight) / 2
      : valign === 'bottom'
        ? bounds.height - contentHeight
        : 0;
  const decoration =
    [style.underline ? 'underline' : '', style.strike ? 'line-through' : '']
      .join(' ')
      .trim() || undefined;
  const textStyle: CSSProperties | undefined =
    direction === 'rtl' ? { direction: 'rtl' } : undefined;

  return lines.map((line, index) => (
    <text
      key={index}
      x={x}
      y={bounds.y + offsetY + index * lineHeight + fontSize * ASCENT_RATIO}
      textAnchor={anchor}
      fill={style.color}
      fontFamily={style.fontFamily}
      fontSize={fontSize}
      fontWeight={style.fontWeight}
      fontStyle={style.fontStyle}
      letterSpacing={style.letterSpacing}
      textDecoration={decoration}
      style={textStyle}
    >
      {line}
    </text>
  ));
}

/** Map one effective node to SVG elements. Returns null for unloaded assets. */
export function drawNodeSvg(
  node: EffectiveNode,
  resources: SvgResources,
): ReactNode {
  if (!node.visible || node.opacity <= 0) {
    return null;
  }
  const { bounds, draw } = node;
  let content: ReactNode = null;

  switch (draw.kind) {
    case 'rect':
      content = (
        <rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          rx={draw.radius || undefined}
          fill={draw.fill ?? 'none'}
          stroke={draw.stroke?.color}
          strokeWidth={draw.stroke?.width}
        />
      );
      break;
    case 'image':
    case 'svg': {
      const href = resources.hrefs.get(draw.assetId);
      if (!href) return null;
      content = (
        <image
          href={href}
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          preserveAspectRatio={
            draw.kind === 'image'
              ? FIT_TO_PRESERVE[draw.fit]
              : FIT_TO_PRESERVE['contain']
          }
        />
      );
      break;
    }
    case 'text':
      content = <>{textLines(draw.layout, bounds)}</>;
      break;
    case 'badge':
      content = (
        <>
          <rect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            rx={draw.background.radius || undefined}
            fill={draw.background.fill}
          />
          {textLines(draw.layout, bounds)}
        </>
      );
      break;
    case 'path':
      content = (
        <path
          d={draw.d}
          fill={draw.fill ?? 'none'}
          stroke={draw.stroke?.color}
          strokeWidth={draw.stroke?.width}
        />
      );
      break;
    case 'line':
      content = (
        <line
          x1={draw.x1}
          y1={draw.y1}
          x2={draw.x2}
          y2={draw.y2}
          stroke={draw.stroke.color}
          strokeWidth={draw.stroke.width}
        />
      );
      break;
  }

  const needsGroup = node.opacity < 1 || !isIdentity(node.matrix);
  if (needsGroup) {
    return (
      <g
        key={node.id}
        transform={
          isIdentity(node.matrix) ? undefined : svgTransform(node.matrix)
        }
        opacity={node.opacity < 1 ? node.opacity : undefined}
      >
        {content}
      </g>
    );
  }
  return <g key={node.id}>{content}</g>;
}

/** Stroked bounds for the debug overlay (spec §9). */
export function drawDebugBoundsSvg(node: EffectiveNode): ReactNode {
  return (
    <g
      key={`debug-${node.id}`}
      transform={
        isIdentity(node.matrix) ? undefined : svgTransform(node.matrix)
      }
    >
      <rect
        x={node.bounds.x}
        y={node.bounds.y}
        width={node.bounds.width}
        height={node.bounds.height}
        fill="none"
        stroke={node.visible ? 'rgba(255,0,128,0.9)' : 'rgba(128,128,128,0.6)'}
        strokeWidth={1}
      />
    </g>
  );
}
