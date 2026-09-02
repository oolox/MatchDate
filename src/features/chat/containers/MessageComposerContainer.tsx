import { useCallback } from 'react';
import { AttachmentChips } from '../../../components/chat/AttachmentChips/AttachmentChips';
import { MentionMenu } from '../../../components/chat/MentionMenu/MentionMenu';
import { MessageComposer } from '../../../components/message/MessageComposer/MessageComposer';
import { useNotification } from '../../../components/notification/Notification/useNotification';
import { useSessionPersistence } from '../../../features/session/SessionPersistenceContext';
import { resolveThreadSystemPrompt } from '../../../features/chat/sessionSystemPrompt';
import { apiContentForMessage } from '../attach/xmlAttach';
import { useTxtChatAttachments } from '../useTxtChatAttachments';
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
  const attach = useTxtChatAttachments(threadId);

  const setDraft = useCallback(
    (value: string) => {
      dispatch(setComposerDraft(value));
      const caret = attach.textareaRef.current?.selectionStart ?? value.length;
      attach.syncMentionFromCaret(value, caret);
    },
    [attach, dispatch],
  );

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if ((!text && attach.attachments.length === 0) || isStreaming) {
      return;
    }

    const controller = begin();
    const userMessageId = createId();
    const assistantMessageId = createId();
    const chips = attach.attachments.map(({ assetId, name, mime }) => ({
      assetId,
      name,
      mime,
    }));
    const apiContent = attach.buildApiContent(text);

    dispatch(
      appendMessage({
        threadId,
        message: {
          id: userMessageId,
          role: 'user',
          content: text,
          apiContent: chips.length > 0 ? apiContent : undefined,
          attachments: chips.length > 0 ? chips : undefined,
          status: 'complete',
          createdAt: nowIso(),
        },
      }),
    );
    dispatch(clearComposerDraft());
    attach.clearAttachments();
    attach.closeMention();
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
        content: apiContentForMessage(message),
      })),
      userContent: apiContent,
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
    attach,
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

  const activeItem = attach.mentionItems[attach.activeIndex];

  return (
    <>
      <input
        ref={attach.fileInputRef}
        type="file"
        accept={attach.fileAccept}
        multiple
        hidden
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => attach.onFileInputChange(event.target.files)}
      />
      <MessageComposer
        value={draft}
        isStreaming={isStreaming}
        sendIcon="send"
        allowEmptySend={attach.attachments.length > 0}
        placeholder="Type a message… (@ to attach)"
        textareaRef={attach.textareaRef}
        enableFileDrop
        attachments={
          <AttachmentChips items={attach.attachments} onRemove={attach.removeAttachment} />
        }
        mentionOpen={attach.mentionOpen}
        mentionActiveId={
          attach.mentionOpen && activeItem ? `txt-attach-option-${activeItem.id}` : undefined
        }
        mentionMenu={
          attach.mentionOpen ? (
            <MentionMenu
              items={attach.mentionItems}
              activeIndex={attach.activeIndex}
              onActiveIndexChange={attach.setActiveIndex}
              onSelect={(id) => attach.selectMention(id, draft, setDraft)}
            />
          ) : null
        }
        onFilesDrop={(files) => {
          void attach.addFiles(files);
        }}
        onComposerKeyDown={(event) => attach.onComposerKeyDown(event, draft, setDraft)}
        onChange={setDraft}
        onSend={() => {
          void handleSend();
        }}
        onAbort={handleAbort}
      />
    </>
  );
}
