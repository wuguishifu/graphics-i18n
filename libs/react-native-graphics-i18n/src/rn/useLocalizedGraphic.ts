import { collectVisibleAssetIds, loadLocalizedGraphic, packageIdentity, sourceKey, type EffectiveScene, type GraphicError, type GraphicSource, type PackageManifest } from '@wuguishifu/core';
import { useEffect, useRef, useState } from 'react';
import type { RenderResources } from './drawNode.js';
import { loadFonts } from './loadFont.js';
import { loadAssets } from './loadImage.js';
import { installRnSourceReader } from './resolveRnSource.js';
import { SkiaTextMeasurer } from './skiaTextMeasurer.js';

export type LoadedGraphic = {
  manifest: PackageManifest;
  effectiveScene: EffectiveScene;
  resources: RenderResources;
  /** Scene diagnostics plus font/asset load issues. */
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
 * Load a package, its fonts and the assets needed by the requested locale
 * (spec §5.3). Re-runs only when the source identity, locale or fallback
 * changes.
 */
export function useLocalizedGraphic(
  source: GraphicSource,
  locale: string,
  options: UseLocalizedGraphicOptions = {},
): UseLocalizedGraphicState {
  const [state, setState] = useState<UseLocalizedGraphicState>({ status: 'loading' });
  const { fallbackLocale } = options;

  // Keep callbacks out of the effect deps so identity churn doesn't reload.
  const callbacks = useRef(options);
  callbacks.current = options;

  const key = sourceKey(source);
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    installRnSourceReader();
    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      const result = await loadLocalizedGraphic(sourceRef.current, locale, fallbackLocale, {
        createMeasurer: ({ manifest, container }) =>
          Promise.resolve(new SkiaTextMeasurer(loadFonts(container, manifest, packageIdentity(manifest)))),
      });
      const fonts = loadFonts(result.container, result.manifest, packageIdentity(result.manifest));
      const assets = loadAssets(
        result.container,
        result.manifest,
        result.packageKey,
        collectVisibleAssetIds(result.effectiveScene),
      );
      if (cancelled) return;
      setState({
        status: 'ready',
        graphic: {
          manifest: result.manifest,
          effectiveScene: result.effectiveScene,
          resources: {
            images: assets.images,
            svgs: assets.svgs,
            measurer: new SkiaTextMeasurer(fonts),
          },
          diagnostics: [
            ...result.effectiveScene.meta.diagnostics,
            ...fonts.diagnostics,
            ...assets.diagnostics,
          ],
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
