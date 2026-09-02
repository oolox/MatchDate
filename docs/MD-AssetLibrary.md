# MatchDate — Asset Library Plan

> **Purpose:** Document the library sort/search UX and asset catalog architecture, ported from LuxNova's `assetLibrary` patterns.

**Last updated:** 2026-09-01  
**Related:** `docs/MD-Filesystem.md`, `docs/MD-portingGuide.md`, `docs/MD-attach.md`

---

## 1. Overview

MatchDate's library sidebar lists chat sessions, system prompts, and (target) text/image/video assets from `library.json`. This guide covers:

1. **Sort + search** — LuxNova-style collapsible search, persisted sort controls
2. **Asset types** — `kind: 'asset'` with `subtype: image | video | text`
3. **UI shape** — tabs, subtype filters, thumb rows matching LuxNova

---

## 2. Current vs Target

| Area | Before | Target (LuxNova parity) |
|------|--------|-------------------------|
| **Tabs** | All / Chats / Prompts | All / Chats / Prompts / **Assets** |
| **Search** | Plain always-visible `<input>` | Collapsible `SearchBar` with icon |
| **Sort** | Hardcoded in `LibraryBrowser` | `LibraryListSortControls` — Name / Created / Updated / Starred, asc/desc, persisted per tab |
| **Sort location** | `LibraryBrowser.tsx` | `LibrarySidebar.tsx` via `useLibraryListSort` |
| **Catalog kinds** | `session` \| `prompt` | + `asset` with `subtype` |
| **Text assets** | Sidecar JSON in `/assets/text/` | `AssetDocument` in `/assets/metadata/` + `library.json` row |

---

## 3. Data Model

### Catalog row (`LibraryItemMeta`)

```ts
kind: 'session' | 'prompt' | 'asset'
type?: 'asset'
subtype?: 'image' | 'video' | 'text' | 'frame'  // frame deferred
```

### On-disk layout

```
/matchdate/assets/
  img/         matchDate-img-{id}.png
  vid/         matchDate-vid-{id}.mp4 (+ poster JPEGs)
  text/        matchDate-text-{id}.txt
  metadata/    matchDate-asset-{id}.json   ← AssetDocument
library.json   ← catalog index row per asset
```

### `AssetDocument`

- `type: 'asset'`
- `subtype: 'image' | 'video' | 'text'`
- `blobPath`, `fileName`, `mimeType`
- `posterPath?` (video)
- `metadata?` (SavedImage / SavedVideo / SavedText)

---

## 4. UI Architecture

```
LibraryBrowser
  ├── libraryBrowserTabs.ts      (tab → kinds + listKind)
  ├── libraryBrowserSubtypes.ts  (IMAGE / VIDEO / TEXT / ALL)
  └── filter + handlers

LibrarySidebar
  ├── ListSubHeader
  ├── SearchBar (collapsible)
  ├── LibraryListSortControls
  ├── ResizeObserver compact mode (< 600px: search XOR sort)
  └── LibraryList → LibraryListItem → thumbs
```

### Tab mapping (MatchDate simplified)

| Tab | `kinds` | `listKind` (sort pref key) | Subtypes |
|-----|---------|---------------------------|----------|
| Chats | `session` | `session` | ALL |
| Prompts | `prompt` | `prompt` | ALL |
| **Assets** | `asset` | `asset` | image / video / text / all |
| All | `null` | `all` | ALL |

**Assets tab:** sort + search in subtype row (`sortPlacement: 'subSubHeader'`). Asset delete skips confirm dialog.

---

## 5. Implementation Phases

### Phase A — Sort + search chrome

- Port `libraryListSort.ts`, `useLibraryListSort.ts`, `LibraryListSortControls.tsx`
- Port `SearchBar`, `ButtonBar`, `SmallButton`, `ListSubHeader`
- Add localStorage sort keys + `localStorageSlice`
- Refactor `LibrarySidebar` (own search/sort) and `LibraryBrowser` (remove hardcoded sort)

**Exit:** Sessions/prompts searchable + sortable; prefs survive reload.

### Phase B — Asset storage foundation ✅

- Extend `paths.ts` (`img`, `vid`, `metadata`)
- Add `AssetDocument`, extend `LibraryItemMeta`
- Port `assetDocument.ts`, `assetPersistence.ts`, `libraryRegistry.ts`
- `persistenceService`: `listAssets`, `loadAsset`, `saveAsset`, `deleteAsset`
- Migrate text sidecars → metadata JSON + catalog rows
- `reconcileLibrary()` on boot
- `imageStorage.ts`, `videoStorage.ts` for image/video blob + catalog registration

