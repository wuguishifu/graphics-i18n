import { strToU8 } from 'fflate';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { bytesToBase64 } from '../package/container.js';
import {
  contentToBytes as toBytes,
  packLpkgFromFiles as packFiles,
  type LpkgFileContent,
} from '../package/packContainer.js';

export type { LpkgFileContent };

export type PackOptions = {
  /**
   * Fill manifest.integrity.chunkHashes with sha256 of every chunk.
   * Requires a parseable manifest.json entry. Default true.
   */
  computeHashes?: boolean;
};

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

/**
 * Build an .lpkg (zip) from an in-memory map of chunk path -> content, with
 * sha256 chunk hashes. Node wrapper over the platform-neutral packer in
 * `@wuguishifu/core` (`packLpkgFromFiles` there takes an injectable hasher).
 */
export function packLpkgFromFiles(
  files: Record<string, LpkgFileContent>,
  options: PackOptions = {},
): Uint8Array {
  return packFiles(files, { hash: options.computeHashes !== false ? sha256 : undefined });
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
