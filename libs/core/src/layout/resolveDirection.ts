import type { LocalePack } from '../types/locale.js';
import type { PackageManifest } from '../types/manifest.js';

const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi', 'dv', 'ku']);

export function isRtlLocale(locale: string): boolean {
  return RTL_LANGUAGES.has(locale.toLowerCase().split('-')[0]);
}

/**
 * Direction precedence: locale pack > manifest render hint > locale
 * heuristic. Used to flip text alignment defaults for RTL (spec §4.4).
 */
export function resolveDirection(
  pack: Pick<LocalePack, 'locale' | 'direction'>,
  manifest: Pick<PackageManifest, 'render'>,
): 'ltr' | 'rtl' {
  if (pack.direction) return pack.direction;
  if (isRtlLocale(pack.locale)) return 'rtl';
  return manifest.render.textDirection ?? 'ltr';
}

/** Mirror horizontal alignment for RTL-aware text nodes. */
export function resolveAlign(
  align: 'left' | 'center' | 'right' | undefined,
  direction: 'ltr' | 'rtl',
  rtlAware: boolean,
): 'left' | 'center' | 'right' {
  if (!rtlAware || direction === 'ltr') return align ?? 'left';
  // An omitted align means "leading edge", which is already the right side in
  // RTL — mirroring only applies to an explicitly authored side.
  if (align === undefined) return 'right';
  if (align === 'left') return 'right';
  if (align === 'right') return 'left';
  return align;
}
