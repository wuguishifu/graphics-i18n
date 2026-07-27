import { Skia, type SkImage, type SkSVG } from '@shopify/react-native-skia';
import {
  LruCache,
  type GraphicError,
  type LpkgContainer,
  type PackageManifest,
} from '@graphics-i18n/core';
import { strFromU8 } from 'fflate';

export type LoadedAssets = {
  images: Map<string, SkImage>;
  svgs: Map<string, SkSVG>;
  diagnostics: GraphicError[];
};

const imageCache = new LruCache<string, SkImage>(64);
const svgCache = new LruCache<string, SkSVG>(32);

function assetCacheKey(
  packageKey: string,
  assetId: string,
  sha256?: string,
): string {
  return `${packageKey}#${assetId}${sha256 ? `:${sha256}` : ''}`;
}

/**
 * Decode the assets referenced by visible nodes (spec §4.2 stage 3 /
 * §4.5) — nothing is pre-decoded beyond this set. Decoded assets are cached
 * by asset id + hash.
 */
export function loadAssets(
  container: LpkgContainer,
  manifest: PackageManifest,
  packageKey: string,
  assetIds: string[],
): LoadedAssets {
  const images = new Map<string, SkImage>();
  const svgs = new Map<string, SkSVG>();
  const diagnostics: GraphicError[] = [];

  for (const assetId of assetIds) {
    const entry = manifest.assets[assetId];
    if (!entry) {
      diagnostics.push({
        code: 'ASSET_MISSING',
        message: `Asset "${assetId}" is not declared in the manifest`,
        assetId,
      });
      continue;
    }
    const key = assetCacheKey(packageKey, assetId, entry.sha256);
    try {
      if (entry.type === 'svg') {
        let svg = svgCache.get(key);
        if (!svg) {
          const made = Skia.SVG.MakeFromString(
            strFromU8(container.readChunk(entry.path)),
          );
          if (!made) throw new Error('SVG decode failed');
          svgCache.set(key, made);
          svg = made;
        }
        svgs.set(assetId, svg);
      } else {
        let image = imageCache.get(key);
        if (!image) {
          const made = Skia.Image.MakeImageFromEncoded(
            Skia.Data.fromBytes(container.readChunk(entry.path)),
          );
          if (!made) throw new Error('image decode failed');
          imageCache.set(key, made);
          image = made;
        }
        images.set(assetId, image);
      }
    } catch (cause) {
      diagnostics.push({
        code: 'ASSET_MISSING',
        message: `Failed to load asset "${assetId}" (${entry.path}): ${String(cause)}`,
        assetId,
      });
    }
  }

  return { images, svgs, diagnostics };
}
