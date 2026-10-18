import fs from 'fs';
import path from 'path';

/**
 * File storage adapter. Default is local disk under ./storage. Swap this module
 * for an S3-compatible implementation (same interface) to use object storage;
 * the rest of the app only depends on read/write/exists.
 */
const ROOT = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(process.cwd(), 'storage');

function resolveSafe(key: string): string {
  // Prevent path traversal; keys are relative to ROOT.
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(ROOT + path.sep) && full !== ROOT) {
    throw new Error('Invalid storage key');
  }
  return full;
}

export const storage = {
  write(key: string, data: Buffer | string): void {
    const full = resolveSafe(key);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, data);
  },
  read(key: string): Buffer {
    return fs.readFileSync(resolveSafe(key));
  },
  exists(key: string): boolean {
    try {
      return fs.existsSync(resolveSafe(key));
    } catch {
      return false;
    }
  },
  size(key: string): number {
    try {
      return fs.statSync(resolveSafe(key)).size;
    } catch {
      return 0;
    }
  },
};

export const STORAGE_ROOT = ROOT;
