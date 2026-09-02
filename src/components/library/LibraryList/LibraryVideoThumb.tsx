import { Icon } from '../../ui/Icon/Icon';
import styles from './LibraryList.module.css';

export interface LibraryVideoThumbProps {
  name: string;
}

export function LibraryVideoThumb({ name }: LibraryVideoThumbProps) {
  return (
    <div className={styles.thumbWrap} aria-hidden="true">
      <span className={styles.textThumbInner} title={name}>
        <Icon name="video" className={styles.textThumbIcon} />
      </span>
    </div>
  );
}
