import {
  Group,
  Image,
  ImageSVG,
  Line,
  Path,
  Rect,
  RoundedRect,
  Text,
  vec,
  type SkImage,
  type SkSVG,
} from '@shopify/react-native-skia';
import { IDENTITY, type Box, type EffectiveNode, type Matrix2D, type ResolvedTextLayout } from '@wuguishifu/core';
import type { ReactNode } from 'react';
import type { SkiaTextMeasurer } from './skiaTextMeasurer.js';

export type RenderResources = {
  images: Map<string, SkImage>;
  svgs: Map<string, SkSVG>;
  measurer: SkiaTextMeasurer;
};

/** [a,b,c,d,tx,ty] -> row-major 3x3 for Skia. */
export function toSkMatrix(m: Matrix2D): number[] {
  return [m[0], m[2], m[4], m[1], m[3], m[5], 0, 0, 1];
}

function isIdentity(m: Matrix2D): boolean {
  return m === IDENTITY || (m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0);
}

// Baseline offset from line top; Skia line metrics vary per face, a fixed
// ascent ratio keeps layout deterministic across platforms (spec §4.4).
const ASCENT_RATIO = 0.8;

function textLines(layout: ResolvedTextLayout, bounds: Box, measurer: SkiaTextMeasurer): ReactNode[] {
  const { style, lines, fontSize, lineHeight } = layout;
  const font = measurer.getFont(style, fontSize);
  const contentHeight = lines.length * lineHeight;
  const valign = style.valign ?? 'top';
  const offsetY =
    valign === 'middle'
      ? (bounds.height - contentHeight) / 2
      : valign === 'bottom'
        ? bounds.height - contentHeight
        : 0;

  return lines.map((line, index) => {
    const width = measurer.measureWidth(line, style, fontSize);
    const align = style.align ?? 'left';
    const x =
      align === 'center'
        ? bounds.x + (bounds.width - width) / 2
        : align === 'right'
          ? bounds.x + bounds.width - width
          : bounds.x;
    const y = bounds.y + offsetY + index * lineHeight + fontSize * ASCENT_RATIO;
    return <Text key={index} x={x} y={y} text={line} font={font} color={style.color} />;
  });
}

/** Map one effective node to Skia elements. Returns null for unloaded assets. */
export function drawNode(node: EffectiveNode, resources: RenderResources): ReactNode {
  if (!node.visible || node.opacity <= 0) {
    return null;
  }
  const { bounds, draw } = node;
  let content: ReactNode = null;

  switch (draw.kind) {
    case 'rect':
      content = (
        <>
          {draw.fill !== undefined && (
            <RoundedRect
              x={bounds.x}
              y={bounds.y}
              width={bounds.width}
              height={bounds.height}
              r={draw.radius}
              color={draw.fill}
            />
          )}
          {draw.stroke && (
            <RoundedRect
              x={bounds.x}
              y={bounds.y}
              width={bounds.width}
              height={bounds.height}
              r={draw.radius}
              color={draw.stroke.color}
              style="stroke"
              strokeWidth={draw.stroke.width}
            />
          )}
        </>
      );
      break;
    case 'image': {
      const image = resources.images.get(draw.assetId);
      if (!image) return null;
      content = (
        <Image
          image={image}
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          fit={draw.fit}
        />
      );
      break;
    }
    case 'svg': {
      const svg = resources.svgs.get(draw.assetId);
      if (!svg) return null;
      content = (
        <ImageSVG svg={svg} x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} />
      );
      break;
    }
    case 'text':
      content = <>{textLines(draw.layout, bounds, resources.measurer)}</>;
      break;
    case 'badge':
      content = (
        <>
          <RoundedRect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            r={draw.background.radius}
            color={draw.background.fill}
          />
          {textLines(draw.layout, bounds, resources.measurer)}
        </>
      );
      break;
    case 'path':
      content = (
        <>
          {draw.fill !== undefined && <Path path={draw.d} color={draw.fill} />}
          {draw.stroke && (
            <Path path={draw.d} color={draw.stroke.color} style="stroke" strokeWidth={draw.stroke.width} />
          )}
        </>
      );
      break;
    case 'line':
      content = (
        <Line
          p1={vec(draw.x1, draw.y1)}
          p2={vec(draw.x2, draw.y2)}
          color={draw.stroke.color}
          style="stroke"
          strokeWidth={draw.stroke.width}
        />
      );
      break;
  }

  if (node.opacity < 1 || !isIdentity(node.matrix)) {
    return (
      <Group key={node.id} matrix={toSkMatrix(node.matrix)} opacity={node.opacity}>
        {content}
      </Group>
    );
  }
  return <Group key={node.id}>{content}</Group>;
}

/** Stroked bounds for the debug overlay (spec §9). */
export function drawDebugBounds(node: EffectiveNode): ReactNode {
  return (
    <Group key={`debug-${node.id}`} matrix={toSkMatrix(node.matrix)}>
      <Rect
        x={node.bounds.x}
        y={node.bounds.y}
        width={node.bounds.width}
        height={node.bounds.height}
        color={node.visible ? 'rgba(255,0,128,0.9)' : 'rgba(128,128,128,0.6)'}
        style="stroke"
        strokeWidth={1}
      />
    </Group>
  );
}
