import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNotification } from '../../components/notification/Notification/useNotification';
import { formatFailure } from '../../utils/formatFailure';
import {
  listAssets,
  listCharacters,
  loadAsset,
  loadCharacter,
} from '../../services/storage/persistenceService';
import {
  loadTextContent,
  saveText,
  TEXT_UPLOAD_ACCEPT,
} from '../../services/storage/textStorage';
import type { Character } from '../../types/character';
import type { ChatAttachment, ChatAttachmentKind } from '../../types/chat';
import type { MatchDateLibraryDragPayload } from '../../utils/matchdateLibraryDrag';
import { bumpLibraryEpoch } from '../../store/slices/appShellSlice';
import { useAppDispatch } from '../../store/hooks';
import { findAtQuery, stripAtQuery } from './attach/atQuery';
import {
  CHAT_ATTACH_WARN_CHARS,
  mimeFromFileName,
  validateTextAttachmentBody,
  validateTextAttachmentFile,
} from './attach/validateTextAttachment';
import { composeAttachedUserContent } from './attach/xmlAttach';

export const TXT_ATTACH_UPLOAD_ID = '__upload__';

const TEXT_MENTION_PREFIX = 'text:';
const CHARACTER_MENTION_PREFIX = 'character:';

export type DraftAttachment =
  | (ChatAttachment & { kind: 'text'; mime: string; body: string })
  | (ChatAttachment & { kind: 'character'; character: Character });

/** @deprecated Prefer DraftAttachment */
export type DraftTextAttachment = Extract<DraftAttachment, { kind: 'text' }>;

type LibraryMentionRow = {
  id: string;
  name: string;
  kind: ChatAttachmentKind;
  mime?: string;
};

function fuzzyMatch(name: string, query: string): boolean {
  if (!query) {
    return true;
  }
  return name.toLowerCase().includes(query.toLowerCase());
}

function attachmentKey(kind: ChatAttachmentKind, assetId: string): string {
  return `${kind}:${assetId}`;
}

function mentionIdFor(kind: ChatAttachmentKind, assetId: string): string {
  return kind === 'character'
    ? `${CHARACTER_MENTION_PREFIX}${assetId}`
    : `${TEXT_MENTION_PREFIX}${assetId}`;
}

function parseMentionId(
  id: string,
): { kind: ChatAttachmentKind; assetId: string } | null {
  if (id.startsWith(CHARACTER_MENTION_PREFIX)) {
    return { kind: 'character', assetId: id.slice(CHARACTER_MENTION_PREFIX.length) };
  }
  if (id.startsWith(TEXT_MENTION_PREFIX)) {
    return { kind: 'text', assetId: id.slice(TEXT_MENTION_PREFIX.length) };
  }
  return null;
}

