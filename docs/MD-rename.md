# MasterDater rename plan (MatchDate → MasterDater)

> **Purpose:** Plan a full product rename from **MatchDate** to **MasterDater** — UI copy, identifiers, filenames, comments, docs, and persistence keys — without losing existing OPFS / localStorage data unless we explicitly choose a wipe.  
> **Status:** plan only (do not execute until approved).  
> **Last updated:** 2026-11-15

---

## 0. TL;DR

| Item | Choice |
|------|--------|
| Display name | **MasterDater** |
| npm / package id | `masterdater` |
| Path / URL slug | `masterdater` (lowercase) |
| Camel identifiers | `MasterDater…` / `masterDater…` |
| Constants / MIME | `MASTERDATER_…` / `application/x-masterdater-…` |
| OPFS root | `/masterdater` (with **migration** from `/matchdate`) |
| localStorage prefix | `masterdater.` (with **read-fallback** from `matchdate.`) |
| Doc filename prefix `MD-*` | Keep **`MD-`** as the doc series prefix for now (= MasterDater docs); update **content** to say MasterDater. Optionally rename files later. |
| This plan file | `docs/MD-rename.md` (stays) |

**Do not** rename the git remotes / GitHub repo / local folder in the same PR unless separately requested — track as Phase E.

---

## 1. Goals & non-goals

### Goals

1. Every **user-visible** string says MasterDater (header, empty state, spinner, `<title>`, assistant role label, prompts).
2. Every **code identifier** that embeds the old brand is renamed (types, functions, MIME, constants, file basenames under `src/`).
3. Every **comment / doc / prompt** that names the product is updated.
4. Existing browser data keeps working via a **one-time migration** (OPFS tree + localStorage keys), or we document a deliberate wipe for alpha.

### Non-goals (unless added later)

- Rewriting unrelated history in git commits.
- Renaming GitHub `oolox/MatchDate` or the local `C:\Code\MatchDate` directory in Phase A–D.
- Changing the `MD-*.md` doc **filename** convention in the first pass (content yes; mass file rename optional Phase D).
- Renaming domain concepts that only *sound* related (`dateSummary`, Dates section, “date” as in romantic date) — those are product features, not the brand.

---

## 2. Naming matrix

Apply consistently:

| Context | Old | New |
|---------|-----|-----|
| UI / prose | MatchDate | MasterDater |
| package.json `name` | `matchdate` | `masterdater` |
| OPFS root | `/matchdate` | `/masterdater` |
| File basename prefix | `matchDate-` | `masterDater-` |
| localStorage | `matchdate.*` | `masterdater.*` |
| Drag MIME | `application/x-matchdate-library` | `application/x-masterdater-library` |
| Image reorder MIME | `application/x-matchdate-character-image-reorder` | `application/x-masterdater-character-image-reorder` |
| Module file | `matchdateLibraryDrag.ts` | `masterdaterLibraryDrag.ts` |
| Types / fns | `MatchDateLibraryDragPayload`, `setMatchDateLibraryDragData`, … | `MasterDaterLibraryDragPayload`, `setMasterDaterLibraryDragData`, … |
| Const | `MATCHDATE_LIBRARY_MIME` | `MASTERDATER_LIBRARY_MIME` |
| Prompt file | `prompts/prompt-matchDate.md` | `prompts/prompt-masterDater.md` |
| System prompt open | `You are a MatchDate character-chat assistant.` | `You are a MasterDater character-chat assistant.` |

**Parser note:** Keep accepting **legacy** MIME / path prefixes during migration (read old + new); write only new.

---

## 3. Inventory (current touchpoints)

Approximate sweep (`MatchDate` / `matchdate` / `matchDate` / `MATCHDATE`): **~35+ source files**, **most `docs/MD-*.md`**, `package.json` / lockfile, `index.html`, `prompts/prompt-matchDate.md`.

### 3.1 User-visible UI (Phase A)

| Location | String today |
|----------|----------------|
| `index.html` | `<title>MatchDate</title>` |
| `AppHeader.tsx` | `<h1>MatchDate</h1>` |
| `AppBootstrap.tsx` | `Loading MatchDate` |
| `MessageListEmpty.tsx` | `Welcome to MatchDate` |
| `MessageBubble.tsx` | role / aria `MatchDate` / `MatchDate is generating` |

