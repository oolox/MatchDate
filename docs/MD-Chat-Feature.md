# MatchDate — Chat Feature Port Guide

> **Purpose:** Document MatchDate's chat architecture — FAL.ai LLM integration, code patterns, UI components, and state flow.

**Last updated:** 2026-08-31  
**Scope:** Text chat (TXT generator) — streaming LLM turns via FAL OpenRouter, `@` text attachments, system prompts.  
**Out of scope:** Image/video generation, full session persistence, refiners, character sheets (mentioned only where they touch chat UI).

Related: `docs/MD-FalRefactor.md`, `docs/MD-attach.md`, `docs/MD-refiners.md`.

---

## 1. Architecture Overview

MatchDate chat is a **browser-only** integration. There is no backend chat proxy. The UI calls FAL's OpenAI-compatible endpoint directly with `fetch` and parses SSE in the client.

```
┌─────────────────────────────────────────────────────────────────┐
│  UI (React)                                                      │
│  MessageThreadContainer → MessageList + MessageComposerContainer │
└────────────────────────────┬────────────────────────────────────┘
                             │ Redux: threadSlice + chatUiSlice
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  streamChatTurn                                                  │
│  Builds messages[]: system + history + user                      │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  chatService.streamCompletion  (src/services/fal/chatService)   │
│  getChatModel(registryId) → OpenRouter slug                      │
│  falFetch → POST SSE                                           │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
  https://fal.run/openrouter/router/openai/v1/chat/completions
  Authorization: Key <VITE_FAL_KEY>
```

**Key design choices:**

| Choice | Pattern |
|--------|---------|
| LLM transport | Raw `fetch` + manual SSE parsing (not `@fal-ai/client` for chat) |
| Auth header | `Authorization: Key <api-key>` (not Bearer) |
| Model IDs | App registry id → OpenRouter slug via `getChatModel()` |
| Streaming UX | Placeholder assistant message with `status: 'streaming'`; accumulate deltas in Redux |
| Abort | `AbortSignal`; abort calls `onDone` and keeps partial text |
| Container/presentational split | `*Container` wires Redux/API; `components/message/*` is pure UI |

---

## 2. FAL.ai LLM Integration

### 2.1 Environment & authentication

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_FAL_KEY` | **Yes** | FAL API key exposed to the browser (Vite `import.meta.env`) |

```env
# .env
VITE_FAL_KEY=your-fal-api-key-here
```

**Auth helper** (`src/services/fal/falClient.ts`):

```ts
export function getFalApiKey(): string {
  const key = String(import.meta.env.VITE_FAL_KEY ?? '').trim();
  if (!key) throw new Error('Missing VITE_FAL_KEY. Add it to your .env file.');
  return key;
}

export function getFalHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Key ${getFalApiKey()}`,
  };
}

export async function falFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(getFalHeaders());
  // merge init.headers …
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`fal API error (${response.status}): ${errorBody}`);
  }
  return response;
}
```

> **Note:** `@fal-ai/client` is configured in `falClient.ts` for image/video upload (`fal.storage.upload`). Chat does **not** use it.

> **Security:** The API key is visible in the browser bundle. For production, consider a backend proxy.

### 2.2 Endpoint

```ts
export const FAL_CHAT_COMPLETIONS_URL =
  'https://fal.run/openrouter/router/openai/v1/chat/completions';
```

OpenAI-compatible `POST` with `stream: true`. Response is SSE: `data: {...}` lines, terminated by `data: [DONE]`.

### 2.3 Request body

```ts
const body = {
  model: chatModel.modelName,   // OpenRouter slug from registry
  messages,                     // ChatMessage[]
  stream: true,
  response_format: { type: 'text' },
};

// Optional DeepSeek V4 thinking toggle:
if (thinking === true) {
  body.reasoning_effort = 'high';
  body.thinking = { type: 'enabled' };
} else if (thinking === false) {
  body.thinking = { type: 'disabled' };
}
```

### 2.4 SSE consumption pattern

`chatService.ts` reads `response.body` with a `ReadableStream`:

1. Decode chunks with `TextDecoder`
2. Split on `\n`, keep partial line in buffer
3. For each line starting with `data:`:
   - Skip if payload is `[DONE]`
   - `JSON.parse` → read `choices[0].delta.content`
   - Call `onChunk(delta)` for each non-empty delta
4. On success → `onDone()`
5. On `AbortError` → `onDone()` (partial text preserved)
6. On other errors → `onError(error)`

