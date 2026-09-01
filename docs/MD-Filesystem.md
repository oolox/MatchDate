# MatchDate — Filesystem Port Guide (OPFS / ODSF)

> **Purpose:** Document MatchDate's browser filesystem layer — **chat persistence**, **system prompt storage**, and the **asset library UI**.

**Last updated:** 2026-08-31  
**Scope:** OPFS storage services, chat/session save-load, preset save-load, library catalog and browser UI.  
**Naming:** The project label is **ODSF**; the underlying API is browser **OPFS** (Origin Private File System).

Related: `docs/MD-ODSF.md` (scaling research), `docs/MD-Chat-Feature.md` (chat UI + system prompt usage), `docs/MD-attach.md` (`@` text attachments).

---

## 1. Architecture Overview

All app data lives under `/matchdate` in the origin's private file system (`navigator.storage.getDirectory()`). There is **no backend database** — the browser is the source of truth.

```
┌─────────────────────────────────────────────────────────────────┐
│  UI Layer                                                        │
│  LibraryBrowser, SessionContainer, PromptsContainer, …           │
└────────────────────────────┬────────────────────────────────────┘
                             │ persistenceService (facade)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Catalog index          │  Entity JSON + blobs                  │
│  library.json           │  /prompts/sessions/, /prompts/session/│
│  (list UI, favorites)   │  /assets/img|vid|text/, metadata/   │
└─────────────────────────┴─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  FileStorageService                                              │
│  localOpfsStorage (production) | inMemoryFileStorage (tests)   │
└─────────────────────────────────────────────────────────────────┘
```

**Three roles of on-disk files:**

| File | Role |
|------|------|
| Entity JSON + blobs | **Source of truth** for content (messages, prompt bodies, images) |
| `library.json` | Catalog index for list UI and favorites — **not** blob storage |
| `config.json` | Active ids/slugs (active system prompt, active session) + schema gate |

**Critical rule:** Never treat `library.json` as authoritative for message bodies or file contents. Always read entity JSON files and blobs directly.

> **Path naming:** `prompts/sessions/` (plural) = **chat session** JSON files. `prompts/session/` (singular) = **system prompt preset** files. Do not swap them.

---

## 2. Storage Service (`FileStorageService`)

### 2.1 Interface

**File:** `src/services/storage/types.ts`

```ts
export interface FileStorageService {
  read(path: StoragePath): Promise<string>;
  write(path: StoragePath, content: string): Promise<void>;
  readBinary(path: StoragePath): Promise<Blob>;
  writeBinary(path: StoragePath, content: Blob | ArrayBuffer | Uint8Array): Promise<void>;
  update(path: StoragePath, updater: (current: string) => string): Promise<void>;
  delete(path: StoragePath): Promise<boolean>;
  list(directory: StoragePath): Promise<FileEntry[]>;
  exists(path: StoragePath): Promise<boolean>;
}
```

### 2.2 Implementations

| Implementation | File | When |
|----------------|------|------|
| `localOpfsStorage` | `src/services/storage/localOpfsStorage.ts` | Production — walks path segments under OPFS root |
| `inMemoryFileStorage` | `src/services/storage/inMemoryFileStorage.ts` | Tests / OPFS unavailable |

**Factory:** `getFileStorageService()` in `src/services/storage/index.ts`.

### 2.3 OPFS driver pattern

```ts
// localOpfsStorage.ts
const root = await navigator.storage.getDirectory();
// normalizePath('/matchdate/prompts/sessions/foo.json')
//   → ['matchdate', 'prompts', 'sessions', 'foo.json']
// getDirectoryHandle per segment, then getFileHandle for the file
```

Paths are POSIX-style strings starting with `/matchdate`. `normalizePath()` rejects `..` segments.

### 2.4 Errors

```ts
export class StorageError extends Error {
  readonly code: StorageErrorCode;
  // NOT_FOUND | ALREADY_EXISTS | QUOTA_EXCEEDED | PARSE_ERROR | …
}
```

All parsers use `parseStorageJson()` (`src/services/storage/parseStorageJson.ts`) for consistent `PARSE_ERROR` messages with file path context.

