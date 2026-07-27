import {
  clearAllCaches,
  loadLocalizedGraphic,
  memorySourceReader,
  openContainer,
} from '@wuguishifu/core';
import { fixtureFiles, fixtureManifest, fixturePackage } from '@wuguishifu/core/testing';
import { packLpkgFromFiles } from '@wuguishifu/core/tools';
import { renderToStaticMarkup } from 'react-dom/server';
import { SvgGraphic } from './SvgGraphic.js';
import { buildSvgResources } from './svgResources.js';

const SOURCE = 'pkg://banner.lpkg';

async function renderLocale(locale: string, bytes = fixturePackage()) {
  const reader = memorySourceReader({ [SOURCE]: bytes });
  const result = await loadLocalizedGraphic(SOURCE, locale, undefined, { reader });
  const resources = buildSvgResources(result.container, result.manifest, result.effectiveScene);
  return {
    result,
    resources,
    markup: renderToStaticMarkup(
      <SvgGraphic scene={result.effectiveScene} resources={resources} width={600} />,
    ),
  };
}

beforeEach(() => {
  clearAllCaches();
});

describe('SvgGraphic', () => {
  it('renders localized text into scaled SVG markup', async () => {
    const { markup } = await renderLocale('fr');
    expect(markup).toContain('viewBox="0 0 1200 630"');
    expect(markup).toContain('width="600"');
    expect(markup).toContain('Soldes d’été');
    // badge text resolved from the @-prefixed key
    expect(markup).toContain('-50 %');
    // missing fr subtitle fell back to the en string
    expect(markup).toContain('Up to 50% off everything');
  });

  it('inlines visible assets as data URIs, honoring locale overrides', async () => {
    const { markup, resources } = await renderLocale('fr');
    // fr patch hides the logo but the background image is visible
    expect(resources.hrefs.has('bg')).toBe(true);
    expect(markup).toContain('data:image/png;base64,');
    // hidden logo is not inlined at all (lazy-load set is visible-only)
    expect(resources.hrefs.has('logo')).toBe(false);
    expect(resources.hrefs.has('logo-alt')).toBe(false);
  });

  it('mirrors alignment for RTL locales', async () => {
    const { markup } = await renderLocale('ar');
    expect(markup).toContain('text-anchor="end"');
    expect(markup).toContain('direction:rtl');
  });

  it('draws debug bounds when enabled', async () => {
    const reader = memorySourceReader({ [SOURCE]: fixturePackage() });
    const result = await loadLocalizedGraphic(SOURCE, 'en', undefined, { reader });
    const resources = buildSvgResources(result.container, result.manifest, result.effectiveScene);
    const markup = renderToStaticMarkup(
      <SvgGraphic scene={result.effectiveScene} resources={resources} debug />,
    );
    expect(markup).toContain('rgba(255,0,128,0.9)');
  });
});

describe('buildSvgResources', () => {
  it('emits @font-face rules for fonts used by visible text', async () => {
    const files = fixtureFiles();
    const manifest = fixtureManifest();
    manifest.chunks.fonts = { 'inter-regular': 'fonts/Inter-Regular.ttf' };
    manifest.fonts = {
      'inter-regular': { path: 'fonts/Inter-Regular.ttf', family: 'Inter', weight: 400 },
    };
    files['manifest.json'] = manifest;
    files['fonts/Inter-Regular.ttf'] = new Uint8Array([0, 1, 0, 0]);

    const container = openContainer(packLpkgFromFiles(files));
    const reader = memorySourceReader({ [SOURCE]: packLpkgFromFiles(files) });
    const result = await loadLocalizedGraphic(SOURCE, 'en', undefined, { reader });
    const resources = buildSvgResources(container, result.manifest, result.effectiveScene);
    expect(resources.fontCss).toContain('@font-face');
    expect(resources.fontCss).toContain('"Inter"');
    expect(resources.fontCss).toContain('font/ttf;base64,');
  });

  it('reports missing assets as diagnostics', async () => {
    const files = fixtureFiles();
    delete files['assets/bg.webp'];
    const reader = memorySourceReader({ [SOURCE]: packLpkgFromFiles(files, { computeHashes: false }) });
    const result = await loadLocalizedGraphic(SOURCE, 'en', undefined, { reader });
    const resources = buildSvgResources(result.container, result.manifest, result.effectiveScene);
    expect(resources.diagnostics.some((d) => d.code === 'ASSET_MISSING')).toBe(true);
  });
});
