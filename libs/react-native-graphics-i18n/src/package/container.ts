import { strFromU8, strToU8, unzipSync } from 'fflate';
import { invalidPackage } from '../types/errors.js';

/**
 * Read-only view over the files inside an .lpkg container.
 * Entries are kept as raw bytes; JSON chunks are decoded lazily on first
 * access so rendering one locale never parses the others.
 */
export interface LpkgContainer {
  has(path: string): boolean;
  paths(): string[];
  /** Raw bytes of a chunk. Throws INVALID_PACKAGE if the path is missing. */
  readChunk(path: string): Uint8Array;
  /** Parse a JSON chunk (cached). Throws INVALID_PACKAGE on missing/bad JSON. */
  readJson<T>(path: string): T;
}

class ZipContainer implements LpkgContainer {
  private readonly jsonCache = new Map<string, unknown>();

  constructor(private readonly entries: Record<string, Uint8Array>) {}

  has(path: string): boolean {
    return path in this.entries;
  }

  paths(): string[] {
    return Object.keys(this.entries);
  }

  readChunk(path: string): Uint8Array {
    const entry = this.entries[path];
    if (!entry) {
      throw invalidPackage(`Chunk not found in package: ${path}`);
    }
    return entry;
  }

  readJson<T>(path: string): T {
    if (this.jsonCache.has(path)) {
      return this.jsonCache.get(path) as T;
    }
    const bytes = this.readChunk(path);
    let value: unknown;
    try {
      value = JSON.parse(strFromU8(bytes));
    } catch (cause) {
      throw invalidPackage(`Chunk is not valid JSON: ${path}`, cause);
    }
    this.jsonCache.set(path, value);
    return value as T;
  }
}

/**
 * Debug bundle format (`*.lpkg.json`): a flat map of chunk path -> content.
 * Object/array values are inline JSON chunks; string values are base64 bytes.
 */
type JsonBundle = Record<string, unknown>;

class JsonContainer implements LpkgContainer {
  constructor(private readonly bundle: JsonBundle) {}

  has(path: string): boolean {
    return path in this.bundle;
  }

  paths(): string[] {
    return Object.keys(this.bundle);
  }

  readChunk(path: string): Uint8Array {
    const value = this.bundle[path];
    if (value === undefined) {
      throw invalidPackage(`Chunk not found in package: ${path}`);
    }
    if (typeof value === 'string') {
      return base64ToBytes(value);
    }
    return strToU8(JSON.stringify(value));
  }

  readJson<T>(path: string): T {
    const value = this.bundle[path];
    if (value === undefined) {
      throw invalidPackage(`Chunk not found in package: ${path}`);
    }
    if (typeof value === 'string') {
      try {
        return JSON.parse(strFromU8(base64ToBytes(value))) as T;
      } catch (cause) {
        throw invalidPackage(`Chunk is not valid JSON: ${path}`, cause);
      }
    }
    return value as T;
  }
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Hermes has no atob/Buffer; keep a tiny dependency-free decoder.
export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[\s=]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let index = 0;
  for (const char of clean) {
    const value = BASE64_CHARS.indexOf(char);
    if (value < 0) {
      throw invalidPackage('Invalid base64 data in package');
    }
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[index++] = (buffer >> bits) & 0xff;
    }
  }
  return out.subarray(0, index);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += BASE64_CHARS[b0 >> 2];
    out += BASE64_CHARS[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? '=' : BASE64_CHARS[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? '=' : BASE64_CHARS[b2 & 63];
  }
  return out;
}

/**
 * Open a package from raw bytes. Detects the container flavor:
 * zip archives start with "PK"; anything else must be a JSON debug bundle.
 */
export function openContainer(bytes: Uint8Array): LpkgContainer {
  if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    let entries: Record<string, Uint8Array>;
    try {
      entries = unzipSync(bytes);
    } catch (cause) {
      throw invalidPackage('Failed to read .lpkg archive', cause);
    }
    return new ZipContainer(entries);
  }
  let bundle: unknown;
  try {
    bundle = JSON.parse(strFromU8(bytes));
  } catch (cause) {
    throw invalidPackage('Source is neither a zip archive nor a JSON bundle', cause);
  }
  if (typeof bundle !== 'object' || bundle === null || Array.isArray(bundle)) {
    throw invalidPackage('JSON bundle must be an object mapping chunk paths to contents');
  }
  return new JsonContainer(bundle as JsonBundle);
}