---

## 3. Directory Layout

**Path constants:** `src/services/storage/paths.ts`

```
/matchdate/
  config.json                    # Active slugs + active session id
  library.json                   # Catalog index (items[])

  assets/
    img/                         # Image blobs: matchDate-img-{id}.png
    vid/                         # Video blobs: matchDate-vid-{id}.mp4 (+ poster/end JPEGs)
    text/                        # Text blobs: matchDate-text-{id}.txt
    metadata/                    # Asset JSON: matchDate-asset-{id}.json

  prompts/
    sessions/                    # ★ Unified SessionDocument (canonical chat)
    session/                     # ★ System / negative / refiner presets
    txt/                         # Legacy TXT-only chat threads (dual-read)
    img/, vid/                   # Legacy generator docs (dual-read)
    image/, video/, ref2v/       # Older legacy paths (migrate source)

  workflows/
    characters/                  # Character workflow JSON

  chat/sessions/                 # Legacy TXT path (dual-read → migrate)
```

### Key path builders

| Builder | Resolves to |
|---------|-------------|
| `sessionDocumentPath(id)` | `/matchdate/prompts/sessions/matchDate-{id}.json` |
| `presetPath(slug)` | `/matchdate/prompts/session/{slug}.json` |
| `txtPromptPath(id)` | `/matchdate/prompts/txt/matchDate-{id}.json` |
| `textPath(id)` | `/matchdate/assets/text/matchDate-text-{id}.txt` |
| `assetPath(id)` | `/matchdate/assets/metadata/matchDate-asset-{id}.json` |
| `CONFIG_PATH` | `/matchdate/config.json` |
| `LIBRARY_PATH` | `/matchdate/library.json` |

---

## 4. Document Schema (OPFS v2)

**File:** `src/types/opfsDoc.ts` — `OPFS_SCHEMA_VERSION = 2`

Every JSON document shares an envelope:

```ts
export interface OpfsDocBase {
  schemaVersion: number;
  type: OpfsDocType;       // 'generator' | 'prompt' | 'asset' | 'workflow' | …
  subtype: OpfsDocSubtype;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  refs?: OpfsDocRefs;      // cross-document pointers
}

export interface OpfsDocRefs {
  assets?: string[];       // asset ids only on disk
  prompts?: string[];
  workflows?: string[];
  chats?: string[];
}
```

### Type taxonomy

| `type` | `subtype` | Library `kind` | Purpose |
|--------|-----------|----------------|---------|
| `generator` | `session` | `session` | Unified session (chat + img/vid/game) |
| `generator` | `txt` | `txtPrompt` | Legacy chat-only thread |
| `prompt` | `systemPrompt` | `prompt` | System (SYS) preset |
| `prompt` | `negativePrompt` | `prompt` | Negative (NEG) preset |
| `prompt` | `refinerPrompt` | `prompt` | Refiner preset |
| `asset` | `image` / `video` / `text` / `frame` | `asset` | Blob metadata |
| `workflow` | `character` | `character` | Character sheet workflow |

Kind ↔ type mapping: `src/services/storage/opfsKindMap.ts` (`kindToTypeSubtype`, `typeSubtypeToKind`).

### Asset pointer pattern (hydration)

On **disk**, parent documents store only `refs.assets: string[]` — no embedded image/video/text arrays.

On **load**, `hydrateDocs.ts` resolves ids → full ref objects from `/assets/metadata/`.

On **save**, `registerAssetsFrom*` ensures asset metadata rows exist, then `to*DiskShape` strips embedded arrays.

```
In-memory (UI)                    On disk (OPFS)
─────────────────                 ─────────────────
session.assets.images: [...]  →   session.assets.refs.assets: ['id1','id2']
session.assets.texts: [...]       (blobs under /assets/img/, /assets/text/)
```

---

## 5. Loading & Saving Chats

### 5.1 Data model

**Chat messages** live inside a unified `SessionDocument`:

