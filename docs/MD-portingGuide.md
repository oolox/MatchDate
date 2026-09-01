# MatchDate — Build Guide (Start Here)

> **Read this document first.** It describes how to build MatchDate — a browser-only chat app with **streaming chat (FAL.ai)** and **browser persistence (OPFS)**. Deep dives live in the companion docs; use this as the map and build order.

**Last updated:** 2026-09-01  
**Repo:** MatchDate (`c:\Code\MatchDate`)  
**Stack:** Vite + React SPA with chat, system prompts, and a library sidebar.

---

## 1. What You Are Building

A **browser-only** chat app with:

| Capability | MatchDate pattern |
|------------|-------------------|
| Stream LLM replies | FAL OpenRouter SSE via `fetch` (no chat backend) |
| Chat UI | Message list + composer + streaming placeholders |
| System prompts | OPFS presets + global active + per-session override |
| Save/load chats | `SessionDocument` under `/matchdate/prompts/sessions/` |
| Library sidebar | `LibraryBrowser` listing sessions and prompts |
| `@` text attach (optional) | Client-side file read → XML in `apiContent` |

**Not in scope for v1** (skip unless you need them later): image/video generation, characters, game map, refiners, fal billing proxy.

> **OPFS path naming:** `sessions/` (plural) = **chat session** JSON files. `session/` (singular) = **system prompt preset** files. Do not swap them.

---

## 2. Documentation Map

| Order | Document | When to read |
|-------|----------|--------------|
| **1** | **`docs/MD-portingGuide.md`** (this file) | Bootstrap, phases, patterns |
| 2 | [`docs/MD-Chat-Feature.md`](./MD-Chat-Feature.md) | FAL API, chat UI, `@` attachments, system prompts at send time |
| 3 | [`docs/MD-Filesystem.md`](./MD-Filesystem.md) | OPFS layout, save/load, library catalog, `LibraryBrowser` |

All three docs live in this repo's `docs/` folder.

---

