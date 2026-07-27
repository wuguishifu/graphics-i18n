import { strFromU8 } from 'fflate';
import { fixtureFiles, fixtureManifest, fixturePackage } from '../testing/fixture.js';
import { buildJsonBundle } from '../tools/packLpkg.js';
import { LpkgError } from '../types/errors.js';
import { base64ToBytes, bytesToBase64, openContainer } from './container.js';

describe('openContainer', () => {
  it('round-trips a packed zip archive', () => {
    const container = openContainer(fixturePackage());
    expect(container.has('manifest.json')).toBe(true);
    expect(container.readJson<{ packageId: string }>('manifest.json').packageId).toBe(
      'summer-promo-banner',
    );
    expect([...container.readChunk('assets/bg.webp')]).toEqual([1, 2, 3, 4]);
    expect(strFromU8(container.readChunk('assets/logo.svg'))).toContain('<svg');
  });

  it('throws INVALID_PACKAGE for a missing chunk', () => {
    const container = openContainer(fixturePackage());
    expect(() => container.readChunk('nope.json')).toThrowError(LpkgError);
    try {
      container.readChunk('nope.json');
    } catch (error) {
      expect((error as LpkgError).code).toBe('INVALID_PACKAGE');
    }
  });

  it('opens .lpkg.json debug bundles', () => {
    const bundle = buildJsonBundle(fixtureFiles());
    const container = openContainer(new TextEncoder().encode(bundle));
    expect(container.readJson<{ packageId: string }>('manifest.json').packageId).toBe(
      fixtureManifest().packageId,
    );
    expect([...container.readChunk('assets/bg.webp')]).toEqual([1, 2, 3, 4]);
  });

  it('rejects garbage bytes', () => {
    expect(() => openContainer(new Uint8Array([0, 1, 2]))).toThrowError(LpkgError);
  });
});

describe('base64 helpers', () => {
  it('round-trips bytes', () => {
    for (const length of [0, 1, 2, 3, 4, 5, 255]) {
      const bytes = new Uint8Array(Array.from({ length }, (_, i) => (i * 37) % 256));
      expect([...base64ToBytes(bytesToBase64(bytes))]).toEqual([...bytes]);
    }
  });
});
