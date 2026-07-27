import {
  openContainer,
  packLpkgFromFiles,
  parseScene,
  validateManifest,
  type LocaleEntry,
  type LocalePack,
  type LocalePatch,
  type LpkgFileContent,
  type PackageManifest,
} from '@wuguishifu/core';
import type { EditorDoc } from './types';

/** Manifest with chunks + locales[] recomputed from the doc's actual state. */
export function deriveManifest(doc: EditorDoc): PackageManifest {
  const localeCodes = Object.keys(doc.locales);
  const patches = Object.fromEntries(
    Object.entries(doc.patches)
      .filter(([, patch]) => Object.keys(patch.nodes).length > 0)
      .map(([locale]) => [locale, `patches/${locale}.json`]),
  );
  const previous = new Map(doc.manifest.locales.map((entry) => [entry.locale, entry]));
  const locales: LocaleEntry[] = localeCodes.map((locale) => ({
    ...previous.get(locale),
    locale,
    direction: doc.locales[locale].direction,
    strings: true,
    patch: locale in patches || undefined,
  }));
  return {
    ...doc.manifest,
    chunks: {
      scene: 'scene.json',
      locales: Object.fromEntries(localeCodes.map((locale) => [locale, `locales/${locale}.json`])),
      patches: Object.keys(patches).length > 0 ? patches : undefined,
      assets: Object.fromEntries(
        Object.entries(doc.manifest.assets).map(([id, entry]) => [id, entry.path]),
      ),
      fonts: doc.manifest.fonts
        ? Object.fromEntries(Object.entries(doc.manifest.fonts).map(([id, entry]) => [id, entry.path]))
        : undefined,
    },
    locales,
    updatedAt: new Date().toISOString(),
    authoringTool: { name: 'graphics-i18n editor', version: '0.1.0' },
  };
}

/** Full chunk map for packing or in-memory preview containers. */
export function docToFiles(doc: EditorDoc): Record<string, LpkgFileContent> {
  const manifest = deriveManifest(doc);
  const files: Record<string, LpkgFileContent> = {
    ...doc.files,
    'manifest.json': manifest,
    'scene.json': doc.scene,
  };
  for (const [locale, pack] of Object.entries(doc.locales)) {
    files[`locales/${locale}.json`] = pack;
  }
  for (const [locale, path] of Object.entries(manifest.chunks.patches ?? {})) {
    files[path] = doc.patches[locale];
  }
  return files;
}

export function exportLpkg(doc: EditorDoc): Uint8Array {
  return packLpkgFromFiles(docToFiles(doc));
}

export function importLpkg(bytes: Uint8Array): EditorDoc {
  const container = openContainer(bytes);
  const manifest = validateManifest(container.readJson('manifest.json'));
  const scene = parseScene(container.readJson(manifest.chunks.scene));

  const locales: Record<string, LocalePack> = {};
  for (const [locale, path] of Object.entries(manifest.chunks.locales)) {
    if (container.has(path)) {
      locales[locale] = container.readJson<LocalePack>(path);
    }
  }
  const patches: Record<string, LocalePatch> = {};
  for (const [locale, path] of Object.entries(manifest.chunks.patches ?? {})) {
    if (container.has(path)) {
      patches[locale] = container.readJson<LocalePatch>(path);
    }
  }

  // Everything that isn't a JSON chunk (assets, fonts, licenses…) is kept as-is.
  const jsonPaths = new Set([
    'manifest.json',
    manifest.chunks.scene,
    ...Object.values(manifest.chunks.locales),
    ...Object.values(manifest.chunks.patches ?? {}),
  ]);
  const files: Record<string, Uint8Array> = {};
  for (const path of container.paths()) {
    if (!jsonPaths.has(path)) {
      files[path] = container.readChunk(path);
    }
  }

  return { manifest, scene, locales, patches, files };
}
