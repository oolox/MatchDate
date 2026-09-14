import { useState } from 'react';
import { Icon } from '../../ui/Icon/Icon';
import { IconButton } from '../../ui/IconButton/IconButton';
import { CodeBlock } from '../../markdown/CodeBlock/CodeBlock';
import { formatToolResponseLabel } from './toolResponseLabel';
import styles from './ToolResponse.module.css';

export interface ToolResponseProps {
  tool: string;
  action?: string;
  id?: string;
  name?: string;
  complete?: boolean;
  json: string;
}

export function ToolResponse({
  tool,
  action,
  id,
  name,
  complete = true,
  json,
}: ToolResponseProps) {
  const [expanded, setExpanded] = useState(false);
  const label = formatToolResponseLabel({ action, name, id, complete });
  const caretIcon = expanded ? 'caret-up' : 'caret-down';

  return (
    <div
      className={`${styles.root} ${complete ? styles.complete : styles.streaming}`}
      role="status"
      aria-label={`${tool} ${label}`}
    >
      <div className={styles.header}>
        <Icon name="tool" className={styles.icon} />
        <span className={styles.label}>{label}</span>
        <IconButton
          icon={caretIcon}
          label={expanded ? 'Hide tool JSON' : 'Show tool JSON'}
          variant="secondary"
          size="xs"
          className={styles.caret}
          onClick={() => setExpanded((open) => !open)}
        />
      </div>
      {expanded ? (
        <div className={styles.json}>
          <CodeBlock className="language-json" deferHighlight={!complete}>
            {json}
          </CodeBlock>
        </div>
      ) : null}
    </div>
  );
}
