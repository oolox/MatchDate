import { Icon } from '../../ui/Icon/Icon';
import styles from './LibraryList.module.css';

export interface LibraryVoiceThumbProps {
  name: string;
}

export function LibraryVoiceThumb({ name }: LibraryVoiceThumbProps) {
  return (
    <div className={styles.thumbWrap} aria-hidden="true">
      <span className={styles.textThumbInner} title={name}>
        <Icon name="voice" className={styles.textThumbIcon} />
      </span>
    </div>
  );
}
