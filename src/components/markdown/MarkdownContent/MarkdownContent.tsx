import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '../CodeBlock/CodeBlock';
import styles from './MarkdownContent.module.css';

export interface MarkdownContentProps {
  content: string;
  deferHighlight?: boolean;
  className?: string;
}

function createMarkdownComponents(deferHighlight: boolean): Components {
  return {
    code(props) {
      const { className, children } = props;
      return (
        <CodeBlock className={className} deferHighlight={deferHighlight}>
          {children}
        </CodeBlock>
      );
    },
    a({ href, children }) {
      return (
        <a href={href} target="_blank" rel="noreferrer noopener">
          {children}
        </a>
      );
    },
    table({ children }) {
      return (
        <div className={styles.tableWrap}>
          <table>{children}</table>
        </div>
      );
    },
  };
}

function MarkdownContentComponent({
  content,
  deferHighlight = false,
  className,
}: MarkdownContentProps) {
  const plugins = useMemo(() => [remarkGfm], []);
  const components = useMemo(
    () => createMarkdownComponents(deferHighlight),
    [deferHighlight],
  );
  const classes = [styles.markdown, className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <ReactMarkdown remarkPlugins={plugins} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownContent = memo(MarkdownContentComponent);
