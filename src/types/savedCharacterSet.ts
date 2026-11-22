/** Display metadata for a `characterSet` asset. The copy itself lives under `rootPath`. */
export interface CharacterSetAssetMetadata {
  /** Name typed in the save dialog. */
  fileName: string;
  /** OPFS directory holding the duplicated store. */
  rootPath: string;
}

export interface SavedCharacterSetRef {
  id: string;
  fileName: string;
  path: string;
  createdAt: string;
  metadata: CharacterSetAssetMetadata;
}
