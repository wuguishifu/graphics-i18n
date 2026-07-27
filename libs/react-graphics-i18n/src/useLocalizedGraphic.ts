import {
  loadLocalizedGraphic,
  sourceKey,
  type EffectiveScene,
  type GraphicError,
  type GraphicSource,
  type PackageManifest,
} from '@wuguishifu/core';
import { useEffect, useRef, useState } from 'react';
import { createCanvasTextMeasurer } from './canvasTextMeasurer.js';
import { buildSvgResources, type SvgResources } from './svgResources.js';

export type LoadedGraphic = {
  manifest: PackageManifest;
  effectiveScene: EffectiveScene;
  resources: SvgResources;
  /** Scene diagnostics plus asset/font resolution issues. */
  diagnostics: GraphicError[];
};

export type UseLocalizedGraphicState =
  | { status: 'loading'; graphic?: undefined; error?: undefined }
  | { status: 'ready'; graphic: LoadedGraphic; error?: undefined }
  | { status: 'error'; graphic?: undefined; error: Error };

export type UseLocalizedGraphicOptions = {
  fallbackLocale?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
};

/**
 * Web loader (spec §5.3): opens the package, registers embedded fonts,
 * measures with the browser canvas and inlines the assets the requested
 * locale needs. Re-runs only when source identity, locale or fallback change.
 */
export function useLocalizedGraphic(
  source: GraphicSource,
  locale: string,
  options: UseLocalizedGraphicOptions = {},
): UseLocalizedGraphicState {
  const [state, setState] = useState<UseLocalizedGraphicState>({ status: 'loading' });
  const { fallbackLocale } = options;

  const callbacks = useRef(options);
  callbacks.current = options;

  const key = sourceKey(source);
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      const result = await loadLocalizedGraphic(sourceRef.current, locale, fallbackLocale, {
        createMeasurer: createCanvasTextMeasurer,
      });
      const resources = buildSvgResources(result.container, result.manifest, result.effectiveScene);
      if (cancelled) return;
      setState({
        status: 'ready',
        graphic: {
          manifest: result.manifest,
          effectiveScene: result.effectiveScene,
          resources,
          diagnostics: [...result.effectiveScene.meta.diagnostics, ...resources.diagnostics],
        },
      });
      callbacks.current.onLoad?.();
    })().catch((error: unknown) => {
      if (cancelled) return;
      const wrapped = error instanceof Error ? error : new Error(String(error));
      setState({ status: 'error', error: wrapped });
      callbacks.current.onError?.(wrapped);
    });

    return () => {
      cancelled = true;
    };
  }, [key, locale, fallbackLocale]);

  return state;
}
