import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNotification } from '../../components/notification/Notification/useNotification';
import { formatFailure } from '../../utils/formatFailure';
import {
  listTextAssets,
  loadTextContent,
  saveText,
  TEXT_UPLOAD_ACCEPT,
} from '../../services/storage/textStorage';
import { bumpLibraryEpoch } from '../../store/slices/appShellSlice';
import { useAppDispatch } from '../../store/hooks';
import type { ChatTextAttachment } from '../../types/chat';
import { findAtQuery, stripAtQuery } from './attach/atQuery';
import {
  CHAT_ATTACH_WARN_CHARS,
  mimeFromFileName,
  validateTextAttachmentBody,
  validateTextAttachmentFile,
} from './attach/validateTextAttachment';
import { composeAttachedUserContent } from './attach/xmlAttach';

export const TXT_ATTACH_UPLOAD_ID = '__upload__';

export interface DraftTextAttachment extends ChatTextAttachment {
  body: string;
}

function fuzzyMatch(name: string, query: string): boolean {
  if (!query) {
    return true;
  }
  return name.toLowerCase().includes(query.toLowerCase());
}

export function useTxtChatAttachments(threadId: string) {
  const dispatch = useAppDispatch();
  const { notify } = useNotification();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachments, setAttachments] = useState<DraftTextAttachment[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [libraryItems, setLibraryItems] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    setAttachments([]);
    setMentionOpen(false);
    setMentionQuery('');
    setMentionStart(null);
  }, [threadId]);

  const refreshLibrary = useCallback(async () => {
    try {
      const assets = await listTextAssets();
      setLibraryItems(assets.map((item) => ({ id: item.id, name: item.name })));
    } catch (error) {
      notify(formatFailure('list text files', undefined, error));
    }
  }, [notify]);

  useEffect(() => {
    if (!mentionOpen) {
      return;
    }
    void refreshLibrary();
  }, [mentionOpen, refreshLibrary]);

  const mentionItems = useMemo(() => {
    const attachedIds = new Set(attachments.map((attached) => attached.assetId));
    const libraryFiles = libraryItems
      .filter((item) => fuzzyMatch(item.name, mentionQuery))
      .filter((item) => !attachedIds.has(item.id))
      .map((item) => ({ id: item.id, label: item.name }));
    return [
      { id: TXT_ATTACH_UPLOAD_ID, label: 'Upload file…' },
      ...libraryFiles.slice(0, 12),
    ];
  }, [attachments, libraryItems, mentionQuery]);

  useEffect(() => {
    setActiveIndex(0);
  }, [mentionItems]);

  const warnIfContextTight = useCallback(
    (nextAttachments: DraftTextAttachment[]) => {
      const attachedChars = nextAttachments.reduce((sum, item) => sum + item.body.length, 0);
      if (attachedChars >= CHAT_ATTACH_WARN_CHARS) {
        notify('Attached text is large — it may not fit in smaller context windows');
      }
    },
    [notify],
  );

  const addDraft = useCallback(
    (next: DraftTextAttachment) => {
      setAttachments((current) => {
        if (current.some((item) => item.assetId === next.assetId)) {
          return current;
        }
        const merged = [...current, next];
        warnIfContextTight(merged);
        return merged;
      });
    },
    [warnIfContextTight],
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const sizeError = validateTextAttachmentFile(file);
        if (sizeError) {
          notify(sizeError);
          continue;
        }
        let body: string;
        try {
          body = await file.text();
        } catch {
          notify(`Could not read ${file.name}`);
          continue;
        }
        const bodyError = validateTextAttachmentBody(body);
        if (bodyError) {
          notify(bodyError);
          continue;
        }
        try {
          const saved = await saveText(file, file.name);
          dispatch(bumpLibraryEpoch());
          addDraft({
            assetId: saved.id,
            name: saved.metadata?.originalName ?? file.name,
            mime: saved.mimeType,
            body,
          });
        } catch (error) {
          notify(formatFailure('attach file', file.name, error));
        }
      }
    },
    [addDraft, dispatch, notify],
  );

  const addAssetIds = useCallback(
    async (assetIds: string[]) => {
      for (const assetId of assetIds) {
        if (attachments.some((item) => item.assetId === assetId)) {
          continue;
        }
        try {
          const body = await loadTextContent(assetId);
          const bodyError = validateTextAttachmentBody(body);
          if (bodyError) {
            notify(bodyError);
            continue;
          }
          const item = libraryItems.find((row) => row.id === assetId);
          addDraft({
            assetId,
            name: item?.name ?? assetId,
            mime: mimeFromFileName(item?.name ?? 'notes.txt'),
            body,
          });
        } catch (error) {
          notify(formatFailure('attach file', undefined, error));
        }
      }
    },
    [addDraft, attachments, libraryItems, notify],
  );

  const removeAttachment = useCallback((assetId: string) => {
    setAttachments((current) => current.filter((item) => item.assetId !== assetId));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const closeMention = useCallback(() => {
    setMentionOpen(false);
    setMentionQuery('');
    setMentionStart(null);
  }, []);

  const syncMentionFromCaret = useCallback(
    (value: string, caret: number) => {
      const found = findAtQuery(value, caret);
      if (!found) {
        closeMention();
        return;
      }
      setMentionOpen(true);
      setMentionQuery(found.query);
      setMentionStart(found.start);
    },
    [closeMention],
  );

  const consumeMentionToken = useCallback(
    (draft: string, onDraftChange: (next: string) => void) => {
      const caret = textareaRef.current?.selectionStart ?? draft.length;
      const start = mentionStart ?? findAtQuery(draft, caret)?.start;
      if (start == null) {
        closeMention();
        return;
      }
      const next = stripAtQuery(draft, start, caret);
      onDraftChange(next);
      closeMention();
      requestAnimationFrame(() => {
        const node = textareaRef.current;
        if (node) {
          node.focus();
          node.setSelectionRange(start, start);
        }
      });
    },
    [closeMention, mentionStart],
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const selectMention = useCallback(
    (id: string, draft: string, onDraftChange: (next: string) => void) => {
      consumeMentionToken(draft, onDraftChange);
      if (id === TXT_ATTACH_UPLOAD_ID) {
        openFilePicker();
        return;
      }
      void addAssetIds([id]);
    },
    [addAssetIds, consumeMentionToken, openFilePicker],
  );

  const onComposerKeyDown = useCallback(
    (
      event: KeyboardEvent<HTMLTextAreaElement>,
      draft: string,
      onDraftChange: (next: string) => void,
    ): boolean => {
      if (!mentionOpen) {
        return false;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMention();
        return true;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, Math.max(mentionItems.length - 1, 0)));
        return true;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const item = mentionItems[activeIndex];
        if (item) {
          event.preventDefault();
          selectMention(item.id, draft, onDraftChange);
          return true;
        }
      }
      return false;
    },
    [activeIndex, closeMention, mentionItems, mentionOpen, selectMention],
  );

  const onFileInputChange = useCallback(
    (files: FileList | null) => {
      if (files && files.length > 0) {
        void addFiles(Array.from(files));
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [addFiles],
  );

  const buildApiContent = useCallback(
    (userText: string) =>
      composeAttachedUserContent(
        userText,
        attachments.map((item) => ({ name: item.name, mime: item.mime, body: item.body })),
      ),
    [attachments],
  );

  return {
    attachments,
    textareaRef,
    fileInputRef,
    fileAccept: TEXT_UPLOAD_ACCEPT,
    mentionOpen,
    mentionItems,
    activeIndex,
    setActiveIndex,
    addFiles,
    addAssetIds,
    removeAttachment,
    clearAttachments,
    syncMentionFromCaret,
    onComposerKeyDown,
    selectMention,
    onFileInputChange,
    buildApiContent,
    closeMention,
  };
}
