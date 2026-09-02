export type SavedTextKind = 'text/plain' | 'text/markdown';

export interface SavedTextMetadata {
  originalName: string;
  excerpt?: string;
  charCount?: number;
}

export interface SavedTextRef {
  id: string;
  fileName: string;
  path: string;
  createdAt: string;
  mimeType: SavedTextKind;
  metadata?: SavedTextMetadata;
}
