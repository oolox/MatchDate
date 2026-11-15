import type { CharacterIdentity } from '../../types/character';

export type StoragePath = string;

export type StorageErrorCode =
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'QUOTA_EXCEEDED'
  | 'PERMISSION_DENIED'
  | 'INVALID_PATH'
  | 'PARSE_ERROR'
  | 'CONFLICT'
  | 'REMOTE_UNAVAILABLE'
  | 'UNKNOWN';

export class StorageError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode, message: string) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
  }
}

export interface FileEntry {
  path: StoragePath;
  kind: 'file' | 'directory';
  size?: number;
  updatedAt?: string;
}

export interface FileStorageService {
  read(path: StoragePath): Promise<string>;
  write(path: StoragePath, content: string): Promise<void>;
  readBinary(path: StoragePath): Promise<Blob>;
  writeBinary(path: StoragePath, content: Blob | ArrayBuffer | Uint8Array): Promise<void>;
  update(path: StoragePath, updater: (current: string) => string): Promise<void>;
  delete(path: StoragePath): Promise<boolean>;
  list(directory: StoragePath): Promise<FileEntry[]>;
  exists(path: StoragePath): Promise<boolean>;
}

export type LibraryItemKind = 'session' | 'asset' | 'character' | (string & {});

export type OpfsDocType = 'generator' | 'asset' | 'workflow' | 'character';

export type OpfsDocSubtype =
  | 'session'
  | 'image'
  | 'video'
  | 'text'
  | 'voice'
  | 'frame'
  | 'character';

export interface LibraryCatalogFields {
  name: string;
  createdAt: string;
  updatedAt: string;
  type?: OpfsDocType;
  subtype?: OpfsDocSubtype;
  /** Present for character catalog rows. */
  identity?: CharacterIdentity;
}

export interface LibraryKindRegistration {
  kind: LibraryItemKind;
  directory: string;
  pathForId: (id: string) => { fileName: string; path: StoragePath };
  listIdsFromDisk: (storage: FileStorageService) => Promise<string[]>;
  readCatalogFields: (
    storage: FileStorageService,
    id: string,
  ) => Promise<LibraryCatalogFields>;
}

export interface LibraryItemMeta {
  kind: LibraryItemKind;
  type?: OpfsDocType;
  subtype?: OpfsDocSubtype;
  id: string;
  name: string;
  fileName: string;
  path: string;
  isFavorite: boolean;
  favoritedAt?: string;
  createdAt: string;
  updatedAt: string;
  /** Present for character rows. */
  identity?: CharacterIdentity;
}

export interface LibraryIndex {
  items: LibraryItemMeta[];
  updatedAt: string;
}

export interface ConfigManifest {
  schemaVersion: number;
  activeSessionId: string | null;
  /** @deprecated Bundled prompts replaced OPFS presets; ignored when present. */
  activeSystemPresetSlug?: string;
  updatedAt: string;
}
