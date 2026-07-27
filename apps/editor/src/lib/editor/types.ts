import type { LocalePack, LocalePatch, PackageManifest, Scene } from '@wuguishifu/core';

/**
 * In-memory editor document. `manifest` is canonical for package metadata,
 * canvas, render settings and the asset/font tables; `chunks` and the
 * per-locale strings/patch booleans are derived at export time.
 */
export type EditorDoc = {
  manifest: PackageManifest;
  scene: Scene;
  locales: Record<string, LocalePack>;
  patches: Record<string, LocalePatch>;
  /** Binary chunks (assets/, fonts/, licenses…): path -> bytes */
  files: Record<string, Uint8Array>;
};

export function blankDoc(): EditorDoc {
  const locale = 'en';
  return {
    manifest: {
      schemaVersion: '1.0.0',
      packageId: `graphic-${Date.now().toString(36)}`,
      packageVersion: 1,
      name: 'Untitled graphic',
      canvas: { width: 1200, height: 630, background: '#ffffff' },
      render: { engine: 'svg', defaultLocale: locale, fallbackLocale: locale },
      chunks: { scene: 'scene.json', locales: {} },
      locales: [{ locale, label: 'English', strings: true }],
      assets: {},
      fonts: {},
    },
    scene: {
      sceneVersion: '1.0.0',
      root: [
        {
          id: 'title',
          type: 'text',
          bind: 'title',
          fallbackText: 'New graphic',
          box: { x: 80, y: 80, width: 600, height: 120 },
          style: { fontFamily: 'Inter', fontSize: 64, fontWeight: 700, color: '#111111' },
          fit: { mode: 'shrink', minFontSize: 24 },
        },
      ],
    },
    locales: { [locale]: { locale, strings: { title: 'New graphic' } } },
    patches: {},
    files: {},
  };
}

let nodeCounter = 0;

export function nextNodeId(prefix: string): string {
  nodeCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${nodeCounter}`;
}
