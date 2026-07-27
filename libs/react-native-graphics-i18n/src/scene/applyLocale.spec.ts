import { fixtureManifest, fixtureScene } from '../testing/fixture.js';
import type { GraphicError } from '../types/errors.js';
import type { LocalePack } from '../types/locale.js';
import type { SvgNode, TextNode } from '../types/scene.js';
import { applyLocale } from './applyLocale.js';

const enPack: LocalePack = {
  locale: 'en',
  strings: {
    'promo.title': 'Summer Sale',
    'promo.subtitle': 'Up to 50% off everything',
    'promo.discount': '-50%',
  },
};

const frPack: LocalePack = {
  locale: 'fr',
  strings: { 'promo.title': 'Soldes d’été', 'promo.discount': '-50 %' },
  nodeOverrides: { title: { box: { width: 620 } } },
  assetOverrides: { logo: 'logo-fr' },
};

describe('applyLocale', () => {
  it('resolves strings, badge keys and node overrides', () => {
    const diagnostics: GraphicError[] = [];
    const result = applyLocale(fixtureScene(), {
      manifest: fixtureManifest(),
      pack: frPack,
      fallbackPack: enPack,
      diagnostics,
    });
    expect(result.texts.get('title')).toBe('Soldes d’été');
    expect(result.texts.get('discount-badge')).toBe('-50 %');
    const title = result.scene.root.find((n) => n.id === 'title') as TextNode;
    expect(title.box.width).toBe(620);
  });

  it('falls back to the fallback pack and reports STRING_MISSING', () => {
    const diagnostics: GraphicError[] = [];
    const result = applyLocale(fixtureScene(), {
      manifest: fixtureManifest(),
      pack: frPack,
      fallbackPack: enPack,
      diagnostics,
    });
    expect(result.texts.get('subtitle')).toBe('Up to 50% off everything');
    const missing = diagnostics.filter((d) => d.code === 'STRING_MISSING');
    expect(missing).toHaveLength(1);
    expect(missing[0]).toMatchObject({ key: 'promo.subtitle', locale: 'fr' });
  });

  it('uses node fallbackText when both packs miss the key', () => {
    const empty: LocalePack = { locale: 'xx', strings: {} };
    const diagnostics: GraphicError[] = [];
    const result = applyLocale(fixtureScene(), {
      manifest: fixtureManifest(),
      pack: empty,
      fallbackPack: empty,
      diagnostics,
    });
    expect(result.texts.get('title')).toBe('Summer Sale');
    expect(result.texts.get('subtitle')).toBe('');
    expect(diagnostics.filter((d) => d.code === 'STRING_MISSING').length).toBeGreaterThan(0);
  });

  it('applies asset overrides', () => {
    const result = applyLocale(fixtureScene(), {
      manifest: fixtureManifest(),
      pack: frPack,
      fallbackPack: enPack,
    });
    const logo = result.scene.root.find((n) => n.id === 'logo') as SvgNode;
    expect(logo.assetId).toBe('logo-fr');
  });

  it('applies font overrides through the manifest font table', () => {
    const manifest = fixtureManifest();
    manifest.fonts = {
      'noto-jp': { path: 'fonts/NotoSansJP.ttf', family: 'Noto Sans JP', weight: 400 },
    };
    const pack: LocalePack = {
      locale: 'ja',
      strings: { 'promo.title': 'サマーセール' },
      fontOverrides: { Inter: 'noto-jp' },
    };
    const result = applyLocale(fixtureScene(), { manifest, pack, fallbackPack: enPack });
    const title = result.scene.root.find((n) => n.id === 'title') as TextNode;
    expect(title.style.fontFamily).toBe('Noto Sans JP');
  });

  it('reports FONT_MISSING for unknown font override ids', () => {
    const diagnostics: GraphicError[] = [];
    const pack: LocalePack = {
      locale: 'ja',
      strings: {},
      fontOverrides: { Inter: 'missing-font' },
    };
    applyLocale(fixtureScene(), {
      manifest: fixtureManifest(),
      pack,
      fallbackPack: enPack,
      diagnostics,
    });
    expect(diagnostics.some((d) => d.code === 'FONT_MISSING')).toBe(true);
  });

  it('resolves direction from the pack with locale heuristics', () => {
    const ar: LocalePack = { locale: 'ar', strings: {} };
    const result = applyLocale(fixtureScene(), {
      manifest: fixtureManifest(),
      pack: ar,
      fallbackPack: enPack,
    });
    expect(result.direction).toBe('rtl');
  });
});
