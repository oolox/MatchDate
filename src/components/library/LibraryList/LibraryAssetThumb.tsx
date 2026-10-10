import { useEffect, useState } from 'react';
import { useObjectUrl } from '../../../hooks/useObjectUrl';
import { loadImage } from '../../../services/storage/imageStorage';
import { Icon } from '../../ui/Icon/Icon';
import styles from './LibraryList.module.css';

export interface LibraryAssetThumbProps {
  assetId: string;
  name: string;
}

export function LibraryAssetThumb({ assetId, name }: LibraryAssetThumbProps) {
  const { objectUrl, setFromBlob, clear } = useObjectUrl();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    clear();

    void (async () => {
      try {
        const blob = await loadImage(assetId);
        if (!cancelled) {
          setFromBlob(blob);
        }
      } catch (error) {
        console.info('Could not load image thumb', { assetId, error });
        if (!cancelled) {
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetId, clear, setFromBlob]);

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
