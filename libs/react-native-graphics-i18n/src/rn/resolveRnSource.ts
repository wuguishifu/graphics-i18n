import { LpkgError, fetchSourceReader, setDefaultSourceReader, type SourceReader } from '@wuguishifu/core';
import { Image } from 'react-native';

/**
 * React Native source reader: numeric `require('./banner.lpkg')` references
 * resolve through the asset registry (add "lpkg" to Metro's assetExts), then
 * everything is fetched as bytes.
 */
export const rnSourceReader: SourceReader = {
  read(source) {
    if (typeof source === 'number') {
      const resolved = Image.resolveAssetSource(source);
      if (!resolved?.uri) {
        return Promise.reject(
          new LpkgError({
            code: 'PACKAGE_NOT_FOUND',
            message: `Could not resolve bundled asset for source ${source}`,
          }),
        );
      }
      return fetchSourceReader.read(resolved.uri);
    }
    return fetchSourceReader.read(source);
  },
};

let installed = false;

/** Make the RN reader the process-wide default (idempotent). */
export function installRnSourceReader(): void {
  if (!installed) {
    installed = true;
    setDefaultSourceReader(rnSourceReader);
  }
}