export function useTxtChatAttachments(threadId: string) {
  const dispatch = useAppDispatch();
  const { notify } = useNotification();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [libraryItems, setLibraryItems] = useState<LibraryMentionRow[]>([]);

  useEffect(() => {
    setAttachments([]);
    setMentionOpen(false);
    setMentionQuery('');
    setMentionStart(null);
  }, [threadId]);

  const refreshLibrary = useCallback(async () => {
    try {
      const [assets, characters] = await Promise.all([listAssets(), listCharacters()]);
      const textAssets = assets.filter((item) => item.subtype === 'text');
      const textRows = await Promise.all(
        textAssets.map(async (item) => {
          try {
            const asset = await loadAsset(item.id);
            const mime =
              asset.mimeType === 'text/markdown' ? 'text/markdown' : 'text/plain';
            return {
              id: item.id,
              name: item.name,
              kind: 'text' as const,
              mime,
            };
          } catch {
            return {
              id: item.id,
              name: item.name,
              kind: 'text' as const,
              mime: 'text/plain',
            };
          }
        }),
      );
      const characterRows = characters.map((item) => ({
        id: item.id,
        name: item.name,
        kind: 'character' as const,
      }));
      setLibraryItems([...characterRows, ...textRows]);
    } catch (error) {
      notify(formatFailure('list attachable library items', undefined, error));
    }
  }, [notify]);

  useEffect(() => {
    if (!mentionOpen) {
      return;
    }
    void refreshLibrary();
  }, [mentionOpen, refreshLibrary]);

  const mentionItems = useMemo(() => {
    const attachedKeys = new Set(
      attachments.map((attached) => attachmentKey(attached.kind, attached.assetId)),
    );
    const libraryFiles = libraryItems
      .filter((item) => fuzzyMatch(item.name, mentionQuery))
      .filter((item) => !attachedKeys.has(attachmentKey(item.kind, item.id)))
      .map((item) => ({
        id: mentionIdFor(item.kind, item.id),
        label: item.kind === 'character' ? `@${item.name}` : item.name,
      }));
    return [
      { id: TXT_ATTACH_UPLOAD_ID, label: 'Upload file…' },
      ...libraryFiles.slice(0, 12),
    ];
  }, [attachments, libraryItems, mentionQuery]);

  useEffect(() => {
    setActiveIndex(0);
  }, [mentionItems]);

  const warnIfContextTight = useCallback(
    (nextAttachments: DraftAttachment[]) => {
      const attachedChars = nextAttachments.reduce((sum, item) => {
        if (item.kind === 'text') {
          return sum + item.body.length;
        }
        return sum + JSON.stringify(item.character).length;
      }, 0);
      if (attachedChars >= CHAT_ATTACH_WARN_CHARS) {
        notify('Attached content is large — it may not fit in smaller context windows');
      }
    },
    [notify],
  );

  const addDraft = useCallback(
    (next: DraftAttachment) => {
      setAttachments((current) => {
        if (
          current.some(
            (item) => item.assetId === next.assetId && item.kind === next.kind,
          )
        ) {
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
            kind: 'text',
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

  const addTextAsset = useCallback(
    async (assetId: string) => {
      if (attachments.some((item) => item.kind === 'text' && item.assetId === assetId)) {
        return;
      }
      try {
        const body = await loadTextContent(assetId);
        const bodyError = validateTextAttachmentBody(body);
        if (bodyError) {
          notify(bodyError);
          return;
        }
        const item = libraryItems.find((row) => row.kind === 'text' && row.id === assetId);
        let name = item?.name;
        let mime = item?.mime;
        if (!name || !mime) {
          try {
            const asset = await loadAsset(assetId);
            name = name ?? asset.name;
            mime =
              mime ??
              (asset.mimeType === 'text/markdown' ? 'text/markdown' : 'text/plain');
          } catch {
            // fall through to filename defaults
          }
        }
        addDraft({
          kind: 'text',
          assetId,
          name: name ?? assetId,
          mime: mime ?? mimeFromFileName(name ?? 'notes.txt'),
          body,
        });
      } catch (error) {
        notify(formatFailure('attach file', undefined, error));
      }
    },
    [addDraft, attachments, libraryItems, notify],
  );

  const addCharacterAsset = useCallback(
    async (characterId: string) => {
      if (
        attachments.some((item) => item.kind === 'character' && item.assetId === characterId)
      ) {
        return;
      }
      try {
        const character = await loadCharacter(characterId);
        const item = libraryItems.find(
          (row) => row.kind === 'character' && row.id === characterId,
        );
        addDraft({
          kind: 'character',
          assetId: characterId,
          name: character.name || item?.name || characterId,
          character,
        });
      } catch (error) {
        notify(formatFailure('attach character', undefined, error));
      }
    },
    [addDraft, attachments, libraryItems, notify],
  );

  const addLibraryItems = useCallback(
    async (items: MatchDateLibraryDragPayload[]) => {
      for (const item of items) {
        if (item.kind === 'character') {
          await addCharacterAsset(item.id);
          continue;
        }
        if (item.kind === 'asset' && (item.subtype == null || item.subtype === 'text')) {
          await addTextAsset(item.id);
        }
      }
    },
    [addCharacterAsset, addTextAsset],
  );

  /** @deprecated Prefer addLibraryItems / addTextAsset */
  const addAssetIds = useCallback(
    async (assetIds: string[]) => {
      await addLibraryItems(assetIds.map((id) => ({ kind: 'asset', id, subtype: 'text' })));
    },
    [addLibraryItems],
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
      const parsed = parseMentionId(id);
      if (!parsed) {
        return;
      }
      if (parsed.kind === 'character') {
        void addCharacterAsset(parsed.assetId);
        return;
      }
      void addTextAsset(parsed.assetId);
    },
    [addCharacterAsset, addTextAsset, consumeMentionToken, openFilePicker],
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
    (userText: string) => {
      const files = attachments
        .filter((item): item is Extract<DraftAttachment, { kind: 'text' }> => item.kind === 'text')
        .map((item) => ({ name: item.name, mime: item.mime, body: item.body }));
      const characters = attachments
        .filter(
          (item): item is Extract<DraftAttachment, { kind: 'character' }> =>
            item.kind === 'character',
        )
        .map((item) => ({ character: item.character, guid: item.assetId }));
      return composeAttachedUserContent(userText, files, characters);
    },
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
    addLibraryItems,
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
