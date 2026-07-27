import { openContainer } from '../package/container.js';
import { fixtureFiles, fixturePackage } from '../testing/fixture.js';
import { packLpkgFromFiles } from './packLpkg.js';
import { validateLpkg } from './validateLpkg.js';

describe('validateLpkg', () => {
  it('passes a well-formed package, including chunk hashes', () => {
    const result = validateLpkg(fixturePackage());
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.manifest?.packageId).toBe('summer-promo-banner');
    expect(Object.keys(result.manifest?.integrity?.chunkHashes ?? {})).toContain('scene.json');
  });

  it('flags missing chunks referenced by the manifest', () => {
    const files = fixtureFiles();
    delete files['locales/fr.json'];
    delete files['assets/bg.webp'];
    const result = validateLpkg(packLpkgFromFiles(files, { computeHashes: false }));
    expect(result.ok).toBe(false);
    expect(result.issues.join('\n')).toContain('chunks.locales["fr"]');
    expect(result.issues.join('\n')).toContain('assets["bg"]');
  });

  it('flags hash mismatches', () => {
    const packed = fixturePackage();
    // Re-pack with a tampered scene but keep the original hashed manifest.
    const files = fixtureFiles();
    const originalManifest = JSON.parse(
      new TextDecoder().decode(openContainer(packed).readChunk('manifest.json')),
    ) as object;
    files['manifest.json'] = originalManifest;
    files['scene.json'] = { sceneVersion: '1.0.0', root: [] };
    const result = validateLpkg(packLpkgFromFiles(files, { computeHashes: false }));
    expect(result.ok).toBe(false);
    expect(result.issues.join('\n')).toContain('hash mismatch');
  });

  it('collects manifest validation issues instead of throwing', () => {
    const files = fixtureFiles();
    files['manifest.json'] = { schemaVersion: '1.0.0' };
    const result = validateLpkg(packLpkgFromFiles(files, { computeHashes: false }));
    expect(result.ok).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
