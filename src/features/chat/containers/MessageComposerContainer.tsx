import { useCallback, useState } from 'react';
import { ChatModelSelect } from '../../../components/chat/ChatModelSelect';
import { CreateCharacterModal } from '../../../components/chat/CreateCharacterModal';
import { PrepromptSelect } from '../../../components/chat/PrepromptSelect';
import { SystemPromptSelect } from '../../../components/chat/SystemPromptSelect';
import { AttachmentChips } from '../../../components/chat/AttachmentChips/AttachmentChips';
import { MentionMenu } from '../../../components/chat/MentionMenu/MentionMenu';
import { MessageComposer } from '../../../components/message/MessageComposer/MessageComposer';
import { useNotification } from '../../../components/notification/Notification/useNotification';
import { useSessionPersistence } from '../../../features/session/SessionPersistenceContext';
import { resolveThreadChatModel, resolveThreadSystemPrompt } from '../sessionSystemPrompt';
import {
  PREPROMPT_NONE_VALUE,
  resolvePrepromptSelectValue,
} from '../sessionPreprompt';
import { listAssets } from '../../../services/storage/persistenceService';
import { loadTextContent } from '../../../services/storage/textStorage';
import { apiContentForMessage } from '../attach/xmlAttach';
import type { CharacterToolMessage } from '../attach/jsonAttach';
import { parseCharacterToolMessages } from '../attach/parseCharacterTools';
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
import { selectChatModel, selectPrepromptAssetId } from '../../../store/slices/localStorageSlice';
import { selectActiveSystemPrompt } from '../../../store/slices/promptsSlice';
import {
  appendMessage,
  createId,
  nowIso,
  selectActiveMessages,
  updateMessage,
} from '../../../store/slices/threadSlice';
import type { Thread, ThreadId } from '../../../types/chat';
import {
  characterFromCreateData,
  formatCharacterToolToast,
  processCharacterTool,
  processTools,
} from '../../../services/tools';
import { bumpLibraryEpoch } from '../../../store/slices/appShellSlice';
import { streamChatTurn } from '../streamChatTurn';

export interface MessageComposerContainerProps {
  threadId: ThreadId;
}

type PendingCharacterCreate = {
  tool: CharacterToolMessage;
  name: string;
};

