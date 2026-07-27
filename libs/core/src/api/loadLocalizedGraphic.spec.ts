import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAllCaches } from '../cache/caches.js';
import { memorySourceReader, type SourceReader } from '../package/sourceReader.js';
import { fixtureFiles, fixturePackage } from '../testing/fixture.js';
import { packLpkgFromFiles } from '../tools/packLpkg.js';
import { LpkgError } from '../types/errors.js';
import { loadLocalizedGraphic, validateLocalizedGraphicPackage } from './loadLocalizedGraphic.js';

const SOURCE = 'pkg://banner.lpkg';

function reader(bytes = fixturePackage()): SourceReader {
  return memorySourceReader({ [SOURCE]: bytes });
}

beforeEach(() => {
  clearAllCaches();
});

describe('loadLocalizedGraphic', () => {
  it('loads the requested locale end to end', async () => {
    const result = await loadLocalizedGraphic(SOURCE, 'fr', undefined, { reader: reader() });
    expect(result.localePack.locale).toBe('fr');
    const { effectiveScene } = result;
    expect(effectiveScene.meta).toMatchObject({
      locale: 'fr',
      usedFallbackLocale: false,
      patchApplied: true,
    });

    const title = effectiveScene.nodes.find((n) => n.id === 'title');
    expect(title?.draw.kind).toBe('text');
    if (title?.draw.kind === 'text') {
      expect(title.draw.layout.text).toBe('Soldes d’été');
      // patch recolored the title
      expect(title.draw.layout.style.color).toBe('#222222');
    }
    // fr locale pack widened the title box
    expect(title?.bounds.width).toBe(620);
    // patch hid the logo
    const logo = effectiveScene.nodes.find((n) => n.id === 'logo');
    expect(logo?.visible).toBe(false);
    // asset override still applied to the (hidden) node
    if (logo?.draw.kind === 'svg') {
      expect(logo.draw.assetId).toBe('logo-fr');
    }
    // z-order follows document order
    const zIndexes = effectiveScene.nodes.map((n) => n.zIndex);
    expect(zIndexes).toEqual([...zIndexes].sort((a, b) => a - b));
    // missing fr subtitle fell back to en with a diagnostic
    const subtitle = effectiveScene.nodes.find((n) => n.id === 'subtitle');
    if (subtitle?.draw.kind === 'text') {
      expect(subtitle.draw.layout.text).toBe('Up to 50% off everything');
    }
    expect(effectiveScene.meta.diagnostics.some((d) => d.code === 'STRING_MISSING')).toBe(true);
  });

  it('renders RTL locales with mirrored alignment', async () => {
    const result = await loadLocalizedGraphic(SOURCE, 'ar', undefined, { reader: reader() });
    const title = result.effectiveScene.nodes.find((n) => n.id === 'title');
    if (title?.draw.kind === 'text') {
      expect(title.draw.layout.direction).toBe('rtl');
      expect(title.draw.layout.style.align).toBe('right');
    } else {
      expect.unreachable('title should be a text node');
    }
  });

  it('falls back to the package fallback locale for unknown locales', async () => {
    const result = await loadLocalizedGraphic(SOURCE, 'ja', undefined, { reader: reader() });
    expect(result.effectiveScene.meta).toMatchObject({ locale: 'en', usedFallbackLocale: true });
  });

  it('reads the package only once across loads (package cache)', async () => {
    const spy: SourceReader = { read: vi.fn(reader().read) };
    await loadLocalizedGraphic(SOURCE, 'en', undefined, { reader: spy });
    await loadLocalizedGraphic(SOURCE, 'fr', undefined, { reader: spy });
    expect(spy.read).toHaveBeenCalledTimes(1);
  });

  it('caches the effective scene per locale', async () => {
    const first = await loadLocalizedGraphic(SOURCE, 'fr', undefined, { reader: reader() });
    const second = await loadLocalizedGraphic(SOURCE, 'fr', undefined, { reader: reader() });
    expect(second.effectiveScene).toBe(first.effectiveScene);
  });

  it('rejects packages with an unsupported schema major', async () => {
    const files = fixtureFiles();
    (files['manifest.json'] as { schemaVersion: string }).schemaVersion = '2.0.0';
    const bytes = packLpkgFromFiles(files);
    await expect(
      loadLocalizedGraphic(SOURCE, 'en', undefined, { reader: reader(bytes) }),
    ).rejects.toThrowError(LpkgError);
  });

  it('propagates PACKAGE_NOT_FOUND from the reader', async () => {
    await expect(
      loadLocalizedGraphic('pkg://other.lpkg', 'en', undefined, { reader: reader() }),
    ).rejects.toMatchObject({ code: 'PACKAGE_NOT_FOUND' });
  });
});

describe('validateLocalizedGraphicPackage', () => {
  it('returns the manifest for a valid package', async () => {
    const manifest = await validateLocalizedGraphicPackage(SOURCE, { reader: reader() });
    expect(manifest.packageId).toBe('summer-promo-banner');
  });

  it('rejects a package with a broken scene', async () => {
    const files = fixtureFiles();
    files['scene.json'] = { sceneVersion: '1.0.0', root: [{ type: 'rect' }] };
    await expect(
      validateLocalizedGraphicPackage(SOURCE, { reader: reader(packLpkgFromFiles(files)) }),
    ).rejects.toMatchObject({ code: 'SCENE_PARSE_FAILED' });
  });
});
