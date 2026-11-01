import { memo, useMemo } from 'react';
import { MarkdownContent } from '../../markdown/MarkdownContent/MarkdownContent';
import { QuoteBubble } from '../../chat/QuoteBubble/QuoteBubble';
import { ToolResponse } from '../../chat/ToolResponse/ToolResponse';
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
      {blocks.map((block, index) => {
        if (block.type === 'quote') {
          return (
            <QuoteBubble
              key={`quote-${index}-${block.id}`}
              quote={block.quote}
              speakerName={block.speakerName}
              speaker={block.speaker}
              complete={block.complete}
            />
          );
        }
        if (block.type === 'tool') {
          return (
            <ToolResponse
              key={`tool-${index}-${block.tool}-${block.action ?? ''}-${block.id ?? ''}-${block.name ?? ''}`}
              tool={block.tool}
              action={block.action}
              id={block.id}
              name={block.name}
              complete={block.complete}
              json={block.json}
            />
          );
        }
        return (
          <MarkdownContent
            key={`markdown-${index}`}
            content={block.content}
            deferHighlight={deferHighlight}
          />
        );
      })}
    </div>
  );
}

export const AssistantMessageContent = memo(AssistantMessageContentComponent);
