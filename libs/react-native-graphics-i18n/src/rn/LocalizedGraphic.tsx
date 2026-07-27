import { memo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { GraphicSource } from '../package/sourceReader.js';
import { DebugOverlay } from './DebugOverlay.js';
import { GraphicCanvas } from './renderSkia.js';
import { useLocalizedGraphic } from './useLocalizedGraphic.js';

export type LocalizedGraphicProps = {
  source: GraphicSource;
  locale: string;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  fallbackLocale?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  debug?: boolean;
};

function resolveSize(
  width: number | undefined,
  height: number | undefined,
  canvas: { width: number; height: number },
): { width: number; height: number } {
  if (width !== undefined && height !== undefined) return { width, height };
  const aspect = canvas.height / canvas.width;
  if (width !== undefined) return { width, height: width * aspect };
  if (height !== undefined) return { width: height / aspect, height };
  return { width: canvas.width, height: canvas.height };
}

/**
 * Renders one locale of an .lpkg like a plain asset (spec §4.1):
 *
 * ```tsx
 * <LocalizedGraphic source={require('./banner.lpkg')} locale="fr" />
 * ```
 */
export const LocalizedGraphic = memo(function LocalizedGraphic(props: LocalizedGraphicProps) {
  const { source, locale, width, height, style, fallbackLocale, onLoad, onError, debug } = props;
  const state = useLocalizedGraphic(source, locale, { fallbackLocale, onLoad, onError });

  if (state.status !== 'ready') {
    // Reserve the requested footprint while loading / after an error.
    return <View style={[width !== undefined || height !== undefined ? { width, height } : null, style]} />;
  }

  const size = resolveSize(width, height, state.graphic.effectiveScene.canvas);
  return (
    <View style={[{ width: size.width, height: size.height }, style]}>
      <GraphicCanvas
        scene={state.graphic.effectiveScene}
        resources={state.graphic.resources}
        width={size.width}
        height={size.height}
        debug={debug}
      />
      {debug && <DebugOverlay graphic={state.graphic} />}
    </View>
  );
});
