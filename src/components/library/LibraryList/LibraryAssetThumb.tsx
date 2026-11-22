import { useEffect, useState } from 'react';
import { loadImage } from '../../../services/storage/imageStorage';
import { loadAssetThumb, peekAssetThumb } from '../../../services/storage/imageThumbCache';
import { useAppSelector } from '../../../store/hooks';
import { selectLibraryEpoch } from '../../../store/slices/appShellSlice';
import { Icon } from '../../ui/Icon/Icon';
import styles from './LibraryList.module.css';

export interface LibraryAssetThumbProps {
  assetId: string;
  name: string;
}

export function LibraryAssetThumb({ assetId, name }: LibraryAssetThumbProps) {
  const libraryEpoch = useAppSelector(selectLibraryEpoch);
  const [objectUrl, setObjectUrl] = useState<string | null>(() => peekAssetThumb(assetId));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const cached = peekAssetThumb(assetId);
    if (cached) {
      setObjectUrl(cached);
      setFailed(false);
      return;
    }

    setObjectUrl(null);
    setFailed(false);
    let cancelled = false;
    void loadAssetThumb(assetId, (id) => loadImage(id)).then((url) => {
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
  }, [assetId, libraryEpoch]);

  return (
    <div className={styles.thumbWrap} aria-hidden="true">
      {objectUrl && !failed ? (
        <img className={styles.assetThumbImg} src={objectUrl} alt="" title={name} />
      ) : (
        <span className={styles.textThumbInner} title={name}>
          <Icon name="image" className={styles.textThumbIcon} />
        </span>
      )}
    </div>
  );
}