### 2.5 Core service API

**File:** `src/services/fal/chatService.ts`

```ts
export interface StreamCompletionOptions {
  messages: ChatMessage[];
  onChunk: (contentDelta: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
  model?: string;      // registry id, not OpenRouter slug
  thinking?: boolean;  // DeepSeek V4 only
}

export const chatService = {
  streamCompletion,
  DEFAULT_MODEL,
};
```

**Callback semantics:**

- `onChunk` receives **deltas** (caller accumulates)
- `streamChatTurn` wraps this and passes **accumulated** text to its `onChunk`
- Abort is treated as successful completion, not an error

### 2.6 Model registry

**Files:** `src/services/fal/models/chat/`

| Registry ID | OpenRouter slug | Short label | Default |
|-------------|-----------------|-------------|---------|
| `deepseek/deepseek-v4-flash` | same | `fla` | **Yes** |
| `deepseek/deepseek-v4-pro` | same | `pro` | |
| `aion-labs/aion-2.0` | same | `aio` | |
| `meta-llama/llama-4-maverick` | same | `mav` | |

**Type** (`src/services/fal/models/chatTypes.ts`):

```ts
export type ChatModelConfig = {
  id: string;           // MatchDate registry / preference key
  label: string;
  modelName: string;    // OpenRouter slug sent to FAL
  shortLabel?: string;
  description: string;
  contextLength?: number;
  cost: ChatModelCost;
};
```

**Registry API** (`src/services/fal/models/chat/index.ts`):

- `listChatModels()` — all models
- `getChatModel(id)` — resolve id → config (throws if unknown)
- `isKnownChatModelId(id)` — validation
- `resolveChatModelId(id)` — legacy id mapping (e.g. Euryale → Aion 2.0)
- `DEFAULT_CHAT_MODEL_ID` — `deepseek/deepseek-v4-flash`

**Model selection resolution** (`src/features/chat/sessionSystemPrompt.ts`):

```ts
export function resolveThreadChatModel(thread: Thread | undefined, fallback: string): string {
  const modelId = thread?.modelId?.trim();
  if (modelId && Object.prototype.hasOwnProperty.call(CHAT_MODELS, modelId)) {
    return modelId;
  }
  return fallback;
}
```

Per-thread `thread.modelId` overrides the global preference (`localStorage` key `txtModel`).

### 2.7 Turn orchestration — `streamChatTurn`

**File:** `src/features/chat/streamChatTurn.ts`

Single entry point after user/assistant placeholders are in state. Builds the API payload:

```
[system prompt]
[optional extra system messages]
[history messages]
[user content]
```

```ts
export async function streamChatTurn(options: {
  systemPrompt: string;
  historyMessages?: { role: ChatMessage['role']; content: string }[];
  extraSystemMessages?: string[];
  userContent: string;
  model?: string;
  thinking?: boolean;
  signal: AbortSignal;
  abortRef: { current: AbortController | null };
  controller: AbortController;
  onChunk: (accumulated: string) => void;
  onDone: (accumulated: string) => void;
  onError: (error: Error) => void;
  notify: (message: string) => void;
}): Promise<void>
```

This is the function to port if you only need "send a message and stream the reply."

### 2.8 Types for API messages

**File:** `src/types/chat.ts`

```ts
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error';

export interface ThreadMessage {
  id: string;
  role: MessageRole;
  content: string;           // transcript display
  apiContent?: string;       // payload sent to LLM (attachments)
  attachments?: ChatTextAttachment[];
  status?: MessageStatus;
  createdAt: string;
}

export interface Thread {
  id: string;
  title: string;
  messages: ThreadMessage[];
  systemPromptSlug?: string;
  modelId?: string;
  // … persistence fields omitted for port guide
}
```

Use `apiContentForMessage(message)` (`src/features/chat/attach/xmlAttach.ts`) when building history — returns `apiContent ?? content`.

---

## 3. Chat UI

### 3.1 Component hierarchy

MatchDate mounts text chat inside the session view (`/session/:sessionId`). The message tree can also be embedded on other routes if needed:

```
MessageThreadContainer
└── MessageThread
    ├── MessageList
    │   ├── MessageListEmpty (when no messages)
    │   └── MessageBubble (per message)
    │       └── AssistantMessageContent (assistant only — markdown)
    └── MessageComposerContainer
        └── MessageComposer
            ├── AttachmentChips (optional)
            ├── MentionMenu (optional @ attach)
            └── MessageTextInput (textarea)
```

