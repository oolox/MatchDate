# MatchDate — Image Assets Plan

> **Purpose:** Plan for bringing LuxNova-parity image assets into MatchDate — types, storage API, library browser thumbs, then (later) character-sheet attach via drag-and-drop.

**Last updated:** 2026-10-04  
**Reference repo:** `C:\Code\LuxNova`  
**Related:** `docs/MD-AssetLibrary.md`, `docs/MD-Filesystem.md`, `docs/MD-portingGuide.md`

---

## 1. Overview

MatchDate already has a thin image stack (`savedImage.ts`, `imageStorage.ts`, Assets tab IMAGE subtype, placeholder `LibraryAssetThumb`). The goal is to **duplicate LuxNova’s image asset types, API, and patterns** so images are first-class library assets (save / load / delete / catalog / real thumbs), without porting LuxNova’s full generator/gallery stack.

| Phase | Scope |
|-------|--------|
| **Phase 1** | API, storage, and asset browser changes to support image assets end-to-end |
| **Phase 2** | Image drag-and-drop from the asset library onto a character sheet (**high-level only for now**) |

**Out of scope for this plan:** image generation UI, fal image models, video/frame pipelines, LuxNova workflows/galleries, NEG/refiner image metadata richness beyond what MatchDate needs.

---

## 2. Review & reference — LuxNova

Review and port patterns from LuxNova (not copy generator UX):

| LuxNova area | Path (approx.) | What to reuse |
|--------------|----------------|---------------|
| Types | `src/types/savedImage.ts` | `SavedImageRef`, `SavedImageMetadata` shape (trim host-only fields) |
| Storage API | `src/services/storage/imageStorage.ts` | `saveImage`, `loadImage`, `updateImage`, PNG normalize, catalog register |
| Asset docs | `assetDocument.ts`, `assetPersistence.ts` | `assetDocumentFromImageRef`, `ensureImageAsset` |
| Paths | `paths.ts` | `/…/assets/img/`, `imagePath` / `imageFileName` |
| Object URLs | `src/hooks/useObjectUrl.ts` | Blob → `URL.createObjectURL` lifecycle |
| Thumbs | `LibraryAssetThumb.tsx` + `ImgContainer` | Real bitmap thumbs in library rows |
| List routing | `LibraryListItem.tsx` | `subtype === 'image'` → image thumb |

MatchDate filesystem already mirrors LuxNova layout for images:

```
/matchdate/assets/img/matchDate-img-{id}.png
/matchdate/assets/metadata/matchDate-asset-{id}.json
library.json → { kind: 'asset', subtype: 'image', … }
```

See `docs/MD-Filesystem.md` and `docs/MD-AssetLibrary.md` Phase D.

---

## 3. Current MatchDate state

| Piece | Status |
|-------|--------|
| `SavedImageRef` / metadata | Aligned (`originalName`, `width`/`height`, `visual`) |
| `imageStorage.saveImage` / `loadImage` / `updateImage` / `deleteImage` | Present; PNG normalize + catalog register |
| `ensureImageAsset` / `AssetDocument` | Present via asset persistence |
| Assets → IMAGE subtype filter | Present |
| `LibraryAssetThumb` | Real bitmap via `useObjectUrl` + `loadImage` |
| Upload into library | Assets/All → **Upload image** |
| Character ↔ image | `images: SavedImageRef[]` + collapsible drop zone |

---

## 4. Phase 1 — API, storage, asset browser

**Goal:** Images can be saved, listed, previewed, and deleted like LuxNova IMAGE rows, with MatchDate naming and catalog rules.

### 4.1 Types & API

- Align `src/types/savedImage.ts` with LuxNova’s ref + metadata **where useful** (e.g. `originalName`, optional `width` / `height`, keep `visual` for later character use).
- Extend `imageStorage.ts` toward LuxNova parity:
  - `saveImage(blob, { name?, metadata? })` → PNG blob + `AssetDocument` + `library.json` row
  - `loadImage(id)` (path resolve if we add legacy dual-read later)
  - `updateImage` (optional in Phase 1 if overwrite is needed)
  - Best-effort PNG normalize (`ensurePngBlob`) as in LuxNova
- Surface through `persistenceService` (`listAssets` / `loadAsset` / `deleteAsset` already delete image blobs — verify IMAGE path).

### 4.2 Storage

- Confirm paths: `imagePath` / `imageFileName` under `/matchdate/assets/img/`.
- Metadata JSON via existing `assetDocumentFromImageRef` + `ensureImageAsset`.
- Catalog: `subtype: 'image'`, searchable/sortable under Assets → IMAGE.
- Tests: extend `assetCatalog` / image storage tests (save → list → load → delete).

### 4.3 Asset browser

- Replace placeholder `LibraryAssetThumb` with LuxNova-style preview:
  - `useObjectUrl` + `loadImage(id)` (or shared load helper)
  - Optional slim `ImgContainer` port if layout needs shared sizing
- Ensure IMAGE subtype rows show real thumbs; fallback icon on load failure.
- Upload entry (Phase 1 minimum): library header or Assets-tab action to pick image files → `saveImage` → bump catalog epoch (match LuxNova “register IMAGE” idea; UI can stay simple).
- Do **not** require chat `@` image attach in Phase 1 unless trivial.

### 4.4 Phase 1 exit criteria

- [x] Save PNG/JPEG upload → appears under Assets / IMAGE (`Upload image` on Assets/All)
- [x] Row shows bitmap thumb (not only icon) (`LibraryAssetThumb` + `useObjectUrl`)
- [x] Delete removes blob + metadata + catalog row (existing `deleteAsset`)
- [x] Reload / reconcile still lists images
- [x] Unit tests cover save/load/update + catalog registration

---

## 5. Phase 2 — Character sheet drag-and-drop

**Goal:** Drop images onto the character sheet; store LuxNova-style `images: SavedImageRef[]` (refs by asset guid); show thumbs in a collapsible **Images** section.

- [x] Enable library drag for `kind: 'asset', subtype: 'image'`
- [x] Character sheet drop target (filesystem files + library IMAGE)
- [x] File drop → `saveImage` (library asset) + prepend ref on character
- [x] Library drop → `loadAsset` + `savedImageRefFromAsset` (link by id, no remint)
- [x] Persist `CharacterDocument.images` / editor Redux
- [x] Collapsible **Images** section with thumbs + unlink (X)

**Not in Phase 2:** generation-into-character, trash-deletes-asset, video frames, full LuxNova gallery chrome.

---

## 6. Suggested file touch list (Phase 1)

| Area | Files |
|------|--------|
| Types | `src/types/savedImage.ts` |
| Storage | `imageStorage.ts`, `assetDocument.ts`, `assetPersistence.ts`, `persistenceService.ts`, tests |
| Hooks | Port/adapt `useObjectUrl` |
| UI | `LibraryAssetThumb.tsx`, optional `ImgContainer`, Assets upload control |
| Drag (Phase 2 only) | `matchdateLibraryDrag.ts`, character editor drop zone |

---

## 7. Non-goals

- Porting LuxNova image **generation** prompts, samplers, or fal image endpoints
- Full Saved Images gallery / BottomDrawer chrome
- Video posters / FRAME subtypes
- Automatic migration from LuxNova OPFS into MatchDate

---

## 8. Sequencing

1. Review LuxNova `imageStorage` + `LibraryAssetThumb` + `useObjectUrl` in detail
2. Phase 1 storage/API parity + browser thumbs + simple upload
3. Phase 2 character drop (design schema, then implement)