## 3. End-to-End Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│  MatchDate (Vite SPA)                                                     │
├──────────────────────────────────────────────────────────────────────────┤
│  Routes: /  /session/:id  /prompts                                       │
│                                                                          │
│  ┌─────────────────────┐    ┌─────────────────────┐                   │
│  │  Chat column        │    │  LibraryBrowser      │                   │
│  │  MessageThread      │    │  sessions + prompts  │                   │
│  │  MessageComposer    │    │                      │                   │
│  └──────────┬──────────┘    └──────────┬──────────┘                   │
│             │ Redux                      │ useLibraryCatalog             │
│             ▼                            ▼                              │
│  threadSlice + chatUiSlice + promptsSlice + sessionsSlice               │
│             │                            │                              │
│             ▼                            ▼                              │
│  streamChatTurn ──► chatService.streamCompletion ──► FAL SSE            │
│  applyThreadToSession ◄──► saveSessionDocument / loadSessionDocument    │
│  loadPromptsState / savePreset / setActivePrompt                        │
│             │                            │                              │
│             ▼                            ▼                              │
│  FileStorageService (OPFS)  /matchdate/...                                │
└──────────────────────────────────────────────────────────────────────────┘
```

**Data flow on send:**

1. User submits → append user message + streaming assistant placeholder (Redux)
2. `resolveThreadSystemPrompt` → build `messages[]`
3. `streamChatTurn` → `chatService.streamCompletion` → SSE chunks → `updateMessage`
4. On complete → merge thread into `SessionDocument` → `saveSessionDocument` → bump library catalog

---

## 4. Scaffold the App

### 4.1 Create project

```bash
npm create vite@latest matchdate -- --template react-ts
cd matchdate
```

### 4.2 Install dependencies

**Minimum (chat + storage + routing):**

```bash
npm install react react-dom react-router-dom @reduxjs/toolkit react-redux
npm install react-markdown remark-gfm react-syntax-highlighter
npm install -D vitest happy-dom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/react-syntax-highlighter
```

**Optional:** `@fal-ai/client` — only if you add fal storage upload later; chat uses raw `fetch`.

### 4.3 Environment

Create `.env` (and `.env.example`):

```env
VITE_FAL_KEY=your-fal-api-key-here
```

Get a key from [fal.ai](https://fal.ai). The key is exposed in the browser bundle — acceptable for a personal/local tool; use a backend proxy for production.

### 4.4 Vite config

`vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: {
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
});
```

Add `"test": "vitest run"` to `package.json` scripts.

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

### 4.5 Suggested folder structure

**Containers wire state; components are presentational:**

```
src/
  main.tsx
  App.tsx
  AppRoutes.tsx
  AppBootstrap.tsx              # OPFS hydrate on mount

  hooks/
    useAbortController.ts       # cancel in-flight streams

  test/
    setup.ts                    # vitest + jest-dom

  types/
    chat.ts                     # ThreadMessage, Thread, ChatMessage
    session.ts                  # SessionDocument, sessionToThread
    opfsDoc.ts                  # Schema v2 envelope

  services/
    localStorage.ts             # non-OPFS prefs (sort, model)
    fal/
      falClient.ts              # getFalApiKey, falFetch
      chatService.ts            # streamCompletion, SSE parser
      models/chat/              # Model registry
    storage/
      types.ts                  # FileStorageService
      localOpfsStorage.ts
      inMemoryFileStorage.ts    # tests
      paths.ts                  # OPFS_ROOT = '/matchdate'
      persistenceService.ts     # facade
      hydrateDocs.ts            # asset register/hydrate (text only for v1)
      libraryIndex.ts
      libraryRegistry.ts
      textStorage.ts            # @ attachments

  store/
    index.ts                    # configureStore — compose all slices
    hooks.ts                    # useAppDispatch, useAppSelector
    slices/
      threadSlice.ts
      chatUiSlice.ts
      promptsSlice.ts
      sessionsSlice.ts
      appShellSlice.ts          # libraryEpoch
      localStorageSlice.ts      # sort prefs, txtModel

  features/
    chat/
      streamChatTurn.ts
      constants.ts
      sessionSystemPrompt.ts
      containers/
        MessageThreadContainer.tsx
        MessageComposerContainer.tsx
      attach/                   # @ menu (phase 5)
      useTxtChatAttachments.ts
    session/
      useSessionEditor.ts
    library/
      openLibraryGenerator.ts

  components/
    message/                    # MessageThread, MessageList, MessageBubble, MessageComposer
    library/                    # LibraryBrowser, LibraryList
    layout/ColumnSplit/
    ui/                         # Spinner, IconButton, TextArea
    notification/               # NotificationProvider

  views/
    SessionView/
    PromptsView/

  styles/
    tokens.css
    global.css
```

**OPFS branding constants** (`paths.ts`):

```ts
export const OPFS_ROOT = '/matchdate';
// sessionDocumentPath(id) → /matchdate/prompts/sessions/matchDate-{id}.json
// presetPath(slug)      → /matchdate/prompts/session/{slug}.json
```

### 4.6 App shell

**`main.tsx`:**

```tsx
<Provider store={store}>
  <NotificationProvider>
    <AppBootstrap>
      <App />
    </AppBootstrap>
  </NotificationProvider>