**Shell chrome** (optional for a minimal port):

- `ChatLayout` — full-height flex shell
- `ChatHeader` + `ViewNav` — app navigation
- `ChatModelPicker` — model tabs in subheader
- `HeaderCredits` — FAL balance display

### 3.2 Key UI files

| Layer | Path | Role |
|-------|------|------|
| Thread shell | `src/components/message/MessageThread/MessageThread.tsx` | Flex column: messages + composer |
| Message list | `src/components/message/MessageList/MessageList.tsx` | Scroll, auto-pin, empty state |
| Message bubble | `src/components/message/MessageBubble/MessageBubble.tsx` | User right / assistant full-width |
| Assistant body | `src/components/message/AssistantMessageContent/` | Markdown + code highlighting |
| Composer | `src/components/message/MessageComposer/MessageComposer.tsx` | Input, send, streaming spinner |
| Thread container | `src/features/chat/containers/MessageThreadContainer.tsx` | Wires list + composer to Redux |
| Composer container | `src/features/chat/containers/MessageComposerContainer.tsx` | Send pipeline |

### 3.3 UI patterns

**Container/presentational split**

- `MessageComposer` — pure props: `value`, `onChange`, `onSend`, `isStreaming`
- `MessageComposerContainer` — Redux selectors, `handleSend`, `streamChatTurn`

**Message rendering**

- **User:** right-aligned bubble, `pre-wrap` text, optional `AttachmentChips`
- **Assistant:** full-width, no bubble chrome; markdown via `react-markdown` + `remark-gfm`
- **Streaming (empty):** 48px `Spinner` until first chunk arrives
- **Streaming (content):** growing text; `deferHighlight={status === 'streaming'}` on code blocks
- **Error:** error styling on bubble, message text from `error.message`

**Scroll behavior** (`MessageList`)

- `isPinnedToBottom` state in Redux
- Auto-scroll on new content via `useLayoutEffect` + `ResizeObserver`
- Unpin when user scrolls up (48px idle threshold, 120px while streaming)
- `role="log"` + `aria-live="polite"` for accessibility

**Composer behavior** (`MessageComposer`)

- Enter sends, Shift+Enter newline
- Disabled while `isStreaming`
- Optional file drop zone for text attachments
- Send button via custom `IconButton`

**Styling**

- CSS Modules on every component (`*.module.css`)
- Design tokens via CSS variables: `--color-bg-app`, `--color-bubble-sent`, `--space-*`, `--radius-bubble`
- No component library (MUI/Chakra) — custom `IconButton`, `TextArea`, `Spinner`

### 3.4 Secondary chat pattern — `useConversation`

For isolated chat panels (prompt refine, character edit), MatchDate uses the same message UI with a different state slice:

| Pattern | State | Used for |
|---------|-------|----------|
| `threadSlice` + `chatUiSlice` | One active thread, global composer draft | Main session text chat |
| `conversationsSlice` + `useConversation` | Per-`conversationId` messages/draft/streaming | Refiners, detail editors |

**File:** `src/features/conversations/useConversation.ts`

Same send/stream logic as `MessageComposerContainer`, plus options:

- `systemPromptOverride` — replace library system prompt
- `includeHistory: false` — single-turn API calls
- `onAssistantComplete` — callback when stream finishes
- `thinking` — DeepSeek Flash/Pro swap for refiners

**Presentational wrapper:** `src/components/conversation/ConversationPanel.tsx`

For a minimal new app, start with `threadSlice` only. Add `useConversation` when you need multiple independent chat panels.

---

## 4. State Management

Redux Toolkit slices (no React Context for chat).

### 4.1 `threadSlice` — messages

**File:** `src/store/slices/threadSlice.ts`

| Action | Purpose |
|--------|---------|
| `appendMessage` | Add user or assistant message; auto-title from first user turn |
| `updateMessage` | Patch `content` / `status` during streaming |
| `loadThread` | Hydrate from persistence |
| `startNewChat` | Create empty thread |
| `clearThread` | Wipe messages |

Selectors: `selectActiveMessages`, `selectActiveThread`

### 4.2 `chatUiSlice` — composer UI

**File:** `src/store/slices/chatUiSlice.ts`

| State | Purpose |
|-------|---------|
| `composerDraft` | Current input text |
| `isStreaming` | Disables composer, drives scroll thresholds |
| `isPinnedToBottom` | Auto-scroll toggle |

### 4.3 Model preference

