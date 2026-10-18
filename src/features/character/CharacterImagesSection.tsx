import { useCallback, useState, type DragEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton/IconButton';
import { mergeVisionTraits, type MergedVisionTrait } from '../../services/fal/mergeVisionTraits';
import {
  extractTraitsFromImageBlob,
  type VisionExtractedTrait,
} from '../../services/fal/visionTraitExtract';
import { loadImage } from '../../services/storage/imageStorage';
import type { CharacterTraitTag } from '../../types/character';
import type { SavedImageRef } from '../../types/savedImage';
import { formatFailure } from '../../utils/formatFailure';
import {
  dataTransferHasMatchDateLibrary,
  readMatchDateLibraryDragPayload,
  type MatchDateLibraryDragPayload,
} from '../../utils/matchdateLibraryDrag';
import {
  dataTransferHasCharacterImageReorder,
  readCharacterImageReorderDragId,
  reorderImagesBeforeTarget,
  setCharacterImageReorderDragData,
} from './characterImageReorder';
import { CharacterImagePreview } from './CharacterImagePreview';
import { CharacterTraitProposal } from './CharacterTraitProposal';
import styles from './CharacterImagesSection.module.css';

type ImageDescribeState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; traits: VisionExtractedTrait[] }
  | { status: 'error'; message: string };

export interface CharacterImagesSectionProps {
  images: SavedImageRef[];
  disabled?: boolean;
  onFilesDrop: (files: File[]) => void;
  onLibraryDrop: (items: MatchDateLibraryDragPayload[]) => void;
  onRemove: (imageId: string) => void;
  onReorder: (images: SavedImageRef[]) => void;
  onApplyTraits: (
    traits: Array<{ name: string; value: string; tags: CharacterTraitTag[] }>,
  ) => void;
}

