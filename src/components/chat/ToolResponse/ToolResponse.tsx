import { useState } from 'react';
import { Icon } from '../../ui/Icon/Icon';
import { IconButton } from '../../ui/IconButton/IconButton';
import { CodeBlock } from '../../markdown/CodeBlock/CodeBlock';
import { LibraryCharacterThumb } from '../../library/LibraryList/LibraryCharacterThumb';
import {
  formatCharacterToolPatchSummary,
  toolActionVerb,
  toolDisplayName,
} from './toolResponseLabel';
import styles from './ToolResponse.module.css';

export interface ToolResponseProps {
  tool: string;
  action?: string;
  id?: string;
  name?: string;
  traitCount?: number;
  historyCount?: number;
  complete?: boolean;
  json: string;
}

export function ToolResponse({
  tool,
  action,
  id,
  name,
  traitCount = 0,
  historyCount = 0,
  complete = true,
  json,
}: ToolResponseProps) {
  const [expanded, setExpanded] = useState(false);
  const displayName = toolDisplayName(name, id);
  const status = toolActionVerb(action, complete);
  const summary = formatCharacterToolPatchSummary(traitCount, historyCount);
  const caretIcon = expanded ? 'caret-up' : 'caret-down';
  const characterId = id?.trim() || '';
  const showThumb = tool === 'character' && characterId.length > 0;

  return (
    <div
      className={[styles.root, complete ? '' : styles.streaming].filter(Boolean).join(' ')}
      role="status"
      aria-label={`${tool} ${status} ${displayName}`}
      aria-busy={complete ? undefined : true}
    >
      <div className={styles.row}>
        <div className={styles.thumbSlot} aria-hidden="true">
          {showThumb ? (
            <LibraryCharacterThumb characterId={characterId} name={displayName} />
          ) : (
            <span className={styles.placeholder} title={displayName}>
              <Icon name="character" className={styles.placeholderIcon} />
            </span>
          )}
        </div>
        <div className={styles.body}>
          <div className={styles.statusRow}>
            <Icon name="tool" className={styles.icon} />
            <span className={styles.status}>{status}</span>
            <IconButton
              icon={caretIcon}
              label={expanded ? 'Hide tool JSON' : 'Show tool JSON'}
              variant="secondary"
              size="xs"
              className={styles.caret}
              onClick={() => setExpanded((open) => !open)}
            />
          </div>
          <p className={styles.name}>{displayName}</p>
          <p className={styles.summary}>{summary}</p>
        </div>
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
