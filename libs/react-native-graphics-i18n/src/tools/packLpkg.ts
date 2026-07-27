import { strToU8, zipSync } from 'fflate';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { bytesToBase64 } from '../package/container.js';

export type LpkgFileContent = Uint8Array | string | object;

export type PackOptions = {
  /**
   * Fill manifest.integrity.chunkHashes with sha256 of every chunk.
   * Requires a parseable manifest.json entry. Default true.
   */
  computeHashes?: boolean;
};

function toBytes(content: LpkgFileContent): Uint8Array {
  if (content instanceof Uint8Array) return content;
  if (typeof content === 'string') return strToU8(content);
  return strToU8(JSON.stringify(content));
}

/**
 * Build an .lpkg (zip) from an in-memory map of chunk path -> content.
 * Object values are serialized as JSON; strings as UTF-8 text.
 */
export function packLpkgFromFiles(
  files: Record<string, LpkgFileContent>,
  options: PackOptions = {},
): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const [filePath, content] of Object.entries(files)) {
    entries[filePath] = toBytes(content);
  }

  if (options.computeHashes !== false && entries['manifest.json']) {
    try {
      const manifest = JSON.parse(new TextDecoder().decode(entries['manifest.json'])) as {
        integrity?: { chunkHashes?: Record<string, string> };
      };
      const chunkHashes: Record<string, string> = {};
      for (const [filePath, bytes] of Object.entries(entries)) {
        if (filePath === 'manifest.json') continue;
        chunkHashes[filePath] = createHash('sha256').update(bytes).digest('hex');
      }
      manifest.integrity = { ...manifest.integrity, chunkHashes };
      entries['manifest.json'] = strToU8(JSON.stringify(manifest));
    } catch {
      // Leave the manifest untouched if it isn't JSON; validation will flag it.
    }
  }

  return zipSync(entries);
}

/** Recursively read a directory into a chunk-path -> bytes map. */
export async function readPackageDir(dir: string): Promise<Record<string, Uint8Array>> {
  const files: Record<string, Uint8Array> = {};
  const walk = async (current: string): Promise<void> => {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && !entry.name.startsWith('.')) {
        files[path.relative(dir, full).split(path.sep).join('/')] = new Uint8Array(
          await fs.readFile(full),
        );
      }
    }
  };
  await walk(dir);
  return files;
}

/** Build an .lpkg from a directory laid out per spec §3.2. */
export async function packLpkgDir(dir: string, options: PackOptions = {}): Promise<Uint8Array> {
  return packLpkgFromFiles(await readPackageDir(dir), options);
}

const TEXT_EXTENSIONS = new Set(['.json', '.svg', '.txt']);

/**
 * Build a `*.lpkg.json` debug bundle: JSON chunks inline, binary chunks as
 * base64 strings.
 */
export function buildJsonBundle(files: Record<string, LpkgFileContent>): string {
  const bundle: Record<string, unknown> = {};
  for (const [filePath, content] of Object.entries(files)) {
    const ext = path.extname(filePath).toLowerCase();
    if (typeof content === 'object' && !(content instanceof Uint8Array)) {
      bundle[filePath] = content;
    } else if (ext === '.json') {
      const text = typeof content === 'string' ? content : new TextDecoder().decode(content);
      bundle[filePath] = JSON.parse(text);
    } else if (typeof content === 'string' && TEXT_EXTENSIONS.has(ext)) {
      bundle[filePath] = bytesToBase64(strToU8(content));
    } else {
      bundle[filePath] = bytesToBase64(toBytes(content));
    }
  }
  return JSON.stringify(bundle, null, 2);
}
