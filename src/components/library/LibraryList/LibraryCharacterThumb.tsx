import { useEffect, useState } from 'react';
import { useObjectUrl } from '../../../hooks/useObjectUrl';
import { loadImage } from '../../../services/storage/imageStorage';
import { loadCharacter } from '../../../services/storage/persistenceService';
import type { SavedImageRef } from '../../../types/savedImage';
import { Icon } from '../../ui/Icon/Icon';
import styles from './LibraryList.module.css';

const THUMB_HEIGHT_PX = 64;

export interface LibraryCharacterThumbProps {
  characterId: string;
  name: string;
}

function aspectWidthFor(image: SavedImageRef | null): number | undefined {
  const width = image?.metadata?.width;
  const height = image?.metadata?.height;
  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    width <= 0 ||
    height <= 0
  ) {
    return undefined;
  }
  return Math.round((THUMB_HEIGHT_PX * width) / height);
}

export function LibraryCharacterThumb({ characterId, name }: LibraryCharacterThumbProps) {
  const { objectUrl, setFromBlob, clear } = useObjectUrl();
  const [failed, setFailed] = useState(false);
  const [firstImage, setFirstImage] = useState<SavedImageRef | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setFirstImage(null);
    clear();

    void (async () => {
      try {
        const character = await loadCharacter(characterId);
        if (cancelled) {
          return;
        }
        const image = character.images?.[0] ?? null;
        setFirstImage(image);
        if (!image) {
          return;
        }
        const blob = await loadImage(image.id);
        if (!cancelled) {
          setFromBlob(blob);
        }
      } catch (error) {
        console.info('Could not load character library thumb', { characterId, error });
        if (!cancelled) {
          setFailed(true);
          setFirstImage(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [characterId, clear, setFromBlob]);

  const aspectWidth = aspectWidthFor(firstImage);
  const showImage = Boolean(objectUrl && firstImage && !failed);

  return (
    <div
      className={styles.characterThumbWrap}
      style={showImage && aspectWidth ? { width: aspectWidth } : undefined}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          className={styles.characterThumbImg}
          src={objectUrl!}
          alt=""
          title={name}
          width={aspectWidth}
          height={THUMB_HEIGHT_PX}
        />
      ) : (
        <span className={styles.characterThumbPlaceholder} title={name}>
          <Icon name="image" className={styles.characterThumbIcon} />
        </span>
      )}
    </div>
  );
}