</Provider>
```

**`AppBootstrap.tsx` grows per phase** — only wire what exists so far:

| Phase | On mount |
|-------|----------|
| **1** | `dispatch(hydrateLocalStorage(loadLocalStorageState()))` only |
| **2** | `reconcileLibrary()` → `loadSessionsState()` → `dispatch(hydrateSessions(...))` → load active session from `config.activeSessionId` → `requestPersistentStorage()` |
| **3** | Add `loadPromptsState()` → `dispatch(hydratePrompts(...))` |
| **4** | Same as 3; library sidebar reads catalog via `useLibraryCatalog` |

**Phase 3+ example:**

```ts
await reconcileLibrary();
const [prompts, sessions] = await Promise.all([
  loadPromptsState(),
  loadSessionsState(),
]);
dispatch(hydratePrompts(prompts));
dispatch(hydrateSessions(sessions));
dispatch(hydrateLocalStorage(loadLocalStorageState()));
await requestPersistentStorage();
// load active session from config.activeSessionId if set
```

See [`MD-Filesystem.md` §9](./MD-Filesystem.md) for the full boot sequence.

### 4.7 Routes (minimal)

| Route | View | Purpose |
|-------|------|---------|
| `/` | redirect → `/session/:activeId` or new id | Entry |
| `/session/:sessionId` | `SessionView` | Chat + library |
| `/prompts` | `PromptsView` | Edit/activate system prompts |

### 4.8 Styling

Define CSS variables in `src/styles/tokens.css` and `global.css`. Components use **CSS Modules** (`*.module.css`) — no MUI/Chakra.

Minimum tokens for chat: `--color-bg-app`, `--color-bubble-sent`, `--color-text-primary`, `--space-*`, `--radius-bubble`.

---

## 5. Implementation Phases

Work in order. Each phase should run in the browser before moving on.

### Phase 0 — Spike (no UI)

**Goal:** Prove FAL streaming works.

1. Add `VITE_FAL_KEY` to `.env`
2. Add `falClient.ts` + `chatService.ts`
3. Run a one-shot `fetch` + SSE parse in a script or test

**Done when:** You see streamed text in console.

**Reference:** [`MD-Chat-Feature.md` §2](./MD-Chat-Feature.md)

---

### Phase 1 — Chat UI (memory only)

**Goal:** Send/receive in UI without persistence.

| File | Notes |
|------|-------|
| `types/chat.ts` | Message types |
| `services/fal/falClient.ts` | Auth |
| `services/fal/chatService.ts` | SSE |
| `services/fal/models/chat/*` | 4 models; default Flash |
| `features/chat/streamChatTurn.ts` | Turn builder |
| `features/chat/constants.ts` | `DEFAULT_SYSTEM_PROMPT` |
| `hooks/useAbortController.ts` | Cancel in-flight |
| `store/index.ts`, `store/hooks.ts` | Redux store |
| `store/slices/threadSlice.ts` | Messages |
| `store/slices/chatUiSlice.ts` | Draft, streaming, scroll pin |
| `components/message/*` | Thread, list, bubble, composer |
| `components/notification/*` | `NotificationProvider` |
| `features/chat/containers/*` | Wire send pipeline |

**Hardcode** `systemPrompt: 'You are a helpful assistant.'` in `MessageComposerContainer` — no OPFS yet.

**Done when:** You can type, stream a reply, abort mid-stream, and see markdown in assistant bubbles.

**Reference:** [`MD-Chat-Feature.md` §3–5](./MD-Chat-Feature.md)

---

### Phase 2 — OPFS persistence (chats)

**Goal:** Sessions survive refresh.

| Area | Key files |
|------|-----------|
| Storage driver | `localOpfsStorage.ts`, `types.ts`, `paths.ts` |
| Session types | `types/session.ts` — use slim `ChatDocument` ([`MD-Filesystem.md` §14](./MD-Filesystem.md)) if skipping img/vid |
| Facade | `persistenceService.ts` — `saveSessionDocument`, `loadSessionDocument`, `setActiveSession` |
| Bridge | `sessionToThread`, `applyThreadToSession` |
| Boot | `AppBootstrap`, `loadSessionsState`, `config.activeSessionId` |
| Editor | `useSessionEditor` — load on route change, save on blur/button |

> **`setActiveSession` vs `setActivePrompt`:** `setActiveSession(id)` sets which **chat session** is active (stored in `config.activeSessionId`). `setActivePrompt(slug)` sets which **system prompt preset** is active. Do not confuse them.

**OPFS paths (minimum):**

```
/matchdate/config.json
/matchdate/library.json
/matchdate/prompts/sessions/matchDate-{id}.json    ← chat sessions (plural)
```

**Save trigger:** After assistant turn completes, or explicit Save — merge Redux thread → `applyThreadToSession` → `saveSessionDocument`.

**Done when:** Refresh browser; messages and session title restore.

**Reference:** [`MD-Filesystem.md` §5](./MD-Filesystem.md)

---

### Phase 3 — System prompts

**Goal:** Editable presets; active prompt sent with every chat turn.

| Area | Key files |
|------|-----------|
| Preset type | `SystemPromptPreset` in `storage/types.ts` |
| API | `savePreset`, `loadPreset`, `setActivePrompt`, `loadPromptsState` |
| Redux | `promptsSlice.ts` — `activeSystemPrompt` |
| Resolution | `sessionSystemPrompt.ts` — `resolveThreadSystemPrompt` |
| UI | `PromptsView` + `PromptsContainer` + `usePromptsEditor` |
| Wire send | `MessageComposerContainer` uses `selectActiveSystemPrompt` |

**OPFS path:** `/matchdate/prompts/session/{slug}.json` ← prompt presets (singular)

**Seed on first boot:** slug `default`, body `You are a helpful assistant.`

**Done when:** Edit prompt in `/prompts`, activate it, new chat turns use that system message.

**Reference:** [`MD-Chat-Feature.md` §7](./MD-Chat-Feature.md), [`MD-Filesystem.md` §6](./MD-Filesystem.md)

---

### Phase 4 — Library sidebar

**Goal:** List, open, favorite, delete sessions and prompts.

| Area | Key files |
|------|-----------|
| Catalog | `libraryIndex.ts`, `libraryRegistry.ts` |
| UI | `LibraryBrowser`, `LibrarySidebar`, `LibraryList`, `useLibraryCatalog` |
| Layout | `ColumnSplit` |
| Navigation | `openLibraryGenerator.ts` — `loadSessionIntoApp` |
| Refresh | `appShellSlice.libraryEpoch`, `bumpLibraryEpoch` after save |

**Session view layout:**

```tsx
<ColumnSplit
  left={<MessageThreadContainer threadId={sessionId} />}
  right={
    <LibraryBrowser
      loadableKinds={['session', 'prompt']}
      catalogEpoch={catalogEpoch + libraryEpoch}
      onLoad={(item) => /* session or navigate to prompts */}
    />
  }