**File:** `src/store/slices/localStorageSlice.ts` + `src/services/localStorage/localStorageService.ts`

- Key: `txtModel`
- Validated against `CHAT_MODELS` on read/write
- `ChatModelPicker` updates this preference

### 4.4 Abort lifecycle

**File:** `src/hooks/useAbortController.ts`

```ts
const { abortRef, begin, abort } = useAbortController(threadId);
const controller = begin();  // aborts any in-flight request first
// pass controller.signal to streamChatTurn
```

Aborts on unmount and when `resetKey` (thread/conversation id) changes.

---

## 5. Send → Stream → Receive Flow

This is the complete pipeline in `MessageComposerContainer.handleSend()`:

```
1. Guard: empty draft + no attachments, or isStreaming → return

2. begin() → new AbortController

3. appendMessage(user) — content, optional apiContent/attachments

4. clearComposerDraft, clear attachments

5. appendMessage(assistant, status: 'streaming', content: '')

6. setIsStreaming(true), setPinnedToBottom(true)

7. resolveThreadSystemPrompt(thread, libraryPrompt)  [async]

8. resolveThreadChatModel(thread, globalTxtModel)

9. streamChatTurn({
     systemPrompt,
     historyMessages: prior messages via apiContentForMessage,
     userContent: attach.buildApiContent(text),
     model,
     signal: controller.signal,
     onChunk → updateMessage(assistant, { content: accumulated }),
     onDone  → updateMessage({ status: 'complete' }), setIsStreaming(false),
     onError → updateMessage({ status: 'error', content: err }), setIsStreaming(false),
   })

10. chatService.streamCompletion → FAL SSE → onChunk per delta
```

---

## 6. The `@` Attachment Pattern

In MatchDate, `@` in the composer means **“attach a text entity”** (library file or upload) — not email or user mentions. The pattern is modeled after Cursor, ChatGPT, and ChatKit: a caret-triggered menu, fuzzy filter, keyboard navigation, and **chips** in the composer that expand to file contents at send time.

> **Key principle:** The LLM has no native file API. Files are read in the browser, wrapped as labeled XML, and injected into the user message string. The transcript shows filenames only.

### 6.1 UX flow

```
User types "@" in composer
        │
        ▼
findAtQuery() detects @ token at caret
        │
        ▼
MentionMenu opens — fuzzy-filtered list:
  1. "Upload file…"
  2. Session text assets (thread.texts)
  3. Library text assets (OPFS, subtype: 'text')
        │
        ▼
User selects item (click, Enter, or Tab)
        │
        ├─ "Upload file…" → hidden <input type="file"> → saveText() → chip
        └─ asset id → loadTextContent() → chip
        │
        ▼
@ token stripped from draft; AttachmentChip appears above textarea
        │
        ▼
On send: buildApiContent(draft) → prose + XML blocks → apiContent
        Transcript: user prose + chips (no XML in bubble)
```

**Three ways to attach** (all produce the same chip type):

| Trigger | Handler |
|---------|---------|
| Type `@` | `useTxtChatAttachments.syncMentionFromCaret` → `MentionMenu` |
| Drop files on composer | `MessageComposer.onFilesDrop` → `addFiles()` |
| Drop library asset ids | `onAssetIdsDrop` → `addAssetIds()` |

Placeholder in composer: `Type a message… (@ to attach)`.

### 6.2 Core hook — `useTxtChatAttachments`

**File:** `src/features/chat/useTxtChatAttachments.ts`

Used by `MessageComposerContainer` and `useConversation`. Key API:

| Export / method | Purpose |
|-----------------|---------|
| `attachments` | Draft attachments (`assetId`, `name`, `mime`, `body`) |
| `syncMentionFromCaret(value, caret)` | Open/update/close menu as user types |
| `onComposerKeyDown(event, draft, setDraft)` | Arrow keys, Enter/Tab select, Escape close |
| `selectMention(id, draft, setDraft)` | Commit selection; strip `@` token |
| `buildApiContent(userText)` | Compose LLM payload from prose + attached files |
| `addFiles(files)` | Read, validate, `saveText`, add chip |
| `addAssetIds(ids)` | Load existing OPFS text asset |
| `removeAttachment(assetId)` | Remove chip before send |
| `clearAttachments()` | Called after successful send |

**Menu item order** (`mentionItems`):

1. `{ id: '__upload__', label: 'Upload file…' }` — always first
2. Session files from `thread.texts` (fuzzy match, not already attached)
3. Library files from `listAssets()` filtered to `subtype === 'text'` (max ~12 rows)

