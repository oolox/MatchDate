export const OPFS_SCHEMA_VERSION = 2;

export type OpfsDocType = 'generator' | 'prompt' | 'asset' | 'workflow';

export type OpfsDocSubtype =
  | 'session'
  | 'systemPrompt'
  | 'negativePrompt'
  | 'refinerPrompt'
  | 'txt'
  | 'img'
  | 'vid'
  | 'image'
  | 'video'
  | 'text'
  | 'frame'
  | 'character';

export type OpfsAssetSubtype = 'image' | 'video' | 'frame' | 'text' | 'character';

export interface OpfsDocRefs {
  assets?: string[];
  prompts?: string[];
  workflows?: string[];
  chats?: string[];
}

export interface OpfsDocBase {
  schemaVersion?: number;
  type: OpfsDocType;
  subtype?: OpfsDocSubtype;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  refs?: OpfsDocRefs;
}

export interface AssetDocument extends OpfsDocBase {
  type: 'asset';
  subtype: OpfsAssetSubtype;
  blobPath: string;
  fileName: string;
  mimeType?: string;
  posterPath?: string;
  metadata?: Record<string, unknown>;
}
