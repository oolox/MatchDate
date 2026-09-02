import { Icon } from '../../ui/Icon/Icon';
import styles from './LibraryList.module.css';

export interface LibraryTextThumbProps {
  name: string;
}

export function LibraryTextThumb({ name }: LibraryTextThumbProps) {
  return (
    <div className={styles.thumbWrap} aria-hidden="true">
      <span className={styles.textThumbInner} title={name}>
        <Icon name="text-file" className={styles.textThumbIcon} />
      </span>
    </div>
  );
}