### 6.3 `@` token detection — `atQuery.ts`

**File:** `src/features/chat/attach/atQuery.ts`

```ts
export function findAtQuery(value: string, caret: number): { start: number; query: string } | null
```

Rules:

- Finds the last `@` before the caret
- Ignores `@` that looks like email (`word@` — previous char is `\w` or `.`)
- Query is everything after `@` up to caret; **no spaces** allowed (closes menu)
- `stripAtQuery(value, start, caret)` removes the `@query` token on selection

### 6.4 XML payload — `xmlAttach.ts`

**File:** `src/features/chat/attach/xmlAttach.ts`

**Instruction line** (prepended when files are attached):

```
The user attached file(s). Treat them as source material. Quote by filename when you use them.
```

**Per-file wrapper:**

```xml
<attached_file name="notes.md" mime="text/markdown"><![CDATA[
…file body…
]]></attached_file>
```

**Compose function:**

```ts
composeAttachedUserContent(userText, files): string
// No files → return userText unchanged
// Prose only → instruction + XML blocks
// Prose + files → prose + blank line + instruction + XML blocks
```

**History replay:**

```ts
apiContentForMessage(message) → message.apiContent ?? message.content
```

Prior turns with attachments store `apiContent` on the `ThreadMessage` so history re-sends the full XML payload.

### 6.5 Transcript vs API content split

| Field | Shown in UI | Sent to LLM |
|-------|-------------|-------------|
| `content` | User prose in bubble | Fallback if no `apiContent` |
| `apiContent` | Hidden | Prose + instruction + XML blocks |
| `attachments` | `AttachmentChips` (filename only) | Not sent directly — body is in `apiContent` |

On send (`MessageComposerContainer`):

```ts
dispatch(appendMessage({
  role: 'user',
  content: text,                              // transcript
  apiContent: chips.length > 0 ? apiContent : undefined,
  attachments: chips.length > 0 ? chips : undefined,
}));
// …
userContent: attach.buildApiContent(text),   // current turn API payload
historyMessages: messages.map(m => ({
  role: m.role,
  content: apiContentForMessage(m),         // prior turns include XML
})),
```

### 6.6 Validation & limits

**File:** `src/features/chat/attach/validateTextAttachment.ts`

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAX_TEXT_ATTACHMENT_BYTES` | 200 KB | Per-file cap |
| `CHAT_ATTACH_WARN_CHARS` | 6000 | Warn on small-context models |

- Accept: `text/plain`, `text/markdown` (`.txt`, `.md`) via `TEXT_UPLOAD_ACCEPT`
- Reject binary (NUL bytes, control chars)
- `warnIfContextTight()` notifies when model `contextLength ≤ 8192` and attached chars are large

### 6.7 UI components

| Component | File | Role |
|-----------|------|------|
| `MentionMenu` | `src/components/chat/MentionMenu/MentionMenu.tsx` | Listbox; `role="listbox"`, options with `role="option"` |
| `AttachmentChips` | `src/components/chat/AttachmentChips/AttachmentChips.tsx` | Removable filename chips |
| `MessageComposer` | `src/components/message/MessageComposer/` | Slots for `attachments`, `mentionMenu`, file drop |

**Keyboard while menu open** (`onComposerKeyDown`):

- `ArrowDown` / `ArrowUp` — move highlight
- `Enter` / `Tab` — select item (does **not** send message)
- `Escape` — close menu

**Accessibility:** `mentionActiveId` wires `aria-activedescendant` on the textarea to the active option.

### 6.8 Wiring in `MessageComposerContainer`

```tsx
<MessageComposer
  placeholder="Type a message… (@ to attach)"
  allowEmptySend={attach.attachments.length > 0}
  attachments={<AttachmentChips items={attach.attachments} onRemove={attach.removeAttachment} />}
  mentionOpen={attach.mentionOpen}
  mentionMenu={attach.mentionOpen ? <MentionMenu … /> : null}
  onComposerKeyDown={(e) => attach.onComposerKeyDown(e, draft, setDraft)}
  onChange={(value) => {
    dispatch(setComposerDraft(value));
    attach.syncMentionFromCaret(value, caret);
  }}
  onFilesDrop={(files) => void attach.addFiles(files)}
  onAssetIdsDrop={(ids) => void attach.addAssetIds(ids)}
