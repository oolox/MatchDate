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
