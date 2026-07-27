import type { GraphicSource } from '@wuguishifu/core';
import { memo, type CSSProperties } from 'react';
import { SvgGraphic } from './SvgGraphic.js';
import { useLocalizedGraphic } from './useLocalizedGraphic.js';

export type LocalizedGraphicProps = {
  source: GraphicSource;
  locale: string;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
  fallbackLocale?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  debug?: boolean;
};

function resolveSize(
  width: number | undefined,
  height: number | undefined,
  canvas: { width: number; height: number },
): { width: number; height: number } | undefined {
  if (width !== undefined && height !== undefined) return { width, height };
  const aspect = canvas.height / canvas.width;
  if (width !== undefined) return { width, height: width * aspect };
  if (height !== undefined) return { width: height / aspect, height };
  // No explicit size: scale to the container via viewBox.
  return undefined;
}

/**
 * Web counterpart of the React Native component (spec §4.1) — renders one
 * locale of an .lpkg as an inline SVG:
 *
 * ```tsx
 * <LocalizedGraphic source="/graphics/banner.lpkg" locale="fr" width={640} />
 * ```
 */
export const LocalizedGraphic = memo(function LocalizedGraphic(props: LocalizedGraphicProps) {
  const { source, locale, width, height, className, style, fallbackLocale, onLoad, onError, debug } =
    props;
  const state = useLocalizedGraphic(source, locale, { fallbackLocale, onLoad, onError });

  if (state.status !== 'ready') {
    return <div className={className} style={{ width, height, ...style }} />;
  }

  const size = resolveSize(width, height, state.graphic.effectiveScene.canvas);
  return (
    <div
      className={className}
      style={{ position: 'relative', width: size?.width, height: size?.height, ...style }}
    >
      <SvgGraphic
        scene={state.graphic.effectiveScene}
        resources={state.graphic.resources}
        width={size?.width}
        height={size?.height}
        style={size === undefined ? { width: '100%', height: 'auto', display: 'block' } : undefined}
        debug={debug}
      />
      {debug && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            font: '10px monospace',
            padding: 4,
            pointerEvents: 'none',
          }}
        >
          <div>
            locale: {state.graphic.effectiveScene.meta.locale}
            {state.graphic.effectiveScene.meta.usedFallbackLocale
              ? ` (fallback from "${state.graphic.effectiveScene.meta.requestedLocale}")`
              : ''}
            {' | patch: '}
            {state.graphic.effectiveScene.meta.patchApplied ? 'applied' : 'none'}
          </div>
          {state.graphic.diagnostics.map((diagnostic, index) => (
            <div key={index} style={{ color: '#ffcc66' }}>
              {diagnostic.code}: {diagnostic.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