/>
```

`useConversation` reuses the same hook and wiring for refine-prompt and character-detail chat panels.

### 6.9 Porting the `@` pattern

**Minimum to replicate:**

1. `findAtQuery` / `stripAtQuery` — caret-based `@` detection
2. `composeAttachedUserContent` / `wrapAttachedFile` — XML wrapping
3. `apiContentForMessage` — history replay
4. Draft attachment state + chips UI
5. On send: split `content` (display) vs `apiContent` (API)

**Can skip for v1:** OPFS library, session gallery texts, drag-drop from library assets. A file picker + in-memory attachment list is enough.

See `docs/MD-attach.md` for product research and v1 decisions.

---

## 7. System Prompts

MatchDate sends a **system message** as the first entry in every chat API payload. System prompts control assistant behavior (persona, output format, constraints). There are three layers: a hardcoded fallback, a global active preset, and an optional per-thread override.

### 7.1 Message assembly

`streamChatTurn` builds the API `messages[]` array:

```ts
const apiMessages: ChatMessage[] = [
  { role: 'system', content: systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT },
  ...extraSystemMessages
    .map((content) => content.trim())
    .filter(Boolean)
    .map((content) => ({ role: 'system' as const, content })),
  ...historyMessages,
  { role: 'user', content: userContent },
];
```

| Position | Source | When |
|----------|--------|------|
| First system message | `systemPrompt` arg | Every turn |
| Additional system messages | `extraSystemMessages` | Refiners, protocols (via `useConversation`) |
| History | Prior `user` / `assistant` turns | When `includeHistory: true` |
| Current user | `userContent` | Every turn |

**Default fallback** (`src/features/chat/constants.ts`):

```ts
export const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant.';
```

Used when the resolved prompt is empty after trim.

### 7.2 Three layers of system prompt

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: DEFAULT_SYSTEM_PROMPT                             │
│  Hardcoded fallback if nothing else resolves                │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Global active system prompt (promptsSlice)        │
│  activeSystemPrompt — body of the "enabled" SYS preset      │
│  Set via Prompts view → activate preset                     │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Per-thread override (thread.systemPromptSlug)     │
│  Optional — loads a different preset for this session only  │
│  Empty / unset → use Layer 2                                │
└─────────────────────────────────────────────────────────────┘
```

**Resolution at send time** (`MessageComposerContainer`):

```ts
const librarySystemPrompt = useAppSelector(selectActiveSystemPrompt);
// …
const systemPrompt = await resolveThreadSystemPrompt(thread, librarySystemPrompt);
```

**`resolveThreadSystemPrompt`** (`src/features/chat/sessionSystemPrompt.ts`):

```ts
export async function resolveThreadSystemPrompt(
  thread: Thread | undefined,
  libraryPrompt: string,
): Promise<string> {
  const slug = thread?.systemPromptSlug?.trim();
  if (!slug) return libraryPrompt;           // use global active
  const preset = await loadPreset(slug);
  if (preset.type !== 'system') return libraryPrompt;
  return preset.systemPrompt;
}
```

### 7.3 Redux state — `promptsSlice`

**File:** `src/store/slices/promptsSlice.ts`

| Field | Purpose |
|-------|---------|
| `systemPrompt` | Editor draft in Prompts view (not sent directly) |
| `activeSystemPrompt` | **Body sent with LLM requests** (global default) |
| `activeSystemPresetSlug` | Slug of the active SYS preset |
| `presetCatalog` | List of saved prompt presets |

**Key selector:**

```ts
selectActiveSystemPrompt(state) → state.prompts.activeSystemPrompt
```

**Activating a preset** (`usePromptsEditor.activatePreset`):

```ts
const preset = await setActivePrompt(slug);
dispatch(setActiveSystemPreset({
  slug: preset.slug,
  prompt: preset.systemPrompt,
}));
```

Persisted to OPFS via `persistenceService.setActivePrompt`.

### 7.4 Per-thread override — `thread.systemPromptSlug`

**Type** (`src/types/chat.ts`):

```ts
export interface Thread {
  // …
  /**
   * SYS preset slug for this session.
   * Omitted/empty = use the library's currently enabled system prompt.
   */
  systemPromptSlug?: string;
}
```

**UI:** Session subheader dropdown (`SessionContainer`) lets the user pick:

- **Library default** — `LIBRARY_SYSTEM_PROMPT_VALUE` (`''`) → uses `activeSystemPrompt`
- **Named preset** — any other system prompt slug from the catalog

