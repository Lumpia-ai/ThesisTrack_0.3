// Resolves the app's "@/..." path alias (tsconfig paths) and extension-less TypeScript imports for node --test.
// Loaded through tests/support/register.mjs.
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = new URL('../../src/', import.meta.url);

function resolveFile(url) {
  const path = fileURLToPath(url);

  if (/\.(m?[jt]sx?)$/.test(path) && existsSync(path)) {
    return url.href;
  }

  for (const suffix of ['.ts', '.tsx', '/index.ts']) {
    if (existsSync(path + suffix)) {
      return pathToFileURL(path + suffix).href;
    }
  }

  return null;
}

export async function resolve(specifier, context, nextResolve) {
  const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
  const url = specifier.startsWith('@/')
    ? new URL(specifier.slice(2), SRC)
    : isRelative && context.parentURL?.startsWith('file:')
      ? new URL(specifier, context.parentURL)
      : null;
  const resolved = url ? resolveFile(url) : null;

  return resolved ? { url: resolved, shortCircuit: true } : nextResolve(specifier, context);
}