```ts
// src/types/session.ts
export interface SessionDocument {
  schemaVersion: number;
  type: 'generator';
  subtype: 'session';
  id: string;
  name: string;
  text: {
    messages: ThreadMessage[];      // ★ chat transcript
    systemPromptSlug?: string;      // per-session SYS override
    modelId?: string;               // per-session model override
  };
  assets: SessionAssets;            // gallery: images, videos, texts
  image: SessionImageFields;        // IMG generator state
  video: SessionVideoFields;        // VID generator state
  game: SessionGameFields;
  tags: SessionTags;
  createdAt: string;
  updatedAt: string;
}
```

**Message type** (`src/types/chat.ts`):

```ts
export interface ThreadMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;           // transcript display
  apiContent?: string;       // LLM payload (XML attachments)
  attachments?: ChatTextAttachment[];
  status?: MessageStatus;
  createdAt: string;
}
```

**Redux bridge:**

```ts
sessionToThread(session)    // SessionDocument → Thread (chat UI)
applyThreadToSession(session, thread)  // merge live thread back before save
```

### 5.2 Save flow

```
UI: SessionDocument (with live messages from Redux thread)
  │
  ├─ registerAssetsFromSession(storage, doc)
  │     ensureImageAsset / ensureVideoAsset / ensureTextAsset
  │     → writes /assets/metadata/ rows, returns asset id[]
  │
  ├─ toSessionDiskShape(doc, assetIds)
  │     strips embedded arrays; keeps refs.assets only
  │
  ├─ storage.write(sessionDocumentPath(id), JSON)
  │
  ├─ upsertLibraryItem({ kind: 'session', id, name, … })
  │     → updates library.json catalog row
  │
  └─ setActiveSession(id)
        → updates config.json activeSessionId
```

**API:** `saveSessionDocument(document)` — `src/services/storage/persistenceService.ts`

```ts
export async function saveSessionDocument(
  document: SessionDocument,
): Promise<SessionDocument>
```

Preserves `createdAt` from existing file; bumps `updatedAt`.

### 5.3 Load flow

```
loadSessionDocument(id)
  │
  ├─ 1. /prompts/sessions/matchDate-{id}.json exists?
  │       parseSessionDocument → hydrateSession → return
  │
  ├─ 2. Else try legacy txt paths (/prompts/txt/, /chat/sessions/, /sessions/)
  │       parseSavedSession → sessionFromTxtPrompt → hydrateSession
  │       → rewriteLegacySession (migrate to canonical path)
  │
  ├─ 3. Else try legacy img/vid paths → sessionFromImg/VidPrompt
  │
  └─ NOT_FOUND
```

**API:** `loadSessionDocument(id)` → `{ session: SessionDocument, migratedFrom?: string }`

**Hydration** (`hydrateSession`):

```ts
// Resolves refs.assets → embedded images[], videos[], texts[]
const images = await resolveImageRefs(storage, allIds, doc.assets.images);
const videos = await resolveVideoRefs(storage, allIds, doc.assets.videos);
const texts  = await resolveTextRefs(storage, allIds, doc.assets.texts);
```

### 5.4 UI integration

| Hook / function | File | Role |
|-----------------|------|------|
| `useSessionEditor` | `src/features/session/useSessionEditor.ts` | Load/save/delete session; sync Redux thread |
| `loadSessionIntoApp` | `src/features/library/openLibraryGenerator.ts` | Library row click → OPFS → Redux → navigate |
| `SessionContainer.commitSession` | `src/features/session/SessionContainer.tsx` | Merge live thread before persist |

**Load session into app:**

```ts
export async function loadSessionIntoApp({ sessionId, dispatch, navigate }) {
  const { session } = await loadSessionDocument(sessionId);
  await setActiveSession(sessionId);
  const thread = sessionToThread(session);
  dispatch(loadThread(thread));
  dispatch(setSelectedSessionId(sessionId));
  dispatch(markSessionSaved({ id: sessionId, updatedAt: session.updatedAt }));
  navigate(`/session/${sessionId}`);
}
```

### 5.5 Delete

`deleteSessionDocument(id)` — removes canonical file, legacy paths, and catalog row.

---

## 6. Loading & Saving System Prompts

### 6.1 Data model

