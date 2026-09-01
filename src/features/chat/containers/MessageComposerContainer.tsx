import { useCallback } from 'react';
import { MessageComposer } from '../../../components/message/MessageComposer/MessageComposer';
import { useNotification } from '../../../components/notification/Notification/useNotification';
import { useSessionPersistence } from '../../../features/session/SessionPersistenceContext';
import { resolveThreadSystemPrompt } from '../../../features/chat/sessionSystemPrompt';
import { useAbortController } from '../../../hooks/useAbortController';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  clearComposerDraft,
  selectComposerDraft,
  selectIsStreaming,
  setComposerDraft,
  setIsStreaming,
  setPinnedToBottom,
} from '../../../store/slices/chatUiSlice';
import { selectActiveSystemPrompt } from '../../../store/slices/promptsSlice';
import {
  appendMessage,
  createId,
  nowIso,
  selectActiveMessages,
  updateMessage,
} from '../../../store/slices/threadSlice';
import type { Thread, ThreadId } from '../../../types/chat';
import { streamChatTurn } from '../streamChatTurn';

export interface MessageComposerContainerProps {
  threadId: ThreadId;
}

export function MessageComposerContainer({ threadId }: MessageComposerContainerProps) {
  const dispatch = useAppDispatch();
  const { notify } = useNotification();
  const draft = useAppSelector(selectComposerDraft);
  const isStreaming = useAppSelector(selectIsStreaming);
  const messages = useAppSelector(selectActiveMessages);
  const activeSystemPrompt = useAppSelector(selectActiveSystemPrompt);
  const thread = useAppSelector(
    (state): Thread | undefined => state.thread.threads[threadId],
  );
  const { persistAfterTurn } = useSessionPersistence();
  const { abortRef, begin, abort } = useAbortController(threadId);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || isStreaming) {
      return;
    }

    const controller = begin();
    const userMessageId = createId();
    const assistantMessageId = createId();

    dispatch(
      appendMessage({
        threadId,
        message: {
          id: userMessageId,
          role: 'user',
          content: text,
          status: 'complete',
          createdAt: nowIso(),
        },
      }),
    );
    dispatch(clearComposerDraft());
    dispatch(
      appendMessage({
        threadId,
        message: {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          status: 'streaming',
          createdAt: nowIso(),
        },
      }),
    );
    dispatch(setIsStreaming(true));
    dispatch(setPinnedToBottom(true));

    const systemPrompt = await resolveThreadSystemPrompt(thread, activeSystemPrompt);

    await streamChatTurn({
      systemPrompt,
      historyMessages: messages.map((message) => ({
        role: message.role,
        content: message.apiContent ?? message.content,
      })),
      userContent: text,
      signal: controller.signal,
      abortRef,
      controller,
      notify,
      onChunk: (accumulated) => {
        dispatch(
          updateMessage({
            threadId,
            messageId: assistantMessageId,
            patch: { content: accumulated },
          }),
        );
      },
      onDone: () => {
        dispatch(
          updateMessage({
            threadId,
            messageId: assistantMessageId,
            patch: { status: 'complete' },
          }),
        );
        dispatch(setIsStreaming(false));
        void persistAfterTurn();
      },
      onError: (error) => {
        dispatch(
          updateMessage({
            threadId,
            messageId: assistantMessageId,
            patch: {
              status: 'error',
              content: error.message || 'Something went wrong. Please try again.',
            },
          }),
        );
        dispatch(setIsStreaming(false));
      },
    });
  }, [
    abortRef,
    activeSystemPrompt,
    begin,
    dispatch,
    draft,
    isStreaming,
    messages,
    notify,
    persistAfterTurn,
    thread,
    threadId,
  ]);

  const handleAbort = useCallback(() => {
    abort();
    dispatch(setIsStreaming(false));
  }, [abort, dispatch]);

  return (
    <MessageComposer
      value={draft}
      isStreaming={isStreaming}
      sendIcon="send"
      placeholder="Type a message…"
      onChange={(value) => dispatch(setComposerDraft(value))}
      onSend={() => {
        void handleSend();
      }}
      onAbort={handleAbort}
    />
  );
}
