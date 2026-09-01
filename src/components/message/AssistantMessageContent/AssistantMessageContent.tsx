import { memo, useMemo } from 'react';
import { MarkdownContent } from '../../markdown/MarkdownContent/MarkdownContent';
import { splitAssistantContent } from '../../../utils/splitAssistantContent';
import styles from './AssistantMessageContent.module.css';

export interface AssistantMessageContentProps {
  content: string;
  deferHighlight?: boolean;
}

function AssistantMessageContentComponent({
  content,
  deferHighlight = false,
}: AssistantMessageContentProps) {
  const blocks = useMemo(
    () => splitAssistantContent(content, { isStreaming: deferHighlight }),
    [content, deferHighlight],
  );

  return (
    <div className={styles.blocks}>
      {blocks.map((block, index) => (
        <MarkdownContent
          key={`markdown-${index}`}
          content={block.content}
          deferHighlight={deferHighlight}
        />
      ))}
    </div>
  );
}

export const AssistantMessageContent = memo(AssistantMessageContentComponent);