```ts
// src/services/storage/types.ts
export interface SystemPromptPreset {
  schemaVersion?: number;
  opfsType?: 'prompt';
  subtype?: 'systemPrompt' | 'negativePrompt' | 'refinerPrompt';
  name: string;
  slug: string;              // filename stem + catalog id
  systemPrompt: string;      // ★ the prompt body sent to LLM
  type: 'system' | 'negative' | 'refiner';
  createdAt: string;
  updatedAt: string;
  refs?: OpfsDocRefs;
}
```

**On disk:** `/matchdate/prompts/session/{slug}.json`

Example:

```json
{
  "schemaVersion": 2,
  "opfsType": "prompt",
  "subtype": "systemPrompt",
  "name": "Default",
  "slug": "default",
  "systemPrompt": "You are a helpful assistant.",
  "type": "system",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

### 6.2 Config manifest (active presets)

**File:** `/matchdate/config.json`

```ts
export interface ConfigManifest {
  schemaVersion?: number;
  activeSystemPresetSlug: string;      // always set
  activeNegativePresetSlug: string | null;
  activeCharacterUuid: string | null;
  activeSessionId: string | null;      // last active chat session
  updatedAt: string;
}
```

Refiner active slugs are in **localStorage** (not config) — `readActiveImgRefinerSlug` / `readActiveVidRefinerSlug`.

### 6.3 API

| Function | Purpose |
|----------|---------|
| `listPresets()` | Catalog rows where `kind === 'prompt'` |
| `loadPreset(slug)` | Read JSON; dual-read legacy flat `/prompts/{slug}.json` |
| `savePreset({ name, systemPrompt, type?, slug? })` | Write JSON + upsert library row |
| `setActivePrompt(slug)` | Set active SYS or NEG in `config.json` |
| `deletePreset(slug)` | Delete file; reassign active if needed |
| `loadPromptsState()` | Full Redux bootstrap for `promptsSlice` |

**Save preset:**

```ts
const slug = options.slug ?? slugifyName(options.name);
const preset: SystemPromptPreset = {
  schemaVersion: OPFS_SCHEMA_VERSION,
  opfsType: 'prompt',
  subtype: promptTypeToSubtype(type),
  name, slug, systemPrompt, type, createdAt, updatedAt,
};
await storage.write(presetPath(slug), JSON.stringify(preset, null, 2));
await upsertLibraryItem(storage, { kind: 'prompt', id: slug, name, promptType: type, … });
```

**Activate preset:**

```ts
// setActivePrompt(slug)
if (preset.type === 'negative') {
  await updateConfigManifest(storage, { activeNegativePresetSlug: slug });
} else {
  await updateConfigManifest(storage, { activeSystemPresetSlug: slug });
}
```

**Boot → Redux** (`loadPromptsState`):

```ts
const manifest = await readConfigManifest(storage);
const activeSystem = await loadPreset(manifest.activeSystemPresetSlug);
return {
  systemPrompt: activeSystem.systemPrompt,       // editor draft
  activeSystemPrompt: activeSystem.systemPrompt,  // ★ sent with chat
  activeSystemPresetSlug: activeSystem.slug,
  activeNegativePresetSlug: manifest.activeNegativePresetSlug,
  presetCatalog: await listPresets(),
  storageReady: true,
};
```

Default seed: slug `default`, body `You are a helpful assistant.` via `seedDefaultPreset()` on first boot.

### 6.4 Per-session system prompt override

Stored on the session document, not in config:

```ts
session.text.systemPromptSlug  // optional preset slug
```

At chat send time, `resolveThreadSystemPrompt(thread, libraryPrompt)` loads the preset body if slug is set; otherwise uses global `activeSystemPrompt`.

See `docs/MD-Chat-Feature.md` §7 for how this connects to the chat API.

### 6.5 UI integration

| Component / hook | Role |
|------------------|------|
| `PromptsContainer` | Editor for preset body; save/activate |
| `usePromptsEditor` | `savePreset`, `activatePreset`, `applyPreset`, `deletePreset` |
| `LibraryBrowser` | SYS/NEG badge click → `setActivePrompt` |
| `SessionContainer` | Per-session SYS dropdown → `thread.systemPromptSlug` |

---

## 7. Text Assets (for `@` attachments)

**File:** `src/services/storage/textStorage.ts`

| Function | Behavior |
|----------|----------|
| `saveText(blob, originalName)` | Write blob to `/assets/text/`, register asset metadata |
| `loadTextContent(id)` | `blob.text()` |
| `deleteText(id)` | Delete blob only |

Blobs are always stored as `.txt`; `SavedTextRef.mimeType` tracks `text/plain` vs `text/markdown` for UI.

Used by `useTxtChatAttachments` when user picks "Upload file…" or selects a library text asset in the `@` menu.

---

## 8. Library Catalog (`library.json`)

### 8.1 Shape

```json
{
  "items": [
    {
      "kind": "session",
      "id": "abc123",
      "name": "My chat",
      "fileName": "matchDate-abc123.json",
      "path": "/matchdate/prompts/sessions/matchDate-abc123.json",
      "isFavorite": false,
      "createdAt": "…",
      "updatedAt": "…",
      "type": "generator",
      "subtype": "session"
    },
    {
      "kind": "prompt",
      "id": "default",
      "name": "Default",
      "promptType": "system",
      "type": "prompt",
      "subtype": "systemPrompt",
      "…": "…"
    }
  ],
  "updatedAt": "…"
}
```

**Type:** `LibraryItemMeta` in `src/services/storage/types.ts`

### 8.2 Operations

**File:** `src/services/storage/libraryIndex.ts`

| Operation | Behavior |
|-----------|----------|
| `listLibraryItems(storage, kind?)` | Read `library.json` only — **no full OPFS scan** |
| `upsertLibraryItem` | Load index → `Map` by `kind:id` → compact rewrite |
| `removeLibraryItem` | Remove row from index |
| `toggleLibraryFavorite` | Flip `isFavorite` + `favoritedAt` |
| `reconcileLibraryIndex` | Scan entity dirs via `libraryRegistry` → rebuild index |

**When reconcile runs:**

- App boot (`AppBootstrap` → `reconcileLibrary()`)
- Config Storage Scan / Import
- Favorite toggle (ensures row exists)

### 8.3 Kind registry

**File:** `src/services/storage/libraryRegistry.ts`

Each `LibraryItemKind` registers:

- `directory` — where to scan for ids
- `pathForId(id)` — file path builder
- `readCatalogFields` — parse name/dates from entity JSON

Parsers: `parsePreset`, `parseSessionDocument`, `parseSavedSession`, `parseAsset`, `parseSavedCharacter`, etc.

---

## 9. App Boot Sequence

**File:** `src/AppBootstrap.tsx`

```
1. reconcileLibrary()           → rebuild library.json if needed
2. loadPromptsState()         → hydrate promptsSlice (active SYS/NEG)
3. loadCharactersState()      → hydrate charactersSlice
4. loadSessionsState()        → hydrate sessionsSlice (active session id)
5. hydrateLocalStorage()      → UI prefs (model, sort, sidebar width)
6. startNewChat(createId())   → empty in-memory thread
7. requestPersistentStorage() → ask browser to not evict OPFS
```

Any `persistenceService` call internally runs `ensureInitialized()` which seeds default preset + config if missing and runs layout migrations.

---

## 10. `persistenceService` API Reference

**File:** `src/services/storage/persistenceService.ts` — central facade.

### Chat / sessions

```ts
saveSessionDocument(doc)      loadSessionDocument(id)
deleteSessionDocument(id)     listSessions() / loadSessionsState()
setActiveSession(id | null)
saveTxtPrompt(thread)         loadTxtPrompt(id)    // legacy
```

### Presets

```ts
listPresets()                 loadPreset(slug)
savePreset(options)           setActivePrompt(slug)
deletePreset(slug)            loadPromptsState()
```

### Catalog

```ts
listLibrary(kind?)            reconcileLibrary()
toggleFavorite(kind, id)
```

### Assets

```ts
saveAsset / loadAsset / deleteAsset
saveText (via textStorage)    loadTextContent
```

### Backup

```ts
// opfsBackup.ts — zip export/import of entire /matchdate tree
collectOpfsTree / exportOpfsZip / importOpfsZip
```

### Session export (portable bundle)

```ts
// sessionExport.ts — session JSON + referenced assets + presets
exportSessionZip(sessionId)
```

---

## 11. Asset Library UI

### 11.1 Component hierarchy

```
View Container (SessionContainer, PromptsContainer, …)
  └── ColumnSplit { left: editor, right: LibraryBrowser }
        └── LibraryBrowser              ← smart container
              └── LibrarySidebar        ← search, sort, tab chrome
                    ├── Tabs (SESSIONS / PROMPTS / WORKFLOWS / ASSETS / ALL)
                    ├── Subtype filter dropdown
                    └── LibraryList
                          └── LibraryListItem (×N)
                                ├── thumb (image / video / text)
                                ├── type badges (SYS / NEG / Ref)
                                └── favorite + delete buttons
