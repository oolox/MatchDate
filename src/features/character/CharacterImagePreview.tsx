import { useEffect, useState } from 'react';
import { Icon } from '../../components/ui/Icon/Icon';
import { loadImage } from '../../services/storage/imageStorage';
import { loadAssetThumb, peekAssetThumb } from '../../services/storage/imageThumbCache';
import type { SavedImageRef } from '../../types/savedImage';
import styles from './CharacterImagesSection.module.css';

const PREVIEW_HEIGHT_PX = 300;

export interface CharacterImagePreviewProps {
  image: SavedImageRef;
  name: string;
}

export function CharacterImagePreview({ image, name }: CharacterImagePreviewProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(() => peekAssetThumb(image.id));
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
    const cached = peekAssetThumb(image.id);
    if (cached) {
      setObjectUrl(cached);
      setFailed(false);
      return;
    }

    let cancelled = false;
    void loadAssetThumb(image.id, (id) => loadImage(id)).then((url) => {
      if (cancelled) {
        return;
      }
      if (url) {
        setObjectUrl(url);
        setFailed(false);
      } else {
        setFailed(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [image.id]);

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
