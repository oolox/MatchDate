import { useState } from 'react';
import { Icon } from '../../ui/Icon/Icon';
import { IconButton } from '../../ui/IconButton/IconButton';
import { CodeBlock } from '../../markdown/CodeBlock/CodeBlock';
import { useOpenCharacterFromChat } from '../../../features/character/openCharacterFromChat';
import {
  formatCharacterToolPatchSummary,
  formatToolResponseLabel,
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
  const openCharacter = useOpenCharacterFromChat();
  const [expanded, setExpanded] = useState(false);
  const label = formatToolResponseLabel({ action, name, id, complete });
  const summary = formatCharacterToolPatchSummary(traitCount, historyCount);
  const line = summary ? `${label} ${summary}` : label;
  const caretIcon = expanded ? 'caret-up' : 'caret-down';
  const characterId = id?.trim() || '';
  const canOpen = tool === 'character' && characterId.length > 0;

  return (
    <div
      className={[styles.root, complete ? '' : styles.streaming].filter(Boolean).join(' ')}
      role="status"
      aria-label={line}
      aria-busy={complete ? undefined : true}
    >
      <div className={styles.row}>
        <Icon name="tool" className={styles.icon} />
        {canOpen ? (
          <button
            type="button"
            className={styles.lineButton}
            onClick={() => {
              void openCharacter(characterId);
            }}
          >
            <span className={styles.line}>{line}</span>
          </button>
        ) : (
          <span className={styles.line}>{line}</span>
        )}
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