```

### 11.2 Container / presentational split

| Layer | Files | Responsibility |
|-------|-------|----------------|
| Presentational | `LibrarySidebar`, `LibraryList`, `LibraryListItem` | Layout, rows, callbacks up |
| Smart container | `LibraryBrowser` | Tabs, filters, Redux reads, navigation |
| View container | `SessionContainer`, `PromptsContainer` | `loadableKinds`, `onLoad`, asset callbacks |
| Editor hooks | `useSessionEditor`, `usePromptsEditor` | CRUD + `catalogEpoch` |

### 11.3 `LibraryBrowserProps` (porting contract)

```ts
interface LibraryBrowserProps {
  loadableKinds: LibraryItemKind[];     // what this editor can load
  catalogEpoch?: number;                // bump to refresh catalog
  selectedId?, selectedKind?, isSelected?
  isBusy?
  onLoad(item: LibraryItemMeta): void;  // required
  onBrowseSelect?(item)
  onDeleteLoadable?, onToggleFavoriteLoadable?
  onActivateType?(item)                // SYS/NEG activate override
  onLoadAssetImage|Video|Text?(item)    // asset row activation
  onCatalogMutated?()
}
```

### 11.4 Catalog loading

**Hook:** `useLibraryCatalog(catalogEpoch)` — `src/components/library/LibraryBrowser/useLibraryCatalog.ts`

```ts
// On mount + whenever catalogEpoch changes:
const items = await listLibrary();  // reads library.json only
// Returns: { items, storageReady, refresh, setItemFavorite }
```

**No Redux slice for catalog rows** — React local state only.

**Refresh signal:**

```ts
// appShellSlice
bumpLibraryEpoch()   // global signal

