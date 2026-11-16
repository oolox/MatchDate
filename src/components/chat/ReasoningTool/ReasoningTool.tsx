import { useLayoutEffect, useRef } from 'react';
import { Icon } from '../../ui/Icon/Icon';
import styles from './ReasoningTool.module.css';

export interface ReasoningToolProps {
  text: string;
}

/** Live reasoning tokens, shown in the same chrome as character tool rows. */
export function ReasoningTool({ text }: ReasoningToolProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    element.scrollTop = element.scrollHeight;
  }, [text]);

  return (
    <div className={styles.root} role="status" aria-busy="true" aria-label="Reasoning">
      <Icon name="tool" className={styles.icon} />
      <div ref={ref} className={styles.text}>
        {text}
      </div>
    </div>
  );
}