/>
```

**Done when:** Sidebar lists saved chats; click loads session; prompts open in `/prompts`.

**Reference:** [`MD-Filesystem.md` §11](./MD-Filesystem.md)

---

### Phase 5 — `@` attachments (optional)

**Goal:** Attach `.txt`/`.md` via `@` menu; XML payload to LLM; chips in UI.

- `useTxtChatAttachments.ts`
- `attach/atQuery.ts`, `xmlAttach.ts`, `validateTextAttachment.ts`
- `textStorage.ts` + `/matchdate/assets/text/`
- `MentionMenu`, `AttachmentChips`

**Done when:** `@` opens menu, file attaches as chip, model receives XML blocks in `apiContent`.

**Reference:** [`MD-Chat-Feature.md` §6](./MD-Chat-Feature.md), [`MD-Filesystem.md` §7](./MD-Filesystem.md)

---

## 6. Common Patterns (Follow These)

### 6.1 Container / presentational split

```tsx
// Container — Redux, API, handlers
export function MessageComposerContainer({ threadId }) {
  const dispatch = useAppDispatch();
  const handleSend = async () => { /* streamChatTurn */ };
  return <MessageComposer value={draft} onSend={handleSend} />;
}

// Presentational — props only
export function MessageComposer({ value, onSend, isStreaming }) { /* UI */ }
```

### 6.2 Streaming message lifecycle

```
appendMessage(user, status: 'complete')
appendMessage(assistant, status: 'streaming', content: '')
setIsStreaming(true)
streamChatTurn({ onChunk → updateMessage(content), onDone → status: 'complete' })
setIsStreaming(false)
```

### 6.3 Abort = success with partial text

Pass `AbortSignal` to `streamCompletion`. On `AbortError`, call `onDone()` — do not mark as error.

### 6.4 Transcript vs API content (`@` attach)

| Field | UI | LLM |
|-------|-----|-----|
| `content` | User prose in bubble | Fallback |
| `apiContent` | Hidden | Prose + XML file blocks |
| `attachments` | Filename chips | Not sent directly |

History replay: `apiContentForMessage(message)`.

### 6.5 System prompt resolution

```
Per turn:
  systemPrompt = await resolveThreadSystemPrompt(thread, activeSystemPrompt)
  streamChatTurn({ systemPrompt, historyMessages, userContent })
