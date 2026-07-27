#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { packLpkgDir } from './packLpkg.js';
import { validateLpkg } from './validateLpkg.js';

const USAGE = `lpkg — localized graphic package tool

Usage:
  lpkg pack <dir> [-o <file.lpkg>]   Build an .lpkg from a package directory
  lpkg validate <file.lpkg>          Validate a built package
`;

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  if (command === 'pack') {
    const dir = rest.find((arg) => !arg.startsWith('-'));
    if (!dir) {
      process.stderr.write(USAGE);
      return 1;
    }
    const outFlag = rest.indexOf('-o');
    const out =
      outFlag >= 0 && rest[outFlag + 1]
        ? rest[outFlag + 1]
        : `${path.basename(path.resolve(dir))}.lpkg`;
    const bytes = await packLpkgDir(dir);
    await fs.writeFile(out, bytes);
    const result = validateLpkg(bytes);
    if (!result.ok) {
      process.stderr.write(`Packed ${out} with validation issues:\n`);
      for (const issue of result.issues) {
        process.stderr.write(`  ${issue}\n`);
      }
      return 1;
    }
    process.stdout.write(`Packed ${out} (${bytes.length} bytes)\n`);
    return 0;
  }

  if (command === 'validate') {
    const file = rest[0];
    if (!file) {
      process.stderr.write(USAGE);
      return 1;
    }
    const result = validateLpkg(new Uint8Array(await fs.readFile(file)));
    if (result.ok) {
      const { packageId, packageVersion, schemaVersion } = result.manifest ?? {};
      process.stdout.write(
        `OK: ${packageId}@${packageVersion} (schema ${schemaVersion})\n`,
      );
      return 0;
    }
    process.stderr.write(`Invalid package:\n`);
    for (const issue of result.issues) {
      process.stderr.write(`  ${issue}\n`);
    }
    return 1;
  }

  process.stderr.write(USAGE);
  return command === undefined || command === '--help' || command === '-h' ? 0 : 1;
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  },
);