// Per-container local epoch
catalogEpoch={localEpoch + libraryEpoch}
```

Bump after: session save, asset mutation, import, chat attachment upload.

### 11.5 Filtering pipeline

```
useLibraryCatalog.items
  → tab filter (LIBRARY_BROWSER_TABS)
  → subtype filter (SYSTEM / NEGATIVE / IMAGE / TEXT / …)
  → searchLibraryItems(query)     // case-insensitive name match
  → sortLibraryItems(preference)  // name / starred / createdAt / updatedAt
  → LibraryList
```

**Tabs** (`libraryBrowserTabs.ts`):

| Tab | Kinds |
|-----|-------|
| SESSIONS | `session`, `txtPrompt`, `imgPrompt`, `vidPrompt`, … |
| PROMPTS | `prompt` |
| WORKFLOWS | `character` |
| ASSETS | `asset` |
| ALL | no filter |

Default tab = first tab whose kinds intersect `loadableKinds`.

### 11.6 Row click dispatch

```
handleSelect(item)
  ├─ generator kind → openGenerator()
  │     ├─ same-view loadable → onLoad(item)
  │     ├─ session cross-view → loadSessionIntoApp() (dirty confirm)
  │     └─ other → navigate(pathForGeneratorLoad)
  ├─ prompt → openPrompt() → onLoad or navigate /prompts?load=id
  ├─ character → openCharacter()
  ├─ asset image/video/text → onLoadAsset* callbacks
  └─ other loadable → onLoad(item)
