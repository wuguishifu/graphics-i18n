import { LpkgError } from '../types/errors.js';

export type GraphicSource = number | string | { uri: string };

/** Resolves a source reference to the raw bytes of an .lpkg file. */
export interface SourceReader {
  read(source: GraphicSource): Promise<Uint8Array>;
}

/** Stable cache key for a source reference. */
export function sourceKey(source: GraphicSource): string {
  if (typeof source === 'number') return `asset:${source}`;
  if (typeof source === 'string') return source;
  return source.uri;
}

/**
 * Default reader: fetches string/uri sources. Works in React Native, browsers
 * and Node 18+. Numeric (require'd) sources need the React Native reader,
 * which registers itself when the RN entry point is imported.
 */
export const fetchSourceReader: SourceReader = {
  async read(source) {
    if (typeof source === 'number') {
      throw new LpkgError({
        code: 'PACKAGE_NOT_FOUND',
        message:
          'Numeric (require) sources need the React Native source reader; ' +
          'import the LocalizedGraphic component entry point first.',
      });
    }
    const uri = typeof source === 'string' ? source : source.uri;
    let response: Response;
    try {
      response = await fetch(uri);
    } catch (cause) {
      throw new LpkgError({
        code: 'PACKAGE_NOT_FOUND',
        message: `Failed to fetch package: ${uri} (${String(cause)})`,
      });
    }
    if (!response.ok) {
      throw new LpkgError({
        code: 'PACKAGE_NOT_FOUND',
        message: `Failed to fetch package: ${uri} (HTTP ${response.status})`,
      });
    }
    return new Uint8Array(await response.arrayBuffer());
  },
};

/** In-memory reader keyed by sourceKey — used by tests and prefetch tooling. */
export function memorySourceReader(files: Record<string, Uint8Array>): SourceReader {
  return {
    read(source) {
      const key = sourceKey(source);
      const bytes = files[key];
      if (!bytes) {
        return Promise.reject(
          new LpkgError({
            code: 'PACKAGE_NOT_FOUND',
            message: `No in-memory package registered for source: ${key}`,
          }),
        );
      }
      return Promise.resolve(bytes);
    },
  };
}

let defaultReader: SourceReader = fetchSourceReader;

export function setDefaultSourceReader(reader: SourceReader): void {
  defaultReader = reader;
}

export function getDefaultSourceReader(): SourceReader {
  return defaultReader;
}