```ts
export function systemPromptSelectOptions(
  catalog: LibraryItemMeta[],
  activeSlug: string | null,
): DropdownSelectOption[] {
  return [
    { value: LIBRARY_SYSTEM_PROMPT_VALUE, label: activeName },  // global active
    ...otherSystemPresets.map(item => ({ value: item.id, label: item.name })),
  ];
}
```

Stored on the session document as `text.systemPromptSlug` and synced to Redux via `setThreadSystemPromptSlug`.

### 7.5 Override in secondary chats — `useConversation`

For refine-prompt and character-detail panels, `useConversation` supports:

```ts
systemPromptOverride?: string | null;  // replaces global active SYS entirely
extraSystemMessages?: string[];        // appended after system prompt
includeHistory?: boolean;              // default true; false for single-turn refine
```

```ts
const effectiveSystemPrompt =
  systemPromptOverride?.trim() || systemPrompt;  // systemPrompt = selectActiveSystemPrompt

await streamChatTurn({
  systemPrompt: effectiveSystemPrompt,
  extraSystemMessages,
  includeHistory,
  // …
});
```

**Refiner pattern:** When a refiner is selected, `systemPromptOverride` = refiner body (replaces chat SYS for that turn). See `docs/MD-refiners.md`.

### 7.6 Persistence model (for porting)

MatchDate stores prompts as OPFS presets (`kind: 'prompt'`, `type: 'system'`). v1 can omit negative/refiner types:

| Full schema | MatchDate v1 |
|---------|--------------|
| OPFS preset library + activate | Single `systemPrompt` string in config/localStorage |
| Per-thread `systemPromptSlug` | Per-conversation `systemPrompt` field |
| Prompts editor view | Settings page or env var |
| `extraSystemMessages` | Skip unless you need refiners |

**Minimal send:**

```ts
await streamChatTurn({
  systemPrompt: 'You are a helpful assistant.',
  userContent: draft,
  // …
});
```

### 7.7 Files for system prompts

| File | Role |
|------|------|
| `src/features/chat/constants.ts` | `DEFAULT_SYSTEM_PROMPT` |
| `src/features/chat/sessionSystemPrompt.ts` | Resolve thread slug → prompt text |
| `src/store/slices/promptsSlice.ts` | Global active system prompt state |
| `src/features/prompts/containers/usePromptsEditor.ts` | Activate/save presets |
| `src/services/storage/persistenceService.ts` | `loadPreset`, `setActivePrompt`, `savePreset` |
| `src/store/slices/threadSlice.ts` | `setThreadSystemPromptSlug` |

---

## 8. Optional Features

### 8.1 Markdown assistant rendering

**Dependencies:** `react-markdown`, `remark-gfm`, `react-syntax-highlighter`

**Utility:** `src/utils/splitAssistantContent.ts` — splits markdown from embedded JSON fences (character sheets). Omit for a plain-text chat.

---

## 9. Files to Port (Minimal Chat)

Copy or reimplement in this order:

### Tier 1 — Required for working chat

| File | Why |
|------|-----|
| `src/services/fal/falClient.ts` | Auth + `falFetch` |
| `src/services/fal/chatService.ts` | SSE streaming |
| `src/services/fal/models/chat/*` | Model registry |
| `src/services/fal/models/chatTypes.ts` | Model config type |
| `src/types/chat.ts` | Message/thread types |
| `src/features/chat/streamChatTurn.ts` | Turn orchestration |
| `src/features/chat/constants.ts` | `DEFAULT_SYSTEM_PROMPT` |
| `src/hooks/useAbortController.ts` | Request cancellation |
| `src/utils/id.ts` | `createId`, `nowIso` |

### Tier 2 — UI (presentational)

| File | Why |
|------|-----|
| `src/components/message/MessageThread/` | Layout shell |
| `src/components/message/MessageList/` | Scrollable list |
| `src/components/message/MessageBubble/` | Message rendering |
| `src/components/message/MessageComposer/` | Input + send |
| `src/components/message/MessageTextInput/` | Textarea wrapper |
| `src/components/message/AssistantMessageContent/` | Markdown (optional) |
| `src/components/ui/Spinner/`, `IconButton/`, `TextArea/` | Primitives |

### Tier 3 — Wiring (containers + state)

| File | Why |
|------|-----|
| `src/store/slices/threadSlice.ts` | Message state |
| `src/store/slices/chatUiSlice.ts` | Composer UI state |
| `src/features/chat/containers/MessageThreadContainer.tsx` | Thread wiring |
| `src/features/chat/containers/MessageComposerContainer.tsx` | Send pipeline |

