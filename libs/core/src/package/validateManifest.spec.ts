import { fixtureManifest } from '../testing/fixture.js';
import { LpkgError } from '../types/errors.js';
import { validateManifest } from './validateManifest.js';

function expectIssues(raw: unknown, match: string): void {
  try {
    validateManifest(raw);
    expect.unreachable('expected validation to fail');
  } catch (error) {
    expect(error).toBeInstanceOf(LpkgError);
    const details = (error as LpkgError).info as { details?: string[] };
    expect(details.details?.join('\n')).toContain(match);
  }
}

describe('validateManifest', () => {
  it('accepts the example manifest', () => {
    expect(validateManifest(fixtureManifest()).packageId).toBe('summer-promo-banner');
  });

  it('rejects a fallback locale without a locale pack', () => {
    const manifest = fixtureManifest();
    manifest.render.fallbackLocale = 'de';
    expectIssues(manifest, 'fallbackLocale "de" has no locale pack');
  });

  it('rejects unsupported major schema versions', () => {
    const manifest = fixtureManifest();
    manifest.schemaVersion = '2.0.0';
    expectIssues(manifest, 'Unsupported schemaVersion');
  });

  it('accepts newer minor versions of the supported major', () => {
    const manifest = fixtureManifest();
    manifest.schemaVersion = '1.7.2';
    expect(() => validateManifest(manifest)).not.toThrow();
  });

  it('rejects duplicate locale chunk paths', () => {
    const manifest = fixtureManifest();
    manifest.chunks.locales['fr'] = manifest.chunks.locales['en'];
    expectIssues(manifest, 'chunks.locales paths must be unique');
  });

  it('rejects declared strings without a chunk entry', () => {
    const manifest = fixtureManifest();
    manifest.locales.push({ locale: 'ja', strings: true });
    expectIssues(manifest, '"ja" declares strings');
  });

  it('rejects a declared patch without a chunk entry', () => {
    const manifest = fixtureManifest();
    manifest.locales.push({ locale: 'ar2', strings: false, patch: true });
    expectIssues(manifest, 'declares a patch');
  });

  it('rejects non-object input', () => {
    expect(() => validateManifest(null)).toThrowError(LpkgError);
    expect(() => validateManifest([])).toThrowError(LpkgError);
  });
});
