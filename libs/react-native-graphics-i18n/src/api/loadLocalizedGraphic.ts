import { effectiveSceneCache, localePackCache, packageCache, type CachedPackage } from '../cache/caches.js';
import { buildEffectiveScene } from '../effective/buildEffectiveScene.js';
import type { TextMeasurer } from '../layout/textMeasurer.js';
import { migratePackage } from '../migrate/migratePackage.js';
import type { LpkgContainer } from '../package/container.js';
import { openPackage, packageIdentity, readLocalePack, readLocalePatch } from '../package/openPackage.js';
import { resolveLocale } from '../package/resolveLocale.js';
import type { GraphicSource, SourceReader } from '../package/sourceReader.js';
import { getDefaultSourceReader, sourceKey } from '../package/sourceReader.js';
import { parseScene } from '../scene/parseScene.js';
import type { EffectiveScene } from '../types/effective.js';
import type { LocalePack } from '../types/locale.js';
import type { PackageManifest } from '../types/manifest.js';
import type { Scene } from '../types/scene.js';

export type LoadPackageResult = {
  manifest: PackageManifest;
  scene: Scene;
  localePack: LocalePack;
  effectiveScene: EffectiveScene;
  /** Open container, for renderers that still need asset/font bytes. */
  container: LpkgContainer;
  /** Cache key identifying this package instance. */
  packageKey: string;
};

export type LoadOptions = {
  reader?: SourceReader;
  /**
   * Measurement backend for text fitting. The RN renderer passes a
   * Skia-backed factory here; the default approximate measurer keeps the
   * core usable in Node/SSR.
   */
  createMeasurer?: (pkg: { manifest: PackageManifest; container: LpkgContainer }) => Promise<TextMeasurer>;
};

async function openCached(source: GraphicSource, reader: SourceReader): Promise<{ key: string; pkg: CachedPackage }> {
  // First probe by source key only (cheap hit for repeat loads of the same ref).
  const probeKey = `src:${sourceKey(source)}`;
  const cached = packageCache.get(probeKey);
  if (cached) {
    return { key: probeKey, pkg: cached };
  }
  const opened = await openPackage(source, reader);
  const rawScene = opened.container.readJson(opened.manifest.chunks.scene);
  const migrated = migratePackage(opened.manifest, parseScene(rawScene));
  const pkg: CachedPackage = {
    manifest: migrated.manifest,
    scene: migrated.scene,
    container: opened.container,
  };
  packageCache.set(probeKey, pkg);
  return { key: probeKey, pkg };
}

/**
 * Full pipeline (spec §5.2): open + validate the package, negotiate the
 * locale, load only that locale's pack/patch and produce the effective scene.
 * Results are cached at package, locale-pack and effective-scene level.
 */
export async function loadLocalizedGraphic(
  source: GraphicSource,
  locale: string,
  fallbackLocale?: string,
  options: LoadOptions = {},
): Promise<LoadPackageResult> {
  const reader = options.reader ?? getDefaultSourceReader();
  const { pkg } = await openCached(source, reader);
  const { manifest, scene, container } = pkg;
  const packageKey = `${sourceKey(source)}|${packageIdentity(manifest)}`;

  const resolved = resolveLocale(manifest, locale, fallbackLocale);

  const packFor = (loc: string): LocalePack => {
    const key = `${packageKey}#${loc}`;
    const cached = localePackCache.get(key);
    if (cached) return cached;
    const pack = readLocalePack(container, manifest, loc);
    localePackCache.set(key, pack);
    return pack;
  };

  const localePack = packFor(resolved.locale);
  const fallbackPack =
    resolved.fallbackLocale !== resolved.locale && manifest.chunks.locales[resolved.fallbackLocale]
      ? packFor(resolved.fallbackLocale)
      : localePack;

  const sceneCacheKey = `${packageKey}#${resolved.locale}#${resolved.fallbackLocale}#${
    options.createMeasurer ? 'custom' : 'approx'
  }`;
  let effectiveScene = effectiveSceneCache.get(sceneCacheKey);
  if (!effectiveScene) {
    const measurer = options.createMeasurer
      ? await options.createMeasurer({ manifest, container })
      : undefined;
    effectiveScene = buildEffectiveScene({
      manifest,
      scene,
      localePack,
      fallbackPack,
      patch: readLocalePatch(container, manifest, resolved.locale),
      resolved,
      measurer,
    });
    effectiveSceneCache.set(sceneCacheKey, effectiveScene);
  }

  return { manifest, scene, localePack, effectiveScene, container, packageKey };
}

/** Warm the caches for a source/locale pair without rendering. */
export async function prefetchLocalizedGraphic(
  source: GraphicSource,
  locale: string,
  options: LoadOptions = {},
): Promise<void> {
  await loadLocalizedGraphic(source, locale, undefined, options);
}

/** Open and validate a package, returning its manifest (spec §5.2). */
export async function validateLocalizedGraphicPackage(
  source: GraphicSource,
  options: Pick<LoadOptions, 'reader'> = {},
): Promise<PackageManifest> {
  const opened = await openPackage(source, options.reader ?? getDefaultSourceReader());
  // Also make sure the scene parses and the package major is supported.
  const scene = parseScene(opened.container.readJson(opened.manifest.chunks.scene));
  return migratePackage(opened.manifest, scene).manifest;
}
