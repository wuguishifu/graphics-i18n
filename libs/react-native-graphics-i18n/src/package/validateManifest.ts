import { invalidPackage } from '../types/errors.js';
import type { PackageManifest } from '../types/manifest.js';

export const SUPPORTED_SCHEMA_MAJOR = 1;

export function parseMajorVersion(version: string): number | undefined {
  const match = /^(\d+)\.\d+\.\d+$/.exec(version);
  return match ? Number(match[1]) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Structurally validate manifest.json (spec §3.4). Throws INVALID_PACKAGE
 * with the full list of issues in `details`.
 */
export function validateManifest(raw: unknown): PackageManifest {
  const issues: string[] = [];
  if (!isRecord(raw)) {
    throw invalidPackage('manifest.json must be an object');
  }
  const m = raw as Partial<PackageManifest> & Record<string, unknown>;

  if (typeof m.schemaVersion !== 'string') {
    issues.push('schemaVersion must be a string');
  } else {
    const major = parseMajorVersion(m.schemaVersion);
    if (major === undefined) {
      issues.push(`schemaVersion is not a valid semver string: ${m.schemaVersion}`);
    } else if (major > SUPPORTED_SCHEMA_MAJOR) {
      issues.push(
        `Unsupported schemaVersion ${m.schemaVersion}; this renderer supports major version ${SUPPORTED_SCHEMA_MAJOR}`,
      );
    }
  }
  if (typeof m.packageId !== 'string' || m.packageId.length === 0) {
    issues.push('packageId must be a non-empty string');
  }
  if (typeof m.packageVersion !== 'number') {
    issues.push('packageVersion must be a number');
  }

  if (!isRecord(m.canvas)) {
    issues.push('canvas must be an object');
  } else {
    if (typeof m.canvas.width !== 'number' || m.canvas.width <= 0) {
      issues.push('canvas.width must be a positive number');
    }
    if (typeof m.canvas.height !== 'number' || m.canvas.height <= 0) {
      issues.push('canvas.height must be a positive number');
    }
  }

  if (!isRecord(m.render)) {
    issues.push('render must be an object');
  } else if (typeof m.render.fallbackLocale !== 'string') {
    issues.push('render.fallbackLocale is required');
  }

  const chunks = m.chunks;
  if (!isRecord(chunks)) {
    issues.push('chunks must be an object');
  } else {
    if (typeof chunks.scene !== 'string') {
      issues.push('chunks.scene is required');
    }
    if (!isRecord(chunks.locales)) {
      issues.push('chunks.locales must be an object');
    } else {
      const paths = Object.values(chunks.locales);
      if (new Set(paths).size !== paths.length) {
        issues.push('chunks.locales paths must be unique');
      }
    }
  }

  if (!Array.isArray(m.locales)) {
    issues.push('locales must be an array');
  } else if (isRecord(chunks) && isRecord(chunks.locales)) {
    for (const entry of m.locales) {
      if (!isRecord(entry) || typeof entry.locale !== 'string') {
        issues.push('every locales[] entry must have a locale string');
        continue;
      }
      if (entry.strings && !(entry.locale in chunks.locales)) {
        issues.push(`locale "${entry.locale}" declares strings but has no chunks.locales entry`);
      }
      if (entry.patch && !(isRecord(chunks.patches) && entry.locale in chunks.patches)) {
        issues.push(`locale "${entry.locale}" declares a patch but has no chunks.patches entry`);
      }
    }
  }

  if (!isRecord(m.assets)) {
    issues.push('assets must be an object');
  } else {
    for (const [assetId, asset] of Object.entries(m.assets)) {
      if (!isRecord(asset) || typeof asset.path !== 'string' || typeof asset.type !== 'string') {
        issues.push(`asset "${assetId}" must have path and type`);
      }
    }
  }

  if (isRecord(m.render) && typeof m.render.fallbackLocale === 'string') {
    const fallback = m.render.fallbackLocale;
    if (isRecord(chunks) && isRecord(chunks.locales) && !(fallback in chunks.locales)) {
      issues.push(`fallbackLocale "${fallback}" has no locale pack in chunks.locales`);
    }
  }

  if (issues.length > 0) {
    throw invalidPackage(`Invalid manifest: ${issues[0]}`, issues);
  }
  return raw as PackageManifest;
}
