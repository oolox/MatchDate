import { useCallback, useState, type DragEvent } from 'react';
import { IconButton } from '../../components/ui/IconButton/IconButton';
import type { SavedImageRef } from '../../types/savedImage';
import {
  dataTransferHasMatchDateLibrary,
  readMatchDateLibraryDragPayload,
  type MatchDateLibraryDragPayload,
} from '../../utils/matchdateLibraryDrag';
import { CharacterImagePreview } from './CharacterImagePreview';
import styles from './CharacterImagesSection.module.css';

export interface CharacterImagesSectionProps {
  images: SavedImageRef[];
  disabled?: boolean;
  onFilesDrop: (files: File[]) => void;
  onLibraryDrop: (items: MatchDateLibraryDragPayload[]) => void;
  onRemove: (imageId: string) => void;
}

function isAcceptedDrop(dataTransfer: DataTransfer | null | undefined): boolean {
  if (!dataTransfer) {
    return false;
  }
  return (
    dataTransferHasMatchDateLibrary(dataTransfer) ||
    Array.from(dataTransfer.types).includes('Files')
  );
}

export function CharacterImagesSection({
  images,
  disabled = false,
  onFilesDrop,
  onLibraryDrop,
  onRemove,
}: CharacterImagesSectionProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDragOver = useCallback(
    (event: DragEvent) => {
      if (disabled || !isAcceptedDrop(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setDragActive(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      if (disabled || !isAcceptedDrop(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      setDragActive(false);

      const libraryItem = readMatchDateLibraryDragPayload(event.dataTransfer);
      if (libraryItem) {
        onLibraryDrop([libraryItem]);
        return;
      }

      const files = Array.from(event.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/'),
      );
      if (files.length > 0) {
        onFilesDrop(files);
      }
    },
    [disabled, onFilesDrop, onLibraryDrop],
  );

  return (
    <div
      className={[styles.dropZone, dragActive ? styles.dropZoneActive : ''].filter(Boolean).join(' ')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label={dragActive ? 'Drop images here' : 'Character images'}
    >
      {images.length === 0 ? (
        <p className={styles.empty}>Drop image files or library IMAGE assets here.</p>
      ) : (
        <ul className={styles.grid}>
          {images.map((image) => {
            const label =
              image.metadata?.originalName?.trim() ||
              image.metadata?.visual?.trim() ||
              image.fileName ||
              image.id;
            return (
              <li key={image.id} className={styles.tile}>
                <CharacterImagePreview image={image} name={label} />
                <IconButton
                  icon="close"
                  label={`Remove ${label}`}
                  variant="secondary"
                  size="xs"
                  disabled={disabled}
                  className={styles.removeButton}
                  onClick={() => onRemove(image.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
      {dragActive ? (
        <div className={styles.mask} aria-hidden="true">
          <p className={styles.maskLabel}>Drop images here</p>
        </div>
      ) : null}
    </div>
  );
}
