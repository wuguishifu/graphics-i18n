import type { LpkgContainer } from '../package/container.js';
import type { EffectiveScene } from '../types/effective.js';
import type { LocalePack } from '../types/locale.js';
import type { PackageManifest } from '../types/manifest.js';
import type { Scene } from '../types/scene.js';
import { LruCache } from './lru.js';

/**
 * Module-level caches (spec §5.4). Package entries hold the opened container
 * plus parsed manifest/scene; locale packs and effective scenes are cached
 * separately so unused locales can be evicted first.
 */
export type CachedPackage = {
  manifest: PackageManifest;
  scene: Scene;
  container: LpkgContainer;
};

export const packageCache = new LruCache<string, CachedPackage>(8);

/** key: `${packageKey}#${locale}` */
export const localePackCache = new LruCache<string, LocalePack>(16);

/** key: `${packageKey}#${locale}#${fallbackLocale}` */
export const effectiveSceneCache = new LruCache<string, EffectiveScene>(8);

export function clearAllCaches(): void {
  packageCache.clear();
  localePackCache.clear();
  effectiveSceneCache.clear();
}