**Exit:** `listLibrary()` returns text/image/video assets; `@` attachments still work.

### Phase C — Assets tab + list UI ✅

- `libraryBrowserTabs.ts`, `libraryBrowserSubtypes.ts`
- Asset delete via `deleteAsset` (no confirm)
- `LibraryListItem` subtype routing + text/image/video thumb placeholders
- `useTxtChatAttachments` → catalog-backed `listAssets` text filter

**Exit:** Text assets appear under Assets tab; searchable/sortable; deletable.

### Phase D — Image assets + thumbs (when needed)

- `imageStorage.ts`, `savedImage.ts`
- `LibraryAssetThumb`, `ImgContainer`, `useObjectUrl`

### Phase E — Video assets (optional)

- `videoStorage.ts`, `LibraryVideoThumb`, `VideoViewer`
- FRAMES subtype (`frame`) if end-frame assets needed

### Phase F — Polish + tests

- `libraryListSort.test.ts`, asset persistence tests
- `libraryThumbConcurrency`, `truncateLibraryListName`

---

## 6. Key Files

### Storage

| File | Role |
|------|------|
| `assetDocument.ts` | Builders from image/video/text refs |
| `assetPersistence.ts` | Asset CRUD + catalog upsert |
| `libraryRegistry.ts` | Reconcile session / prompt / asset |
| `migrateTextAssetMetadata.ts` | Sidecar → metadata migration |
| `imageStorage.ts`, `videoStorage.ts` | Blob I/O (Phase D/E) |

### Library UI

| File | Role |
|------|------|
| `libraryListSort.ts` | Sort comparator |
| `useLibraryListSort.ts` | Sort prefs hook |
| `LibraryListSortControls.tsx` | Sort UI |
| `libraryBrowserTabs.ts` | Tab config |
| `libraryBrowserSubtypes.ts` | Subtype filters |
| `LibraryAssetThumb.tsx` etc. | Asset row thumbs |

### Shared UI

| Component | Phase |
|-----------|-------|
| `SearchBar`, `ButtonBar`, `ListSubHeader` | A |
| `SubSubHeader`, `Tabs`, `IconTextInput` | C |
| `ImgContainer`, `TextViewer` | C–D |

---

## 7. localStorage Sort Keys

| Key | Default |
|-----|---------|
| `matchdate.librarySort.session` | `{ field: 'updatedAt', direction: 'desc' }` |
| `matchdate.librarySort.prompt` | `{ field: 'name', direction: 'asc' }` |
| `matchdate.librarySort.asset` | `{ field: 'updatedAt', direction: 'desc' }` |
| `matchdate.librarySort.all` | `{ field: 'updatedAt', direction: 'desc' }` |

---

## 8. Migration: Text Sidecars

**Before:**

```
/assets/text/matchDate-text-{id}.txt
/assets/text/matchDate-text-{id}.json   ← not in library.json
```

**After:**

```
/assets/text/matchDate-text-{id}.txt
/assets/metadata/matchDate-asset-{id}.json
library.json → { kind: 'asset', subtype: 'text', … }
```

Run `migrateTextAssetMetadata()` once on boot (idempotent). Keep dual-read until migration completes.

---

## 9. Scope (MatchDate v1)

| Feature | Include |
|---------|---------|
| Sort + search | **Yes** |
| Text assets in catalog | **Yes** |
| Image assets + thumbs | When upload/generation planned |
| Video + FRAMES | Defer unless on roadmap |
| Workflows / character tab | Skip |
| Session assets gallery | Defer |
| Drag-and-drop assets | Defer |
| Prompt subtypes (SYS/NEG) | Defer |

---

## 10. LuxNova Reference Paths

When porting, replace prefixes:

| LuxNova | MatchDate |
|---------|-----------|
| `/luxnova/` | `/matchdate/` |
| `luxNova-asset-` | `matchDate-asset-` |
| `luxnova.librarySort.*` | `matchdate.librarySort.*` |

**LuxNova source files:**

- `src/components/ui/SearchBar/`
- `src/components/library/LibraryList/LibraryListSortControls.tsx`
- `src/components/library/LibraryList/libraryListSort.ts`
- `src/components/library/LibraryList/useLibraryListSort.ts`
- `src/components/library/LibraryList/LibrarySidebar.tsx`
- `src/services/storage/assetPersistence.ts`
- `src/services/storage/libraryRegistry.ts`