### 3.2 Brand in prompts / LLM surface (Phase A)

| Location | Notes |
|----------|--------|
| `src/features/chat/characterSystemPrompt.ts` | Opening line + sync comment → `prompt-masterDater.md` |
| `prompts/prompt-matchDate.md` | Rename file + content |
| Docs that quote the prompt | Update links |

### 3.3 Code modules & symbols (Phase B)

| Old path / symbol | New |
|-------------------|-----|
| `src/utils/matchdateLibraryDrag.ts` (+ test) | `masterdaterLibraryDrag.ts` (+ test) |
| `MATCHDATE_LIBRARY_MIME` + helpers | `MASTERDATER_*` |
| `CHARACTER_IMAGE_REORDER_MIME` value | `…masterdater…` |
| Imports across composer / character editor / images | Update |

### 3.4 Persistence — **breaking without migration** (Phase C)

| Layer | Old | Risk if renamed blindly |
|-------|-----|-------------------------|
| OPFS root | `/matchdate` | Entire library/chats disappear |
| Basenames | `matchDate-char-…`, `matchDate-img-…`, `matchDate-asset-…`, `matchDate-text-…`, `matchDate-voice-…`, `matchDate-{session}.json` | Indexers / `libraryRegistry` / parsers fail |
| Prefix consts | `libraryRegistry`, `libraryIndex`, `migrateCharacterFromAssets`, `textStorage`, tests | Must stay in sync with parsers |
| localStorage | `matchdate.txtModel`, sorts, sidebar width, preprompt | Prefs reset |

### 3.5 Docs & meta (Phase D)

| Area | Action |
|------|--------|
| `docs/MD-*.md`, `docs/MCP.md` | Replace product name in prose; fix internal links if prompt path changes |
| `package.json` / `package-lock.json` | `"name": "masterdater"` |
| `scripts/fal-phase0-spike.mjs` | Spike reply string |
| Comments (`dayPicker.css`, `session.ts`, attach comments) | Update |
| Repo / folder / GitHub | Phase E only |

### 3.6 Explicitly **do not** rename

| Token | Why |
|-------|-----|
| `dateSummary`, Dates UI, “went on a date” copy | Feature language, not brand |
| `MD-ValueModel.md` title “Schwartz…” | Not brand-titled; only update if it says MatchDate |
| Git history | Out of scope |

---

## 4. Migration strategy (required for Phase C)

### 4.1 Preferred: soft migration on bootstrap

On `AppBootstrap` / storage init (before library load):

1. **OPFS**
   - If `/masterdater` exists → use it.
   - Else if `/matchdate` exists → **rename/move** root directory to `/masterdater` (or copy-then-delete if rename unsupported).
   - Else → create `/masterdater`.
2. **Basenames**
   - Option A (simpler): keep reading **both** `matchDate-*` and `masterDater-*` prefixes forever (or until a later cleanup).
   - Option B: walk OPFS once and rename files `matchDate-` → `masterDater-`, then update `library.json` paths.
   - **Recommend Option B** in the same bootstrap migration if path rewrite is already needed for the root move; otherwise Option A for v1.
3. **localStorage**
   - For each new key: if missing, copy value from old `matchdate.*` key; optionally remove old key after success.

### 4.2 Alpha alternative: wipe

If product is still private alpha and data loss is OK:

- Change paths/keys with **no** migrator.
- Document “clear site data” for testers.
- Faster, riskier — call out in release notes.

**Default for this plan: soft migration (4.1).**

### 4.3 Drag MIME compatibility

`readMasterDaterLibraryDragPayload` should try:

1. `application/x-masterdater-library`
2. fallback `application/x-matchdate-library`

Writers use the new MIME only.

---

## 5. Execution phases

### Phase A — Visible brand + prompts (low risk)

1. UI strings + `index.html` title.
2. `CHARACTER_SYSTEM_PROMPT` + rename `prompts/prompt-matchDate.md` → `prompts/prompt-masterDater.md`.
3. Grep for leftover user-facing `MatchDate`.
4. Manual smoke: header, empty chat, streaming label, title tab.

**Exit:** Product *looks* like MasterDater; storage still MatchDate paths.

