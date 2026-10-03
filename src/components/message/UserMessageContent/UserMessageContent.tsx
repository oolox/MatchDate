import { Link } from 'react-router-dom';
import { parseMentionSegments } from '../../../features/chat/attach/mentionToken';
import styles from './UserMessageContent.module.css';

export interface UserMessageContentProps {
  content: string;
}

export function UserMessageContent({ content }: UserMessageContentProps) {
  const segments = parseMentionSegments(content);

  return (
    <p className={styles.text}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <span key={index}>{segment.text}</span>;
        }
        const label = `@${segment.label}`;
        if (segment.kind === 'character') {
          return (
            <Link
              key={index}
              to={`/character/${segment.id}`}
              className={styles.mention}
              title={label}
            >
              {label}
            </Link>
          );
        }
        return (
          <span key={index} className={styles.mentionPlain} title={label}>
            {label}
          </span>
        );
      })}
    </p>
  );
}
