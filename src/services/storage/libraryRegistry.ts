import type { AssetDocument } from '../../types/opfsDoc';
import { OPFS_SCHEMA_VERSION } from '../../types/opfsDoc';
import { isAssetSubtype } from './assetDocument';
import { ASSETS_METADATA_DIR, assetFileName, assetPath } from './paths';
import { parseStorageJson } from './parseStorageJson';
import type {
  FileStorageService,
  LibraryItemKind,
  LibraryKindRegistration,
} from './types';
import { StorageError } from './types';

const ASSET_FILE_PREFIX = 'matchDate-asset-';

function backfillCreatedAt(createdAt: string | undefined, updatedAt: string): string {
  return createdAt || updatedAt;
}

export function parseAsset(raw: string, path: string): AssetDocument {
  return parseStorageJson(
    raw,
    path,
    (parsed) => {
      const value = parsed as Partial<AssetDocument>;
      if (
        !value.id ||
        typeof value.name !== 'string' ||
        typeof value.blobPath !== 'string' ||
        typeof value.fileName !== 'string' ||
        !isAssetSubtype(value.subtype)
      ) {
        throw new StorageError('PARSE_ERROR', `Invalid asset file: ${path}`);
      }
      const updatedAt = value.updatedAt ?? value.createdAt ?? new Date(0).toISOString();
      return {
        schemaVersion:
          typeof value.schemaVersion === 'number' ? value.schemaVersion : OPFS_SCHEMA_VERSION,
        type: 'asset',
        subtype: value.subtype,
        id: value.id,
        name: value.name,
        blobPath: value.blobPath,
        fileName: value.fileName,
        mimeType: value.mimeType,
        ...(typeof value.posterPath === 'string' ? { posterPath: value.posterPath } : {}),
        metadata: value.metadata,
        createdAt: backfillCreatedAt(value.createdAt, updatedAt),
        updatedAt,
        refs: value.refs,
      };
    },
    'asset',
  );
}

async function listJsonIds(
  storage: FileStorageService,
  directory: string,
  options: {
    prefix: string;
    idFromFileName: (fileName: string) => string | null;
  },
): Promise<string[]> {
  const entries = await storage.list(directory);
  const ids: string[] = [];
  for (const entry of entries) {
    if (entry.kind !== 'file' || !entry.path.endsWith('.json')) {
      continue;
    }
    const fileName = entry.path.split('/').pop() ?? '';
    const id = options.idFromFileName(fileName);
    if (id) {
      ids.push(id);
    }
  }
  return ids;
}

const assetRegistration: LibraryKindRegistration = {
  kind: 'asset',
  directory: ASSETS_METADATA_DIR,
  pathForId: (id) => ({
    fileName: assetFileName(id),
    path: assetPath(id),
  }),
  listIdsFromDisk: (storage) =>
    listJsonIds(storage, ASSETS_METADATA_DIR, {
      prefix: ASSET_FILE_PREFIX,
      idFromFileName: (fileName) => {
        if (!fileName.startsWith(ASSET_FILE_PREFIX) || !fileName.endsWith('.json')) {
          return null;
        }
        return fileName.slice(ASSET_FILE_PREFIX.length, -'.json'.length) || null;
      },
    }),
  readCatalogFields: async (storage, id) => {
    const path = assetPath(id);
    const doc = parseAsset(await storage.read(path), path);
    return {
      name: doc.name,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      type: 'asset',
      subtype: doc.subtype,
    };
  },
};

const registrations: LibraryKindRegistration[] = [assetRegistration];

const registrationByKind = new Map(
  registrations.map((registration) => [registration.kind, registration]),
);

export function getLibraryKindRegistration(
  kind: LibraryItemKind,
): LibraryKindRegistration | undefined {
  return registrationByKind.get(kind);
}

export function getAssetRegistration(): LibraryKindRegistration {
  return assetRegistration;
}