### Phase B — Code identifiers & filenames (medium risk)

1. Rename `matchdateLibraryDrag.ts` / test; update all imports.
2. Rename MIME constants + APIs; dual-read MIME (4.3).
3. Update comments that name the product.
4. Run unit tests (`vitest`).

**Exit:** No `MatchDate` / `matchdate` symbols in `src/` except intentional legacy fallbacks + migration helpers.

### Phase C — Persistence rename + migration (high risk)

1. Implement bootstrap migrator (root + optional file prefix + localStorage).
2. Change `OPFS_ROOT`, filename helpers in `paths.ts`, prefixes in registry/index/migrations/tests.
3. Tests: empty OPFS; legacy `/matchdate` tree; mixed prefixes; localStorage copy.
4. Manual: create data on old build → upgrade → chats/characters/assets/voices intact.

**Exit:** New installs only write `/masterdater` + `masterDater-*` + `masterdater.*`.

### Phase D — Docs & package metadata

1. Bulk replace product name in `docs/**` (including `MCP.md`, `MD-audio.md`, etc.).
2. Fix links to `prompt-masterDater.md`.
3. `package.json` / lockfile `name`.
4. Decide whether to rename `MD-*.md` files themselves (optional; large diff). If yes, use a script and fix cross-links in one commit.
5. Update `MD-rename.md` status → **done** when complete.

### Phase E — Repo / folder / remotes (optional, separate)

| Action | Notes |
|--------|-------|
| Rename GitHub repo | `MatchDate` → `MasterDater`; update remotes |
| Rename local directory | `C:\Code\MatchDate` → `…\MasterDater` |
| Cursor / CI paths | Re-open project; fix any hardcoded paths |

---

## 6. Suggested commit sequence

Keep PRs/commits reviewable:

1. `docs: add MasterDater rename plan (MD-rename.md)` — **this file**
2. `rebrand: MasterDater UI copy and system prompt`
3. `rebrand: rename library drag module and MIME`
4. `rebrand: OPFS/localStorage MasterDater paths with migration`
5. `docs: MatchDate → MasterDater across MD-* docs`
6. (optional) `chore: rename package to masterdater` + repo rename

---

## 7. Verification checklist

- [ ] Grep clean for user-facing `MatchDate` (allowlist: this plan’s “old” column, migration comments, changelog).
- [ ] Grep `matchdate` / `matchDate` / `MATCHDATE` only in migrator + legacy fallbacks.
- [ ] `npm test` green.
- [ ] Fresh profile: app boots; creates `/masterdater`.
- [ ] Legacy profile: `/matchdate` data visible after upgrade.
- [ ] Drag character/image/text/voice from library → composer / sheet still works.
- [ ] Header, welcome, spinner, document title, assistant bubble label = MasterDater.
- [ ] Prompt file path and `characterSystemPrompt` agree.

---

## 8. Rollout risks

| Risk | Mitigation |
|------|------------|
| Silent empty library after upgrade | Soft OPFS root migration + tests |
| Half-renamed prefixes break parsers | Single Phase C commit; dual-read during transition |
| Docs/prompt drift | Phase A prompt + Phase D doc link pass |
| External bookmarks to GitHub | Phase E communication |
| Confusing `MD-` prefix vs MasterDater | Keep prefix; document “MD = MasterDater docs series” in README when added |

---

## 9. Decision log (to confirm before coding)

| # | Question | Proposed default |
|---|----------|------------------|
| D1 | Soft migration vs wipe? | **Soft migration** |
| D2 | Rename OPFS file prefixes now or dual-read forever? | **Migrate once** to `masterDater-` |
| D3 | Rename all `docs/MD-*.md` filenames? | **Not in first pass** (content only) |
| D4 | Rename GitHub repo in same effort? | **Separate Phase E** |
| D5 | Assistant chat label “MasterDater” vs character name? | Keep product name as today (`MatchDate` → `MasterDater`) |

---

## 10. Implementation order (when executing)

1. Confirm D1–D5 with stakeholders.
2. Land this plan (already present).
3. Phase A → B → C → D; stop for QA after C.
4. Phase E only after prod/alpha users are notified.

**Do not start Phases A–E until this plan is approved.**
