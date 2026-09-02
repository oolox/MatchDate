import { Icon } from '../../ui/Icon/Icon';
import styles from './LibraryList.module.css';

export interface LibraryAssetThumbProps {
  name: string;
}

export function LibraryAssetThumb({ name }: LibraryAssetThumbProps) {
  return (
    <div className={styles.thumbWrap} aria-hidden="true">
      <span className={styles.textThumbInner} title={name}>
        <Icon name="image" className={styles.textThumbIcon} />
      </span>
    </div>
  );
}
