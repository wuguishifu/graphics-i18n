import { fixtureManifest } from '../testing/fixture.js';
import { LpkgError } from '../types/errors.js';
import { resolveLocale } from './resolveLocale.js';

describe('resolveLocale', () => {
  const manifest = fixtureManifest();

  it('matches exact locales', () => {
    const resolved = resolveLocale(manifest, 'fr');
    expect(resolved).toMatchObject({ locale: 'fr', usedFallbackLocale: false, fallbackLocale: 'en' });
  });

  it('matches case-insensitively', () => {
    expect(resolveLocale(manifest, 'FR').locale).toBe('fr');
  });

  it('falls back from a regional variant to the base language', () => {
    expect(resolveLocale(manifest, 'fr-CA').locale).toBe('fr');
  });

  it('matches a regional pack from a base-language request', () => {
    const regional = fixtureManifest();
    regional.chunks.locales = { 'pt-BR': 'locales/pt-BR.json', en: 'locales/en.json' };
    expect(resolveLocale(regional, 'pt').locale).toBe('pt-BR');
  });

  it('uses the manifest fallback for unknown locales', () => {
    const resolved = resolveLocale(manifest, 'ja');
    expect(resolved).toMatchObject({ locale: 'en', usedFallbackLocale: true, requestedLocale: 'ja' });
  });

  it('prefers the runtime fallback override', () => {
    const resolved = resolveLocale(manifest, 'ja', 'fr');
    expect(resolved).toMatchObject({ locale: 'fr', usedFallbackLocale: true, fallbackLocale: 'fr' });
  });

  it('fails with LOCALE_MISSING when nothing matches', () => {
    const broken = fixtureManifest();
    broken.chunks.locales = { fr: 'locales/fr.json' };
    broken.render.fallbackLocale = 'de';
    try {
      resolveLocale(broken, 'ja');
      expect.unreachable('expected LOCALE_MISSING');
    } catch (error) {
      expect((error as LpkgError).code).toBe('LOCALE_MISSING');
    }
  });
});
