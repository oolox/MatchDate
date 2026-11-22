import { Icon } from '../../ui/Icon/Icon';
import styles from './LibraryList.module.css';

export interface LibraryCharacterSetThumbProps {
  name: string;
}

export function LibraryCharacterSetThumb({ name }: LibraryCharacterSetThumbProps) {
  return (
    <div className={styles.thumbWrap} aria-hidden="true">
      <span className={styles.textThumbInner} title={name}>
        <Icon name="character" className={styles.textThumbIcon} />
      </span>
    </div>
  );
}
