import { memo, useMemo } from 'react';
import { MarkdownContent } from '../../markdown/MarkdownContent/MarkdownContent';
import { DatePlanBubble } from '../../chat/DatePlanBubble/DatePlanBubble';
import { DateSummaryBubble } from '../../chat/DateSummaryBubble/DateSummaryBubble';
import { DateTranscriptBubble } from '../../chat/DateTranscriptBubble/DateTranscriptBubble';
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
              key={`quote-${index}`}
              quote={block.quote}
              speakerName={block.speakerName}
              speaker={block.speaker}
              complete={block.complete}
            />
          );
        }
        if (block.type === 'datePlan') {
          return (
            <DatePlanBubble
              key={`datePlan-${index}`}
              dateTime={block.dateTime}
              location={block.location}
              characterIds={block.characterIds}
              complete={block.complete}
            />
          );
        }
        if (block.type === 'dateSummary') {
          return (
            <DateSummaryBubble
              key={`dateSummary-${index}`}
              shortSummary={block.shortSummary}
              location={block.location}
              justification={block.justification}
              character={block.character}
              dateTime={block.dateTime}
              chatId={block.chatId}
              complete={block.complete}
              showMeta={false}
              collapsible
            />
          );
        }
        if (block.type === 'dateTranscript') {
          return (
            <DateTranscriptBubble
              key={`dateTranscript-${index}`}
              location={block.location}
              dateTime={block.dateTime}
              segments={block.segments}
              complete={block.complete}
              showMeta={false}
              collapsible
            />
          );
        }
        if (block.type === 'tool') {
          return (
            <ToolResponse
              key={`tool-${index}`}
              tool={block.tool}
              action={block.action}
              id={block.id}
              name={block.name}
              traitCount={block.traitCount}
              historyCount={block.historyCount}
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
