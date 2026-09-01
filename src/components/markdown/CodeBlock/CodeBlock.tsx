import type { ReactNode } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from './CodeBlock.module.css';

export interface CodeBlockProps {
  className?: string;
  children?: ReactNode;
  deferHighlight?: boolean;
}

export function CodeBlock({ className, children, deferHighlight = false }: CodeBlockProps) {
  const match = /language-(\w+)/.exec(className ?? '');
  const code = String(children).replace(/\n$/, '');

  if (match) {
    if (deferHighlight) {
      return (
        <div className={styles.blockWrapper}>
          <div className={styles.langLabel}>{match[1]}</div>
          <pre className={styles.plainPre}>
            <code>{code}</code>
          </pre>
        </div>
      );
    }

    return (
      <div className={styles.blockWrapper}>
        <div className={styles.langLabel}>{match[1]}</div>
        <SyntaxHighlighter
          language={match[1]}
          style={oneDark}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-sm)',
            background: 'var(--color-bg-app)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    );
  }

  return <code className={styles.inline}>{code}</code>;
}