```

**Browse-only rows:** visible in catalog but not loadable in current view (`loadableSet` check).

### 11.7 SYS / NEG activation

Prompt rows show type badges. Click badge:

```ts
setActivePrompt(item.id)  // OPFS config.json
dispatch(setActiveSystemPreset({ slug, prompt }))  // Redux
```

Active slugs from `promptsSlice` → highlighted badge on matching row.

### 11.8 Redux state (library-related)

| Slice | Fields | Purpose |
|-------|--------|---------|
| `appShellSlice` | `libraryEpoch` | Global catalog refresh signal |
| `localStorageSlice` | `librarySidebarWidthPx`, `librarySort{Kind}` | Sidebar width + sort prefs |
| `promptsSlice` | `activeSystemPresetSlug`, `activeNegativePresetSlug` | Badge highlighting |
| `sessionsSlice` | `selectedSessionId`, dirty markers | Session switch guards |
| `threadSlice` | `activeThreadId`, messages | Dirty/streaming guards before switch |

### 11.9 View integration examples

**Session view** (`SessionContainer`):

```tsx
<LibraryBrowser
  loadableKinds={GENERATOR_LOADABLE_KINDS}
  catalogEpoch={catalogEpoch + libraryEpoch}
  onLoad={(item) => applySession(item.id, item.name)}
  onLoadAssetImage={(item) => setPendingRefAssetId(item.id)}
  onLoadAssetText={(item) => setPendingTextAssetId(item.id)}
/>
```

**Prompts view** (`PromptsContainer`):

```tsx
<LibraryBrowser
  loadableKinds={['prompt']}
  onLoad={(item) => applyPreset(item.id, item.name)}
  onActivateType={(item) => activatePreset(item.id, item.name)}
