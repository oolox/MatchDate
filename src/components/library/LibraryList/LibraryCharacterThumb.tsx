import { useEffect, useState } from 'react';
import { loadImage } from '../../../services/storage/imageStorage';
import {
  loadCharacterThumb,
  peekCharacterThumb,
} from '../../../services/storage/imageThumbCache';
import { loadCharacter } from '../../../services/storage/persistenceService';
import { useAppSelector } from '../../../store/hooks';
import { selectLibraryEpoch } from '../../../store/slices/appShellSlice';
import { Icon } from '../../ui/Icon/Icon';
import styles from './LibraryList.module.css';

const THUMB_HEIGHT_PX = 64;

export interface LibraryCharacterThumbProps {
  characterId: string;
  name: string;
}

function aspectWidthFor(image: { width?: number; height?: number } | null): number | undefined {
  const width = image?.width;
  const height = image?.height;
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
  const libraryEpoch = useAppSelector(selectLibraryEpoch);
  const [thumb, setThumb] = useState(() => peekCharacterThumb(characterId));

  useEffect(() => {
    const cached = peekCharacterThumb(characterId);
    if (cached && cached.epoch === libraryEpoch) {
      setThumb(cached);
      return;
    }
    if (!cached) {
      setThumb(null);
    }

    let cancelled = false;
    void loadCharacterThumb(
      characterId,
      libraryEpoch,
      () => loadCharacter(characterId),
      (imageId) => loadImage(imageId),
    ).then((next) => {
      if (!cancelled && next) {
        setThumb(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [characterId, libraryEpoch]);

  const aspectWidth = aspectWidthFor(
    thumb?.url ? { width: thumb.width, height: thumb.height } : null,
  );
  const showImage = Boolean(thumb?.url);

  return (
    <div
      className={styles.characterThumbWrap}
      style={showImage && aspectWidth ? { width: aspectWidth } : undefined}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          className={styles.characterThumbImg}
          src={thumb!.url!}
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
