import { normalizePath } from './paths';
import { StorageError, type FileEntry, type FileStorageService, type StoragePath } from './types';

type StoredValue = { kind: 'text'; content: string } | { kind: 'binary'; content: Blob };

function fileKey(path: StoragePath): string {
  return normalizePath(path).join('/');
}

function directoryKey(path: StoragePath): string {
  const parts = normalizePath(path);
  return parts.join('/');
}

function listPrefix(dirPath: StoragePath): string {
  const key = directoryKey(dirPath);
  return key ? `${key}/` : '';
}

function toBlob(content: Blob | ArrayBuffer | Uint8Array): Blob {
  if (content instanceof Blob) {
    return content;
  }
  return new Blob([content]);
}

export function createInMemoryFileStorage(): FileStorageService {
  const files = new Map<string, StoredValue>();

  return {
    async read(path) {
      const key = fileKey(path);
      const stored = files.get(key);
      if (stored === undefined) {
        throw new StorageError('NOT_FOUND', `File not found: ${path}`);
      }
      if (stored.kind === 'text') {
        return stored.content;
      }
      return stored.content.text();
    },

    async write(path, content) {
      files.set(fileKey(path), { kind: 'text', content });
    },

    async readBinary(path) {
      const key = fileKey(path);
      const stored = files.get(key);
      if (stored === undefined) {
        throw new StorageError('NOT_FOUND', `File not found: ${path}`);
      }
      if (stored.kind === 'binary') {
        return stored.content;
      }
      return new Blob([stored.content], { type: 'text/plain' });
    },

    async writeBinary(path, content) {
      files.set(fileKey(path), { kind: 'binary', content: toBlob(content) });
    },

    async update(path, updater) {
      const current = await this.read(path);
      await this.write(path, updater(current));
    },

    async delete(path) {
      return files.delete(fileKey(path));
    },

    async exists(path) {
      return files.has(fileKey(path));
    },

    async list(directory) {
      const prefix = listPrefix(directory);
      const entries = new Map<string, FileEntry>();

      for (const key of files.keys()) {
        if (prefix && !key.startsWith(prefix)) {
          continue;
        }
        if (!prefix && key.includes('/')) {
          const top = key.split('/')[0];
          entries.set(`/${top}`, { path: `/${top}`, kind: 'directory' });
          continue;
        }

        const remainder = prefix ? key.slice(prefix.length) : key;
        if (!remainder) {
          continue;
        }

        const slash = remainder.indexOf('/');
        if (slash !== -1) {
          const childName = remainder.slice(0, slash);
          const childPath = `/${prefix}${childName}`.replace(/\/+/g, '/');
          entries.set(childPath, { path: childPath, kind: 'directory' });
          continue;
        }

        const stored = files.get(key);
        const size =
          stored?.kind === 'text'
            ? stored.content.length
            : stored?.kind === 'binary'
              ? stored.content.size
              : undefined;

        const filePath = `/${key}`;
        entries.set(filePath, {
          path: filePath,
          kind: 'file',
          size,
        });
      }

      return [...entries.values()].sort((a, b) => a.path.localeCompare(b.path));
    },
  };
}

export const inMemoryFileStorage = createInMemoryFileStorage();
