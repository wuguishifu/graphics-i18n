import {
  approxTextMeasurer,
  buildEffectiveScene,
  createMemoryContainer,
  resolveLocale,
  type EffectiveScene,
  type TextMeasurer,
} from '@wuguishifu/core';
import { buildSvgResources, createCanvasTextMeasurer, type SvgResources } from '@wuguishifu/react-graphics-i18n';
import { useEffect, useMemo, useState } from 'react';
import { deriveManifest, docToFiles } from './serialize';
import type { EditorDoc } from './types';

export type Preview = {
  scene: EffectiveScene;
  resources: SvgResources;
  error?: string;
};

/**
 * Rebuilds the effective scene + SVG resources whenever the doc or preview
 * locale changes. Fonts are measured through the browser canvas once the
 * package's FontFaces are registered; the approximate measurer covers the
 * first render.
 */
export function usePreview(doc: EditorDoc, locale: string): Preview | { scene?: undefined; resources?: undefined; error: string } {
  const [measurer, setMeasurer] = useState<TextMeasurer>(approxTextMeasurer);

  // Font set identity: reload FontFaces only when the font table changes.
  const fontKey = JSON.stringify(doc.manifest.fonts ?? {});
  useEffect(() => {
    let cancelled = false;
    const manifest = deriveManifest(doc);
    const container = createMemoryContainer(docToFiles(doc));
    createCanvasTextMeasurer({ manifest, container })
      .then((created) => {
        if (!cancelled) setMeasurer(() => created);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [fontKey]);

  return useMemo(() => {
    try {
      const manifest = deriveManifest(doc);
      const files = docToFiles(doc);
      const container = createMemoryContainer(files);
      const resolved = resolveLocale(manifest, locale);
      const localePack = doc.locales[resolved.locale];
      const fallbackPack = doc.locales[resolved.fallbackLocale] ?? localePack;
      const scene = buildEffectiveScene({
        manifest,
        scene: doc.scene,
        localePack,
        fallbackPack,
        patch: doc.patches[resolved.locale],
        resolved,
        measurer,
      });
      const resources = buildSvgResources(container, manifest, scene);
      return { scene, resources };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }, [doc, locale, measurer]);
}