### Tier 4 — `@` attachments & system prompts

| File | Why |
|------|-----|
| `src/features/chat/useTxtChatAttachments.ts` | `@` menu hook |
| `src/features/chat/attach/atQuery.ts` | `@` token detection |
| `src/features/chat/attach/xmlAttach.ts` | XML payload composition |
| `src/features/chat/attach/validateTextAttachment.ts` | File validation |
| `src/components/chat/MentionMenu/` | `@` picker UI |
| `src/components/chat/AttachmentChips/` | Filename chips |
| `src/store/slices/promptsSlice.ts` | Global active system prompt |
| `src/features/chat/sessionSystemPrompt.ts` | Per-thread prompt resolution |

### Tier 5 — Nice to have

| File | Why |
|------|-----|
| `src/components/chat/ChatModelPicker/` | Model picker UI |
| `src/features/conversations/useConversation.ts` | Multi-panel chat |
| `src/components/conversation/ConversationPanel.tsx` | Refiner-style panels |
| `src/features/prompts/containers/usePromptsEditor.ts` | Full prompts library editor |

### Tests to reference

| File | Covers |
|------|--------|
| `src/services/fal/chatService.test.ts` | SSE parsing, auth, thinking flags, abort |
| `src/services/fal/models/chat/chatModels.test.ts` | Registry validation |
| `src/features/chat/streamChatTurn.test.ts` | Turn orchestration |
| `scripts/fal-phase0-spike.mjs` | Standalone FAL chat spike (`npm run fal:spike`) |

---

## 10. Minimal New-App Checklist

1. **Env:** `VITE_FAL_KEY=...` (or your bundler's equivalent)
2. **Auth:** `Authorization: Key ${key}` on all FAL HTTP calls
3. **Endpoint:** `POST https://fal.run/openrouter/router/openai/v1/chat/completions`
4. **Body:** `{ model, messages, stream: true, response_format: { type: 'text' } }`
5. **SSE:** Parse `data:` lines; read `choices[0].delta.content`; stop at `[DONE]`
6. **Model registry:** Map app model ids → OpenRouter slugs (`ChatModelConfig` pattern)
7. **State:** Messages array + streaming flag + composer draft
8. **Send flow:** User message → assistant placeholder (`streaming`) → accumulate chunks → `complete`
9. **Abort:** `AbortSignal`; treat abort as done with partial text
10. **UI:** Scrollable message list + textarea composer
11. **System prompt:** Pass as first `messages[]` entry with `role: 'system'`
12. **`@` attach (optional):** Read files client-side → XML wrap → `apiContent` vs `content` split

### Smallest possible integration (no Redux, no shared UI components)

```ts
async function sendChat(messages: { role: string; content: string }[]) {
  const res = await fetch(
    'https://fal.run/openrouter/router/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Key ${import.meta.env.VITE_FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-v4-flash',
        messages,
        stream: true,
      }),
    },
  );

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    for (const line of buffer.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return text;
      const chunk = JSON.parse(payload);
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) { text += delta; onUpdate(text); }
    }
  }
  return text;
}
```

Then layer in MatchDate's registry, `streamChatTurn`, Redux slices, and UI components as needed.

---

## 11. Dependencies

From `package.json` — chat-relevant only:

| Package | Use |
|---------|-----|
| `react`, `react-dom` | UI |
| `@reduxjs/toolkit`, `react-redux` | State (or replace with your store) |
| `react-router-dom` | Routing (optional for minimal chat) |
| `react-markdown`, `remark-gfm` | Assistant markdown |
| `react-syntax-highlighter` | Code blocks in markdown |
| `@fal-ai/client` | Optional; only needed for `fal.storage.upload` |

---

## 12. What MatchDate Does NOT Do for Chat

- No server-side chat proxy or session API
- No WebSocket — SSE over HTTP only
- No native file upload to the LLM — text files are read client-side and injected as message content
- No built-in conversation memory beyond the messages array you send
- `@fal-ai/client` is not used for chat completions (raw `fetch` only)

---

## 13. Routing Reference

For context — v1 routes:

| Route | Behavior |
|-------|----------|
| `/session/:sessionId` | Primary chat host |
| `/chat`, `/chat/:threadId` | Legacy redirects → session |

Chat renders when `activeGenerator === 'text'` inside `SessionAssetsContainer`.
