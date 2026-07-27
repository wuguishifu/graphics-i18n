import { LpkgError } from '../types/errors.js';
import type { PackageManifest } from '../types/manifest.js';

export type ResolvedLocale = {
  /** Locale whose pack will be loaded (canonical form from the manifest). */
  locale: string;
  /** Locale used for missing-string fallback. */
  fallbackLocale: string;
  requestedLocale: string;
  usedFallbackLocale: boolean;
};

function findAvailable(manifest: PackageManifest, wanted: string): string | undefined {
  const available = Object.keys(manifest.chunks.locales);
  const lower = wanted.toLowerCase();
  const exact = available.find((l) => l.toLowerCase() === lower);
  if (exact) return exact;
  // "pt-BR" -> "pt"
  const base = lower.split('-')[0];
  if (base !== lower) {
    const baseMatch = available.find((l) => l.toLowerCase() === base);
    if (baseMatch) return baseMatch;
  }
  // "pt" -> first "pt-*" variant, in manifest order
  return available.find((l) => l.toLowerCase().startsWith(`${base}-`));
}

/**
 * Locale negotiation (spec §4.2 stage 2): requested locale (exact, then
 * base-language match), then the runtime fallback override, then the
 * manifest fallback. Fails with LOCALE_MISSING when nothing matches.
 */
export function resolveLocale(
  manifest: PackageManifest,
  requested: string,
  runtimeFallback?: string,
): ResolvedLocale {
  const fallbackLocale =
    (runtimeFallback && findAvailable(manifest, runtimeFallback)) ??
    findAvailable(manifest, manifest.render.fallbackLocale) ??
    manifest.render.fallbackLocale;

  const match = findAvailable(manifest, requested);
  if (match) {
    return {
      locale: match,
      fallbackLocale,
      requestedLocale: requested,
      usedFallbackLocale: false,
    };
  }
  if (manifest.chunks.locales[fallbackLocale]) {
    return {
      locale: fallbackLocale,
      fallbackLocale,
      requestedLocale: requested,
      usedFallbackLocale: true,
    };
  }
  throw new LpkgError({
    code: 'LOCALE_MISSING',
    message: `Neither requested locale "${requested}" nor fallback "${fallbackLocale}" is available in the package`,
    locale: requested,
  });
}