```

Priority: `thread.systemPromptSlug` → load preset from OPFS → else global `activeSystemPrompt` → else `DEFAULT_SYSTEM_PROMPT`.

### 6.6 Save session

```ts
const merged = applyThreadToSession(currentSessionDoc, liveThreadFromRedux);
await saveSessionDocument(merged);
dispatch(bumpLibraryEpoch());
```

Preserve `createdAt` on update; always bump `updatedAt`.

### 6.7 Catalog vs content

- **Entity JSON files** = source of truth for messages and prompt bodies
- **`library.json`** = index for list UI only — rebuild via `reconcileLibrary()` on boot if needed

### 6.8 Redux slices (minimal app)

| Slice | Purpose |
|-------|---------|
| `thread` | Active messages, title, modelId, systemPromptSlug |
| `chatUi` | Composer draft, isStreaming, isPinnedToBottom |
| `prompts` | activeSystemPrompt, preset catalog |
| `sessions` | selectedSessionId, dirty/saved markers |
| `appShell` | libraryEpoch |
| `localStorage` | txtModel, library sort prefs |

No dedicated `librarySlice` — catalog lives in `useLibraryCatalog` React state.

### 6.9 Typed hooks

```ts
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

---

## 7. Implementation Checklist

Files to create under `src/`:

### Chat stack

- [ ] `services/fal/falClient.ts`
- [ ] `services/fal/chatService.ts`
- [ ] `services/fal/models/chat/**`
- [ ] `features/chat/streamChatTurn.ts`
- [ ] `features/chat/constants.ts`
- [ ] `features/chat/sessionSystemPrompt.ts`
- [ ] `features/chat/containers/MessageThreadContainer.tsx`
- [ ] `features/chat/containers/MessageComposerContainer.tsx`
- [ ] `components/message/**` (thread, list, bubble, composer, assistant content)
- [ ] `components/notification/**` (`NotificationProvider`)
- [ ] `hooks/useAbortController.ts`
- [ ] `store/index.ts`, `store/hooks.ts`
- [ ] `store/slices/threadSlice.ts`
- [ ] `store/slices/chatUiSlice.ts`
- [ ] `utils/id.ts`, `utils/formatFailure.ts`, `utils/splitAssistantContent.ts`

### Storage stack

- [ ] `services/storage/**` (types, paths, localOpfsStorage, persistenceService, libraryIndex, libraryRegistry, parseStorageJson, textStorage)
- [ ] `services/localStorage.ts`
- [ ] `types/opfsDoc.ts`, `types/session.ts`, `types/chat.ts`
- [ ] `AppBootstrap.tsx`
- [ ] `paths.ts` — `OPFS_ROOT = '/matchdate'`, `matchDate-` file prefix

### Library UI

- [ ] `components/library/**`
- [ ] `components/layout/ColumnSplit/**`
- [ ] `features/library/openLibraryGenerator.ts`
- [ ] `services/library/searchLibraryItems.ts`

### Prompts UI

- [ ] `features/prompts/**`
- [ ] `views/PromptsView/**`
- [ ] `store/slices/promptsSlice.ts`

### Tests (recommended)

- [ ] `src/test/setup.ts`
- [ ] `services/fal/chatService.test.ts`
- [ ] `features/chat/streamChatTurn.test.ts`
- [ ] `services/storage/persistSessionDocument.test.ts`

After adding files, **grep for stale imports** and remove anything tied to img/vid/game/characters.

---

## 8. Verification Checklist

Run after each phase:

| # | Test | Phase |
|---|------|-------|
| 1 | `npm run dev` — app loads without console errors | 0+ |
| 2 | Send message → streamed reply appears | 1 |
| 3 | Abort mid-stream → partial text kept | 1 |
| 4 | Refresh → messages persist | 2 |
| 5 | New session → appears in OPFS + library index | 2 |
| 6 | Change system prompt → next reply follows it | 3 |
| 7 | Library click loads different session | 4 |
| 8 | Favorite/delete updates sidebar | 4 |
| 9 | `@` attach → model references file content | 5 |
| 10 | `npm test` — core service tests pass | any |

