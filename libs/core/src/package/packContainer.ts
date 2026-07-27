import { strToU8, zipSync } from 'fflate';
import { invalidPackage } from '../types/errors.js';
import type { LpkgContainer } from './container.js';

export type LpkgFileContent = Uint8Array | string | object;

export function contentToBytes(content: LpkgFileContent): Uint8Array {
  if (content instanceof Uint8Array) return content;
  if (typeof content === 'string') return strToU8(content);
  return strToU8(JSON.stringify(content));
}

export type PackFilesOptions = {
  /**
   * Optional hasher (hex sha256). When provided and manifest.json is
   * parseable, integrity.chunkHashes is filled for every chunk. The Node
   * tools pass node:crypto here; browsers can omit hashing or supply one.
   */
  hash?: (bytes: Uint8Array) => string;
};

/**
 * Build an .lpkg (zip) from an in-memory map of chunk path -> content.
 * Object values are serialized as JSON; strings as UTF-8 text. Platform
 * neutral — works in browsers as well as Node.
 */
export function packLpkgFromFiles(
  files: Record<string, LpkgFileContent>,
  options: PackFilesOptions = {},
): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const [filePath, content] of Object.entries(files)) {
    entries[filePath] = contentToBytes(content);
  }

  if (options.hash && entries['manifest.json']) {
    try {
      const manifest = JSON.parse(new TextDecoder().decode(entries['manifest.json'])) as {
        integrity?: { chunkHashes?: Record<string, string> };
      };
      const chunkHashes: Record<string, string> = {};
      for (const [filePath, bytes] of Object.entries(entries)) {
        if (filePath === 'manifest.json') continue;
        chunkHashes[filePath] = options.hash(bytes);
      }
      manifest.integrity = { ...manifest.integrity, chunkHashes };
      entries['manifest.json'] = strToU8(JSON.stringify(manifest));
    } catch {
      // Leave the manifest untouched if it isn't JSON; validation will flag it.
    }
  }

  return zipSync(entries);
}

/** Read-only container over an in-memory file map (editors, tests). */
export function createMemoryContainer(files: Record<string, LpkgFileContent>): LpkgContainer {
  const jsonCache = new Map<string, unknown>();
  const bytes = (path: string): Uint8Array => {
    const content = files[path];
    if (content === undefined) {
      throw invalidPackage(`Chunk not found in package: ${path}`);
    }
    return contentToBytes(content);
  };
  return {
    has: (path) => path in files,
    paths: () => Object.keys(files),
    readChunk: bytes,
    readJson<T>(path: string): T {
      if (jsonCache.has(path)) return jsonCache.get(path) as T;
      const content = files[path];
      if (content === undefined) {
        throw invalidPackage(`Chunk not found in package: ${path}`);
      }
      let value: unknown;
      if (typeof content === 'object' && !(content instanceof Uint8Array)) {
        value = content;
      } else {
        try {
          value = JSON.parse(new TextDecoder().decode(bytes(path)));
        } catch (cause) {
          throw invalidPackage(`Chunk is not valid JSON: ${path}`, cause);
        }
      }
      jsonCache.set(path, value);
      return value as T;
    },
  };
}
