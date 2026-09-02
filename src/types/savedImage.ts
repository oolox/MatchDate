export interface SavedImageMetadata {
  visual?: string;
  originalName?: string;
}

export interface SavedImageRef {
  id: string;
  fileName: string;
  path: string;
  createdAt: string;
  metadata?: SavedImageMetadata;
}