**Manual OPFS inspect:** DevTools → Application → Storage → Origin Private File System → `matchdate/`.

---

## 9. AI Conversation Bootstrap

Paste this into a **new Cursor chat** (attach the three docs):

```
I am building MatchDate — a Vite React chat app.

Read these docs in order:
1. docs/MD-portingGuide.md  (build phases)
2. docs/MD-Chat-Feature.md  (FAL + chat UI)
3. docs/MD-Filesystem.md    (OPFS + library)

I am on Phase [N]. Implement Phase [N] per the build guide.
Repo: c:\Code\MatchDate

Constraints:
- Browser-only: FAL key in VITE_FAL_KEY, no chat backend
- OPFS under /matchdate (sessions/ = chats, session/ = prompt presets)
- Session file prefix: matchDate-{id}
- Container/presentational split, Redux Toolkit, CSS Modules
- Skip image/video/game/characters unless I ask
```

Replace `[N]` with your current phase (0–5).

---

## 10. Key APIs Quick Reference

### Chat (FAL)

```ts
// Endpoint
POST https://fal.run/openrouter/router/openai/v1/chat/completions
Authorization: Key ${VITE_FAL_KEY}

// Body
{ model: 'deepseek/deepseek-v4-flash', messages, stream: true, response_format: { type: 'text' } }

// Entry point
await streamChatTurn({ systemPrompt, historyMessages, userContent, model, signal, onChunk, onDone, onError })
```

### Persistence

```ts
await saveSessionDocument(sessionDoc)
const { session } = await loadSessionDocument(id)
await setActiveSession(sessionId)          // active chat session
await savePreset({ name, systemPrompt, type: 'system' })
await setActivePrompt(slug)                // active system prompt preset
const promptsState = await loadPromptsState()
const items = await listLibrary()
```

### Redux → disk bridge

```ts
const thread = sessionToThread(session)
dispatch(loadThread(thread))
// ... user chats ...
const saved = await saveSessionDocument(applyThreadToSession(doc, thread))
```

---

## 11. Pitfalls

| Pitfall | Fix |
|---------|-----|
| `Missing VITE_FAL_KEY` | Add `.env`, restart `npm run dev` |
| SSE parse errors | Ensure `data:` line parsing keeps a buffer for partial lines |
| Messages lost on refresh | Wire `saveSessionDocument` after turns or on explicit save |
| Library empty after save | Ensure `saveSessionDocument` upserts the library index internally; then `dispatch(bumpLibraryEpoch())` |
| System prompt ignored | Use `resolveThreadSystemPrompt`, not hardcoded string |
| Wrong OPFS folder | `sessions/` = chats, `session/` = prompt presets |
| Confused active APIs | `setActiveSession` = chat session; `setActivePrompt` = system prompt |
| OPFS not available | Fall back to `inMemoryFileStorage` in tests; require HTTPS or localhost |
| Entire file in chat bubble | Use `content` for display, `apiContent` for API only |
| `library.json` out of sync | Call `reconcileLibrary()` on boot |

---

## 12. What MatchDate Does NOT Need (v1)

- Backend server or database
- `@fal-ai/client` for chat (raw `fetch` only)
- Image/video generators, character workflows, game map
- Full `SessionDocument` img/video/game fields (use slim `ChatDocument` — see `MD-Filesystem.md` §14)
- fal billing proxy unless you add credits UI

---

## 13. Next Steps

1. Confirm all three docs are in `docs/` (`MD-portingGuide.md`, `MD-Chat-Feature.md`, `MD-Filesystem.md`)
2. Scaffold with §4
3. Complete **Phase 0** spike
4. Work phases 1 → 4 for a usable chat app with library
5. Add Phase 5 (`@` attach) when core flow is stable
6. Use §9 prompt template in new AI sessions for incremental implementation

For detail on any topic, open the linked section in the companion docs.
