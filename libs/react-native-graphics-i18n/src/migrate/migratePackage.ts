import { parseMajorVersion, SUPPORTED_SCHEMA_MAJOR } from '../package/validateManifest.js';
import { invalidPackage } from '../types/errors.js';
import type { PackageManifest } from '../types/manifest.js';
import type { Scene } from '../types/scene.js';

export const SUPPORTED_SCENE_MAJOR = 1;

/**
 * Migration layer (spec §6.4). v1 knows a single major version, so this is a
 * pass-through for 1.x packages and a structured rejection for anything newer.
 * Future format revisions add in-memory upgrade steps here.
 */
export function migratePackage(
  manifest: PackageManifest,
  scene: Scene,
): { manifest: PackageManifest; scene: Scene } {
  const schemaMajor = parseMajorVersion(manifest.schemaVersion);
  if (schemaMajor === undefined || schemaMajor > SUPPORTED_SCHEMA_MAJOR) {
    throw invalidPackage(
      `Unsupported package schemaVersion "${manifest.schemaVersion}" (supported major: ${SUPPORTED_SCHEMA_MAJOR})`,
    );
  }
  const sceneMajor = parseMajorVersion(scene.sceneVersion);
  if (sceneMajor === undefined || sceneMajor > SUPPORTED_SCENE_MAJOR) {
    throw invalidPackage(
      `Unsupported sceneVersion "${scene.sceneVersion}" (supported major: ${SUPPORTED_SCENE_MAJOR})`,
    );
  }
  return { manifest, scene };
}
