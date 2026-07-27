import { strToU8 } from 'fflate';
import { packLpkgFromFiles, type LpkgFileContent } from '../tools/packLpkg.js';
import type { PackageManifest } from '../types/manifest.js';
import type { Scene } from '../types/scene.js';

/** The spec §7 example package, extended with a badge and an RTL locale. */
export function fixtureManifest(): PackageManifest {
  return {
    schemaVersion: '1.0.0',
    packageId: 'summer-promo-banner',
    packageVersion: 12,
    canvas: { width: 1200, height: 630, background: '#ffffff' },
    render: {
      engine: 'skia',
      defaultLocale: 'en',
      fallbackLocale: 'en',
      textDirection: 'ltr',
    },
    chunks: {
      scene: 'scene.json',
      locales: {
        en: 'locales/en.json',
        fr: 'locales/fr.json',
        ar: 'locales/ar.json',
      },
      patches: { fr: 'patches/fr.json' },
      assets: { bg: 'assets/bg.webp', logo: 'assets/logo.svg' },
    },
    locales: [
      { locale: 'en', label: 'English', strings: true },
      { locale: 'fr', label: 'Français', strings: true, patch: true },
      { locale: 'ar', label: 'العربية', strings: true, direction: 'rtl' },
    ],
    assets: {
      bg: { path: 'assets/bg.webp', type: 'image' },
      logo: { path: 'assets/logo.svg', type: 'svg' },
      'logo-fr': { path: 'assets/logo-fr.svg', type: 'svg' },
    },
  };
}

export function fixtureScene(): Scene {
  return {
    sceneVersion: '1.0.0',
    root: [
      {
        id: 'background',
        type: 'image',
        assetId: 'bg',
        x: 0,
        y: 0,
        width: 1200,
        height: 630,
        fit: 'cover',
      },
      {
        id: 'logo',
        type: 'svg',
        assetId: 'logo',
        x: 1000,
        y: 40,
        width: 160,
        height: 80,
      },
      {
        id: 'title',
        type: 'text',
        bind: 'promo.title',
        fallbackText: 'Summer Sale',
        box: { x: 72, y: 72, width: 540, height: 140 },
        style: {
          fontFamily: 'Inter',
          fontSize: 64,
          fontWeight: 700,
          lineHeight: 1.05,
          color: '#111111',
          align: 'left',
          valign: 'top',
        },
        fit: { mode: 'shrink', minFontSize: 40, overflow: 'ellipsis' },
      },
      {
        id: 'subtitle',
        type: 'text',
        bind: 'promo.subtitle',
        box: { x: 72, y: 240, width: 540, height: 80 },
        style: { fontFamily: 'Inter', fontSize: 28, color: '#333333' },
      },
      {
        id: 'discount-badge',
        type: 'badge',
        text: '@promo.discount',
        box: { x: 72, y: 360, width: 200, height: 56 },
        style: { fontFamily: 'Inter', fontSize: 24, color: '#ffffff', align: 'center', valign: 'middle' },
        background: { fill: '#e11d48', radius: 12 },
      },
    ],
  };
}

export function fixtureFiles(): Record<string, LpkgFileContent> {
  return {
    'manifest.json': fixtureManifest(),
    'scene.json': fixtureScene(),
    'locales/en.json': {
      locale: 'en',
      strings: {
        'promo.title': 'Summer Sale',
        'promo.subtitle': 'Up to 50% off everything',
        'promo.discount': '-50%',
      },
    },
    'locales/fr.json': {
      locale: 'fr',
      direction: 'ltr',
      strings: {
        'promo.title': 'Soldes d’été',
        // promo.subtitle intentionally missing -> falls back to en
        'promo.discount': '-50 %',
      },
      nodeOverrides: {
        title: { box: { width: 620 }, fit: { minFontSize: 36 } },
      },
      assetOverrides: { logo: 'logo-fr' },
    },
    'locales/ar.json': {
      locale: 'ar',
      direction: 'rtl',
      strings: {
        'promo.title': 'تخفيضات الصيف',
        'promo.subtitle': 'خصم يصل إلى ٥٠٪',
        'promo.discount': '٪٥٠-',
      },
    },
    'patches/fr.json': {
      nodes: {
        logo: { visible: false },
        title: { style: { color: '#222222' } },
      },
    },
    'assets/bg.webp': new Uint8Array([1, 2, 3, 4]),
    'assets/logo.svg': strToU8('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    'assets/logo-fr.svg': strToU8('<svg xmlns="http://www.w3.org/2000/svg"/>'),
  };
}

export function fixturePackage(overrides?: Record<string, LpkgFileContent>): Uint8Array {
  return packLpkgFromFiles({ ...fixtureFiles(), ...overrides });
}
