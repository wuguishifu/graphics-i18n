import { createHash } from 'node:crypto';
import { migratePackage } from '../migrate/migratePackage.js';
import { openContainer } from '../package/container.js';
import { validateManifest } from '../package/validateManifest.js';
import { parseScene } from '../scene/parseScene.js';
import { LpkgError } from '../types/errors.js';
import type { PackageManifest } from '../types/manifest.js';

export type ValidateLpkgResult = {
  ok: boolean;
  manifest?: PackageManifest;
  issues: string[];
};

/**
 * Deep validation of a built .lpkg: manifest rules, scene parse, chunk
 * presence for every referenced path, locale pack shape, and integrity
 * hashes when present. Collects issues instead of throwing.
 */
export function validateLpkg(bytes: Uint8Array): ValidateLpkgResult {
  const issues: string[] = [];
  let manifest: PackageManifest | undefined;
  try {
    const container = openContainer(bytes);
    manifest = validateManifest(container.readJson('manifest.json'));

    const requireChunk = (chunkPath: string, label: string): void => {
      if (!container.has(chunkPath)) {
        issues.push(`${label} references missing chunk: ${chunkPath}`);
      }
    };

    requireChunk(manifest.chunks.scene, 'chunks.scene');
    if (container.has(manifest.chunks.scene)) {
      const scene = parseScene(container.readJson(manifest.chunks.scene));
      migratePackage(manifest, scene);
    }

    for (const [locale, chunkPath] of Object.entries(manifest.chunks.locales)) {
      requireChunk(chunkPath, `chunks.locales["${locale}"]`);
      if (container.has(chunkPath)) {
        const pack = container.readJson<{ strings?: unknown }>(chunkPath);
        if (typeof pack !== 'object' || pack === null || typeof pack.strings !== 'object') {
          issues.push(`locale pack "${locale}" has no strings record`);
        }
      }
    }
    for (const [locale, chunkPath] of Object.entries(manifest.chunks.patches ?? {})) {
      requireChunk(chunkPath, `chunks.patches["${locale}"]`);
    }
    for (const [assetId, asset] of Object.entries(manifest.assets)) {
      requireChunk(asset.path, `assets["${assetId}"]`);
    }
    for (const [fontId, font] of Object.entries(manifest.fonts ?? {})) {
      requireChunk(font.path, `fonts["${fontId}"]`);
    }

    for (const [chunkPath, expected] of Object.entries(manifest.integrity?.chunkHashes ?? {})) {
      if (!container.has(chunkPath)) {
        issues.push(`integrity.chunkHashes references missing chunk: ${chunkPath}`);
        continue;
      }
      const actual = createHash('sha256').update(container.readChunk(chunkPath)).digest('hex');
      if (actual !== expected) {
        issues.push(`chunk hash mismatch for ${chunkPath}: expected ${expected}, got ${actual}`);
      }
    }
  } catch (error) {
    if (error instanceof LpkgError) {
      issues.push(error.message);
      const details = error.info.code === 'INVALID_PACKAGE' ? error.info.details : undefined;
      if (Array.isArray(details)) {
        for (const detail of details as string[]) {
          issues.push(`  - ${detail}`);
        }
      }
    } else {
      issues.push(String(error));
    }
  }
  return { ok: issues.length === 0, manifest, issues };
}