function isExternalAcceptedDrop(dataTransfer: DataTransfer | null | undefined): boolean {
  if (!dataTransfer || dataTransferHasCharacterImageReorder(dataTransfer)) {
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
  onReorder,
  onApplyTraits,
}: CharacterImagesSectionProps) {
  const [dragActive, setDragActive] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [describing, setDescribing] = useState(false);
  const [descriptions, setDescriptions] = useState<Record<string, ImageDescribeState>>({});
  const [traitsVisible, setTraitsVisible] = useState(true);
  const [proposal, setProposal] = useState<MergedVisionTrait[] | null>(null);

  const clearReorderState = useCallback(() => {
    setDraggingId(null);
    setDropTargetId(null);
  }, []);

  const handleDragOver = useCallback(
    (event: DragEvent) => {
      if (disabled || describing) {
        return;
      }
      if (dataTransferHasCharacterImageReorder(event.dataTransfer)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        return;
      }
      if (!isExternalAcceptedDrop(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setDragActive(true);
    },
    [describing, disabled],
  );

  const handleDragLeave = useCallback((event: DragEvent) => {
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) {
      return;
    }
    setDragActive(false);
    setDropTargetId(null);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      if (disabled || describing) {
        return;
      }

      if (dataTransferHasCharacterImageReorder(event.dataTransfer)) {
        event.preventDefault();
        setDragActive(false);
        clearReorderState();
        return;
      }

      if (!isExternalAcceptedDrop(event.dataTransfer)) {
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
    [clearReorderState, describing, disabled, onFilesDrop, onLibraryDrop],
  );

  const handleTileDragStart = useCallback(
    (event: DragEvent, imageId: string) => {
      if (disabled || describing) {
        event.preventDefault();
        return;
      }
      setCharacterImageReorderDragData(event.dataTransfer, imageId);
      setDraggingId(imageId);
    },
    [describing, disabled],
  );

  const handleTileDragOver = useCallback(
    (event: DragEvent, imageId: string) => {
      if (
        disabled ||
        describing ||
        !dataTransferHasCharacterImageReorder(event.dataTransfer)
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'move';
      if (imageId !== draggingId) {
        setDropTargetId(imageId);
      }
    },
    [describing, disabled, draggingId],
  );

  const handleTileDrop = useCallback(
    (event: DragEvent, targetId: string) => {
      if (disabled || describing) {
        return;
      }
      const draggedId = readCharacterImageReorderDragId(event.dataTransfer);
      if (!draggedId) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);
      clearReorderState();
      const next = reorderImagesBeforeTarget(images, draggedId, targetId);
      if (next) {
        onReorder(next);
      }
    },
    [clearReorderState, describing, disabled, images, onReorder],
  );

  const handleTileDragEnd = useCallback(() => {
    clearReorderState();
  }, [clearReorderState]);

  const handleDescribe = useCallback(async () => {
    if (disabled || describing || images.length === 0) {
      return;
    }
    setDescribing(true);
    setProposal(null);
    setTraitsVisible(true);
    setDescriptions(
      Object.fromEntries(images.map((image) => [image.id, { status: 'loading' as const }])),
    );

    const extractions = await Promise.all(
      images.map(async (image) => {
        try {
          const blob = await loadImage(image.id);
          const extraction = await extractTraitsFromImageBlob(image.id, blob);
          setDescriptions((prev) => ({
            ...prev,
            [image.id]: {
              status: 'done',
              traits: extraction.traits,
            },
          }));
          return extraction;
        } catch (error) {
          setDescriptions((prev) => ({
            ...prev,
            [image.id]: {
              status: 'error',
              message: formatFailure('describe', image.fileName || image.id, error),
            },
          }));
          return null;
        }
      }),
    );

    const successful = extractions.filter((entry) => entry !== null);
    setProposal(mergeVisionTraits(successful));
    setDescribing(false);
  }, [describing, disabled, images]);

  const actionsDisabled = disabled || describing;
  const hasTraitButtons = Object.values(descriptions).some(
    (entry) => entry.status === 'done' && entry.traits.length > 0,
  );

  return (
    <div>
      <div
        className={[styles.dropZone, dragActive ? styles.dropZoneActive : '']
          .filter(Boolean)
          .join(' ')}
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
              const isDragging = draggingId === image.id;
              const isDropTarget = dropTargetId === image.id && draggingId !== image.id;
              const description = descriptions[image.id];
              return (
                <li
                  key={image.id}
                  className={[
                    styles.tile,
                    isDragging ? styles.tileDragging : '',
                    isDropTarget ? styles.tileDropTarget : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  draggable={!actionsDisabled}
                  onDragStart={(event) => handleTileDragStart(event, image.id)}
                  onDragOver={(event) => handleTileDragOver(event, image.id)}
                  onDrop={(event) => handleTileDrop(event, image.id)}
                  onDragEnd={handleTileDragEnd}
                  aria-grabbed={isDragging || undefined}
                >
                  <CharacterImagePreview image={image} name={label} />
                  <IconButton
                    icon="close"
                    label={`Remove ${label}`}
                    variant="secondary"
                    size="xs"
                    disabled={actionsDisabled}
                    className={styles.removeButton}
                    draggable={false}
                    onClick={() => onRemove(image.id)}
                    onDragStart={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  />
                  {description?.status === 'loading' ? (
                    <p className={styles.descriptionPending}>Describing…</p>
                  ) : null}
                  {description?.status === 'done' && traitsVisible ? (
                    description.traits.length === 0 ? (
                      <p className={styles.descriptionPending}>No traits extracted</p>
                    ) : (
                      <div className={styles.traitButtons} role="group" aria-label="Extracted traits">
                        {description.traits.map((trait) => (
                          <button
                            key={`${trait.name}:${trait.value}`}
                            type="button"
                            className={styles.traitButton}
                            disabled={actionsDisabled}
                            draggable={false}
                            title={`Add trait ${trait.name}: ${trait.value}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onApplyTraits([
                                {
                                  name: trait.name,
                                  value: trait.value,
                                  tags: trait.tags,
                                },
                              ]);
                            }}
                            onDragStart={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                          >
                            {trait.name}: {trait.value}
                          </button>
                        ))}
                      </div>
                    )
                  ) : null}
                  {description?.status === 'error' ? (
                    <p className={styles.descriptionError}>{description.message}</p>
                  ) : null}
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
      {images.length > 0 ? (
        <div className={styles.toolbar}>
          <IconButton
            icon="eye"
            label={traitsVisible ? 'Hide extracted traits' : 'Show extracted traits'}
            variant="secondary"
            size="sm"
            disabled={actionsDisabled || !hasTraitButtons}
            current={hasTraitButtons && traitsVisible}
            onClick={() => setTraitsVisible((visible) => !visible)}
          />
          <Button
            type="button"
            variant="tab"
            disabled={actionsDisabled}
            onClick={() => {
              void handleDescribe();
            }}
          >
            {describing ? 'DESCRIBING' : 'DESCRIBE'}
          </Button>
        </div>
      ) : null}
      {proposal ? (
        <CharacterTraitProposal
          traits={proposal}
          disabled={actionsDisabled}
          onAdd={(traits) => {
            onApplyTraits(traits);
            setProposal((prev) => {
              if (!prev) {
                return null;
              }
              const added = new Set(traits.map((trait) => trait.name.toLowerCase()));
              const remaining = prev.filter((trait) => !added.has(trait.name.toLowerCase()));
              return remaining.length === 0 ? null : remaining;
            });
          }}
          onCancel={() => setProposal(null)}
        />
      ) : null}
    </div>
  );
}
