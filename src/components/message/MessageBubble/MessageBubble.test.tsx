import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ThreadMessage } from '../../../types/chat';
import { MessageBubble } from './MessageBubble';
import styles from './MessageBubble.module.css';

vi.mock('../AssistantMessageContent/AssistantMessageContent', () => ({
  AssistantMessageContent: ({ content }: { content: string }) => <div>{content}</div>,
}));

const waiting: ThreadMessage = {
  id: 'a',
  role: 'assistant',
  content: '',
  status: 'streaming',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('MessageBubble reasoning', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows reasoning under the waiting spinner', () => {
    render(<MessageBubble message={waiting} reasoning={'line one\nline two\nline three\nline four'} />);

    expect(screen.getByRole('article', { name: 'MasterDater is generating' })).toBeInTheDocument();
    const reasoning = screen.getByLabelText('Reasoning');
    expect(reasoning).toHaveTextContent('line one');
    expect(reasoning).toHaveClass(styles.reasoning);
  });

  it('hides reasoning once the answer has text', () => {
    render(
      <MessageBubble
        message={{ ...waiting, content: 'Hello' }}
        reasoning="still thinking"
      />,
    );

    expect(screen.queryByLabelText('Reasoning')).not.toBeInTheDocument();
    expect(screen.getByLabelText('MasterDater message')).toHaveTextContent('Hello');
  });
});