/>
```

### 11.10 Layout

`ColumnSplit` — resizable two-pane layout. Right pane width persisted via `librarySidebarWidthPx` in `localStorageSlice`.

---

## 12. Save / Load Patterns (Code Recipes)

### 12.1 Initialize storage

```ts
const storage = getFileStorageService();
// First persistenceService call runs ensureInitialized internally:
// seed default preset, config.json, run migrations
await loadPromptsState();
```

### 12.2 Save a chat session

```ts
// Merge live Redux thread into session doc
const merged = applyThreadToSession(currentSession, liveThread);
const saved = await saveSessionDocument(merged);
// saved.text.messages is what was written
```

### 12.3 Load a chat session

```ts
const { session } = await loadSessionDocument(id);
const thread = sessionToThread(session);
dispatch(loadThread(thread));
```

### 12.4 Save a system prompt

```ts
const preset = await savePreset({
  name: 'Writer',
  systemPrompt: 'You are a creative writing assistant.',
  type: 'system',
});
await setActivePrompt(preset.slug);  // make it the active SYS
```

### 12.5 Save with asset hydration

```ts
const assetIds = await registerAssetsFromSession(storage, doc);
const disk = toSessionDiskShape(doc, assetIds);
await storage.write(sessionDocumentPath(doc.id), JSON.stringify(disk, null, 2));
```

### 12.6 Preserve timestamps on update

```ts
let createdAt = now;
if (await storage.exists(path)) {
  const existing = parseSessionDocument(await storage.read(path), path);
  createdAt = existing.createdAt;
}
```

---

## 13. Files to Port

### Tier 1 — Storage core (required)

| File | Role |
|------|------|
| `src/services/storage/types.ts` | `FileStorageService`, `LibraryItemMeta`, presets, config |
| `src/services/storage/localOpfsStorage.ts` | OPFS driver |
| `src/services/storage/inMemoryFileStorage.ts` | Test fallback |
| `src/services/storage/index.ts` | `getFileStorageService()` |
| `src/services/storage/paths.ts` | All path constants |
| `src/services/storage/parseStorageJson.ts` | Safe JSON parse |
| `src/types/opfsDoc.ts` | Schema v2 envelope |
| `src/types/chat.ts` | `Thread`, `ThreadMessage` |
| `src/types/session.ts` | `SessionDocument`, bridges |

### Tier 2 — Persistence API (chat + prompts)

| File | Role |
|------|------|
| `src/services/storage/persistenceService.ts` | Main facade |
| `src/services/storage/hydrateDocs.ts` | Register + hydrate assets |
| `src/services/storage/assetPersistence.ts` | Asset metadata CRUD |
| `src/services/storage/textStorage.ts` | Text blob I/O |
| `src/services/storage/libraryIndex.ts` | `library.json` |
| `src/services/storage/libraryRegistry.ts` | Kind registry + parsers |
| `src/services/storage/opfsKindMap.ts` | Kind ↔ type mapping |

### Tier 3 — Library UI

| File | Role |
|------|------|
| `src/components/library/LibraryBrowser/` | Smart container + catalog hook |
| `src/components/library/LibraryList/` | Sidebar, list, sort hook |
| `src/features/library/openLibraryGenerator.ts` | Navigation + `loadSessionIntoApp` |
| `src/features/library/libraryEditorActions.ts` | Delete confirm, favorite helper |
| `src/components/layout/ColumnSplit/` | Resizable editor + library pane |

### Tier 4 — Integration hooks

| File | Role |
|------|------|
| `src/features/session/useSessionEditor.ts` | Session CRUD |
| `src/features/prompts/containers/usePromptsEditor.ts` | Preset CRUD |
| `src/AppBootstrap.tsx` | Boot hydrate |
| `src/store/slices/promptsSlice.ts` | Active system prompt state |
| `src/store/slices/sessionsSlice.ts` | Selected session state |
| `src/store/slices/appShellSlice.ts` | `libraryEpoch` |

### Tests to reference

| File | Covers |
|------|--------|
| `persistenceService.test.ts` | Save/load presets, sessions |
| `persistSessionDocument.test.ts` | Session disk shape |
| `libraryIndex.test.ts` | Catalog upsert/reconcile |
| `hydrateDocs` usage in integration tests | Asset round-trip |

---

## 14. Minimal Port Checklist (Chat + Prompts Only)

For MatchDate v1 (chats and system prompts only):

1. **Implement `FileStorageService`** — OPFS or IndexedDB fallback
2. **Path layout** — at minimum:
   - `/matchdate/prompts/sessions/` — chat sessions
   - `/matchdate/prompts/session/` — system prompts
   - `/matchdate/config.json` — active slugs
   - `/matchdate/library.json` — catalog (optional but needed for library UI)
3. **Define types** — `SessionDocument.text.messages`, `SystemPromptPreset`
4. **Implement save/load** — `saveSessionDocument`, `loadSessionDocument`, `savePreset`, `loadPreset`, `setActivePrompt`
5. **Boot** — `loadPromptsState()` + load last active session from `config.activeSessionId`
6. **Bridge to UI** — `sessionToThread` / `applyThreadToSession`
7. **Library UI (optional)** — `LibraryBrowser` + `useLibraryCatalog` with `loadableKinds={['session','prompt']}`
8. **Text attachments (optional)** — `textStorage.saveText` + `/assets/text/` for `@` menu

### Slim chat-only document shape

If you do not need unified sessions with image/video:

```ts
interface ChatDocument {
  schemaVersion: 2;
  type: 'generator';
  subtype: 'session';
  id: string;
  name: string;
  text: {
    messages: ThreadMessage[];
    systemPromptSlug?: string;
    modelId?: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

Omit `assets`, `image`, `video`, `game` fields. Keep the same path (`/prompts/sessions/`) for MatchDate data compatibility.

---

## 15. What MatchDate Does NOT Do

- No server sync — OPFS is per-origin, per-browser
- No multi-device access without export/import zip
- Node.js cannot read live OPFS — backup is in-app only (`opfsBackup.ts`)
- `library.json` is not a database — full-file rewrite on every upsert (fine to ~2–5k items)
- Refiner active slugs are in localStorage, not `config.json`

---

## 16. Related Docs

| Doc | Topic |
|-----|-------|
| `docs/MD-ODSF.md` | Catalog scaling, reconcile strategy |
| `docs/MD-Chat-Feature.md` | Chat UI, `@` attachments, system prompt usage at send time |
| `docs/MD-attach.md` | `@` menu research and XML payload format |
| `docs/MD-UnifiedGen.md` | Unified session document design |
