import { useEffect, useState } from 'react';
import { Icon } from '../../components/ui/Icon/Icon';
import { useObjectUrl } from '../../hooks/useObjectUrl';
import { loadImage } from '../../services/storage/imageStorage';
import type { SavedImageRef } from '../../types/savedImage';
import styles from './CharacterImagesSection.module.css';

const PREVIEW_HEIGHT_PX = 300;

export interface CharacterImagePreviewProps {
  image: SavedImageRef;
  name: string;
}

export function CharacterImagePreview({ image, name }: CharacterImagePreviewProps) {
  const { objectUrl, setFromBlob, clear } = useObjectUrl();
  const [failed, setFailed] = useState(false);

  const width = image.metadata?.width;
  const height = image.metadata?.height;
  const aspectWidth =
    typeof width === 'number' &&
    typeof height === 'number' &&
    width > 0 &&
    height > 0
      ? Math.round((PREVIEW_HEIGHT_PX * width) / height)
      : undefined;

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    clear();

    void (async () => {
      try {
        const blob = await loadImage(image.id);
        if (!cancelled) {
          setFromBlob(blob);
        }
      } catch (error) {
        console.info('Could not load character image preview', { id: image.id, error });
        if (!cancelled) {
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clear, image.id, setFromBlob]);

  return (
    <div
      className={styles.previewWrap}
      style={aspectWidth ? { width: aspectWidth } : undefined}
      aria-hidden="true"
    >
      {objectUrl && !failed ? (
        <img
          className={styles.previewImg}
          src={objectUrl}
          alt=""
          title={name}
          width={aspectWidth}
          height={PREVIEW_HEIGHT_PX}
        />
      ) : (
        <span className={styles.previewFallback} title={name}>
          <Icon name="image" className={styles.previewFallbackIcon} />
        </span>
      )}
    </div>
  );
}
