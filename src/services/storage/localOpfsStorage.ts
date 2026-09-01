import { normalizePath, StoragePathError } from './paths';
import { StorageError, type FileEntry, type FileStorageService, type StoragePath } from './types';

async function getRoot(): Promise<FileSystemDirectoryHandle> {
  if (!('storage' in navigator) || !navigator.storage.getDirectory) {
    throw new StorageError('UNKNOWN', 'OPFS is not available in this environment');
  }
  return navigator.storage.getDirectory();
}

async function getDirectoryHandle(
  root: FileSystemDirectoryHandle,
  segments: string[],
  create: boolean,
): Promise<FileSystemDirectoryHandle> {
  let current = root;
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment, { create });
  }
  return current;
}

async function getFileHandle(
  path: StoragePath,
  create: boolean,
): Promise<FileSystemFileHandle> {
  const segments = normalizePath(path);
  const fileName = segments.pop();
  if (!fileName) {
    throw new StorageError('INVALID_PATH', 'Path must include a file name');
  }

  const root = await getRoot();
  const directory = segments.length
    ? await getDirectoryHandle(root, segments, create)
    : root;

  return directory.getFileHandle(fileName, { create });
}

export const localOpfsStorage: FileStorageService = {
  async read(path) {
    try {
      const handle = await getFileHandle(path, false);
      const file = await handle.getFile();
      return file.text();
    } catch (error) {
      if (error instanceof StoragePathError) {
        throw new StorageError('INVALID_PATH', error.message);
      }
      throw new StorageError('NOT_FOUND', `File not found: ${path}`);
    }
  },

  async write(path, content) {
    try {
      const handle = await getFileHandle(path, true);
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      if (error instanceof StoragePathError) {
        throw new StorageError('INVALID_PATH', error.message);
      }
      throw new StorageError('UNKNOWN', 'Failed to write file');
    }
  },

  async readBinary(path) {
    try {
      const handle = await getFileHandle(path, false);
      const file = await handle.getFile();
      return file;
    } catch (error) {
      if (error instanceof StoragePathError) {
        throw new StorageError('INVALID_PATH', error.message);
      }
      throw new StorageError('NOT_FOUND', `File not found: ${path}`);
    }
  },

  async writeBinary(path, content) {
    try {
      const handle = await getFileHandle(path, true);
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      if (error instanceof StoragePathError) {
        throw new StorageError('INVALID_PATH', error.message);
      }
      throw new StorageError('UNKNOWN', 'Failed to write binary file');
    }
  },

  async update(path, updater) {
    const current = await this.read(path);
    await this.write(path, updater(current));
  },

  async delete(path) {
    try {
      const segments = normalizePath(path);
      const fileName = segments.pop();
      if (!fileName) {
        return false;
      }
      const root = await getRoot();
      const directory = segments.length
        ? await getDirectoryHandle(root, segments, false)
        : root;
      await directory.removeEntry(fileName);
      return true;
    } catch {
      return false;
    }
  },

  async exists(path) {
    try {
      await getFileHandle(path, false);
      return true;
    } catch {
      return false;
    }
  },

  async list(directory) {
    try {
      const segments = normalizePath(directory);
      const root = await getRoot();
      const dir = segments.length
        ? await getDirectoryHandle(root, segments, false)
        : root;

      const entries: FileEntry[] = [];
      // @ts-expect-error entries() exists in supported browsers
      for await (const [name, handle] of dir.entries()) {
        const path = `${directory}/${name}`.replace(/\/+/g, '/');
        if (handle.kind === 'file') {
          try {
            const file = await handle.getFile();
            entries.push({ path, kind: 'file', size: file.size });
          } catch {
            entries.push({ path, kind: 'file' });
          }
        } else {
          entries.push({ path, kind: 'directory' });
        }
      }
      return entries.sort((a, b) => a.path.localeCompare(b.path));
    } catch {
      return [];
    }
  },
};
