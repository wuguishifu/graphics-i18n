import { LpkgError } from '../types/errors.js';
import type { LocalePack, LocalePatch } from '../types/locale.js';
import type { PackageManifest } from '../types/manifest.js';
import { openContainer, type LpkgContainer } from './container.js';
import {
  getDefaultSourceReader,
  sourceKey,
  type GraphicSource,
  type SourceReader,
} from './sourceReader.js';
import { validateManifest } from './validateManifest.js';

export type OpenedPackage = {
  key: string; // cache key: sourceKey + package identity
  manifest: PackageManifest;
  container: LpkgContainer;
};

/** Identity string used for all package-scoped caches (spec §5.4). */
export function packageIdentity(manifest: PackageManifest): string {
  const hash = manifest.integrity?.sha256;
  return `${manifest.packageId}@${manifest.packageVersion}${hash ? `:${hash}` : ''}`;
}

/**
 * Stage 1 of the pipeline (spec §4.2): resolve the source, open the
 * container and validate the manifest.
 */
export async function openPackage(
  source: GraphicSource,
  reader: SourceReader = getDefaultSourceReader(),
): Promise<OpenedPackage> {
  const bytes = await reader.read(source);
  const container = openContainer(bytes);
  if (!container.has('manifest.json')) {
    throw new LpkgError({
      code: 'INVALID_PACKAGE',
      message: 'Package is missing manifest.json',
    });
  }
  const manifest = validateManifest(container.readJson('manifest.json'));
  return { key: `${sourceKey(source)}|${packageIdentity(manifest)}`, manifest, container };
}

export function readLocalePack(
  container: LpkgContainer,
  manifest: PackageManifest,
  locale: string,
): LocalePack {
  const path = manifest.chunks.locales[locale];
  if (!path) {
    throw new LpkgError({
      code: 'LOCALE_MISSING',
      message: `No locale pack chunk for "${locale}"`,
      locale,
    });
  }
  const pack = container.readJson<LocalePack>(path);
  if (typeof pack !== 'object' || pack === null || typeof pack.strings !== 'object') {
    throw new LpkgError({
      code: 'INVALID_PACKAGE',
      message: `Locale pack "${locale}" must contain a strings record`,
    });
  }
  return pack;
}

/** Missing patches are ignored per spec §4.6 — returns undefined. */
export function readLocalePatch(
  container: LpkgContainer,
  manifest: PackageManifest,
  locale: string,
): LocalePatch | undefined {
  const path = manifest.chunks.patches?.[locale];
  if (!path || !container.has(path)) {
    return undefined;
  }
  const patch = container.readJson<LocalePatch>(path);
  if (typeof patch !== 'object' || patch === null || typeof patch.nodes !== 'object') {
    return undefined;
  }
  return patch;
}
