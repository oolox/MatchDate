import { StorageError } from './types';

export function parseStorageJson<T>(
  raw: string,
  path: string,
  validate: (parsed: unknown) => T,
  kindLabel: string,
): T {
  try {
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed);
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError('PARSE_ERROR', `Invalid ${kindLabel} JSON: ${path}`);
  }
}
