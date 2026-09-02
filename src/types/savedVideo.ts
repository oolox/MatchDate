export interface SavedVideoMetadata {
  prompt?: string;
  originalName?: string;
}

export interface SavedVideoRef {
  id: string;
  fileName: string;
  path: string;
  createdAt: string;
  posterPath?: string;
  metadata?: SavedVideoMetadata;
}