export function MessageComposerContainer({ threadId }: MessageComposerContainerProps) {
  const dispatch = useAppDispatch();
  const { notify } = useNotification();
  const draft = useAppSelector(selectComposerDraft);
  const isStreaming = useAppSelector(selectIsStreaming);
  const messages = useAppSelector(selectActiveMessages);
  const activeSystemPrompt = useAppSelector(selectActiveSystemPrompt);
  const chatModel = useAppSelector(selectChatModel);
  const storedPrepromptId = useAppSelector(selectPrepromptAssetId);
  const thread = useAppSelector(
    (state): Thread | undefined => state.thread.threads[threadId],
  );
  const { persistAfterTurn } = useSessionPersistence();
  const { abortRef, begin, abort } = useAbortController(threadId);
  const attach = useTxtChatAttachments(threadId);
  const [pendingCreates, setPendingCreates] = useState<PendingCharacterCreate[]>([]);
  const [createBusy, setCreateBusy] = useState(false);

  const pendingCreate = pendingCreates[0] ?? null;

  const setDraft = useCallback(
    (value: string) => {
      dispatch(setComposerDraft(value));
      const caret = attach.textareaRef.current?.selectionStart ?? value.length;
      attach.syncMentionFromCaret(value, caret);
    },
    [attach, dispatch],
  );

  const dismissPendingCreate = useCallback(() => {
    setPendingCreates((queue) => queue.slice(1));
  }, []);

  const handleRejectCreate = useCallback(() => {
    if (createBusy) {
      return;
    }
    dismissPendingCreate();
  }, [createBusy, dismissPendingCreate]);

  const handleAcceptCreate = useCallback(() => {
    if (!pendingCreate || createBusy) {
      return;
    }
    setCreateBusy(true);
    void (async () => {
      try {
        const result = await processCharacterTool(pendingCreate.tool);
        if (result.ok) {
          notify(formatCharacterToolToast(result));
          dispatch(bumpLibraryEpoch());
        } else {
          notify(result.message);
        }
      } finally {
        setCreateBusy(false);
        dismissPendingCreate();
      }
    })();
  }, [createBusy, dismissPendingCreate, dispatch, notify, pendingCreate]);

  const handleSend = useCallback(async () => {
    if (isStreaming) {
      return;
    }

    // @mention attach loads OPFS async — wait so the payload includes them with preprompt.
    await attach.waitForPendingAttachments();

    const trimmed = draft.trim();
    const snapshot = attach.getAttachmentSnapshot();
    const apiContent = attach.buildApiContent(trimmed);
    if (!trimmed && snapshot.length === 0) {
      return;
    }

    const controller = begin();
    const userMessageId = createId();
    const assistantMessageId = createId();
    const chips = snapshot.map((item) => ({
      assetId: item.assetId,
      name: item.name,
      kind: item.kind,
      mime: item.kind === 'text' ? item.mime : undefined,
    }));

    dispatch(
      appendMessage({
        threadId,
        message: {
          id: userMessageId,
          role: 'user',
          content: trimmed,
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

    const isFirstMessage = messages.length === 0;
    let systemPrompt = await resolveThreadSystemPrompt(thread, activeSystemPrompt);
    if (isFirstMessage) {
      try {
        const texts = (await listAssets())
          .filter((item) => item.subtype === 'text')
          .map((item) => ({ id: item.id, name: item.name }));
        const prepromptId = resolvePrepromptSelectValue(storedPrepromptId, texts);
        if (prepromptId !== PREPROMPT_NONE_VALUE) {
          const prepromptBody = (await loadTextContent(prepromptId)).trim();
          if (prepromptBody) {
            systemPrompt = `${systemPrompt.trim()}\n\n${prepromptBody}`;
          }
        }
      } catch (error) {
        console.info('Could not load preprompt text asset', { error });
      }
    }
    const model = resolveThreadChatModel(thread, chatModel);

    await streamChatTurn({
      systemPrompt,
      historyMessages: messages.map((message) => ({
        role: message.role,
        content: apiContentForMessage(message),
      })),
      userContent: apiContent,
      model,
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
      onDone: (accumulated) => {
        dispatch(
          updateMessage({
            threadId,
            messageId: assistantMessageId,
            patch: { status: 'complete' },
          }),
        );
        dispatch(setIsStreaming(false));
        void (async () => {
          const agentTools = parseCharacterToolMessages(accumulated).filter(
            (tool) => tool.origin === 'agent',
          );
          const updates = agentTools.filter((tool) => tool.action === 'update');
          const creates = agentTools.filter((tool) => tool.action === 'create');

          if (updates.length > 0) {
            const { results } = await processTools(updates);
            let applied = false;
            for (const result of results) {
              if (result.ok) {
                applied = true;
                notify(formatCharacterToolToast(result));
              }
            }
            if (applied) {
              dispatch(bumpLibraryEpoch());
            }
          }

          const nextCreates: PendingCharacterCreate[] = [];
          for (const tool of creates) {
            const character = characterFromCreateData(tool.data);
            if (character) {
              nextCreates.push({ tool, name: character.name });
            }
          }
          if (nextCreates.length > 0) {
            setPendingCreates((queue) => [...queue, ...nextCreates]);
          }

          await persistAfterTurn();
        })();
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
    chatModel,
    dispatch,
    draft,
    isStreaming,
    messages,
    notify,
    persistAfterTurn,
    storedPrepromptId,
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
        actionsLeading={
          <>
            <ChatModelSelect disabled={isStreaming} />
            <SystemPromptSelect threadId={threadId} disabled={isStreaming} />
            <PrepromptSelect disabled={isStreaming} consumed={messages.length > 0} />
          </>
        }
        placeholder="Type a message… (@ to attach)"
        textareaRef={attach.textareaRef}
        enableFileDrop
        dropLabel="Drop text files or library items here"
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
        onLibraryDrop={(items) => {
          void attach.addLibraryItems(items);
        }}
        onComposerKeyDown={(event) => attach.onComposerKeyDown(event, draft, setDraft)}
        onChange={setDraft}
        onSend={() => {
          void handleSend();
        }}
        onAbort={handleAbort}
      />
      <CreateCharacterModal
        open={pendingCreate !== null}
        characterName={pendingCreate?.name ?? 'character'}
        busy={createBusy}
        onAccept={handleAcceptCreate}
        onReject={handleRejectCreate}
      />
    </>
  );
}
