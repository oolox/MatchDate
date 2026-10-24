# MatchDate — fal audio (TTS · voice assets · chat speech)

> **Purpose:** Spec for text-to-speech and voice assets in MatchDate. Adapted from LuxNova research (`LN-audio`); scoped to **chat speech** and **character-attached voices**. Music / SFX / video foley are **out of scope** for now (kept briefly in §9 as deferred research).

**Last updated:** 2026-10-23  
**Status:** spec + codebase findings (§2) — no `src/services/fal/models/tts/` yet; no `voice` asset subtype in code.  
**Related:** `docs/MD-AssetLibrary.md`, `docs/MD-Filesystem.md`, `docs/MD-Chat-Feature.md`, `docs/MD-Models.md`, `src/types/character.ts`, `src/types/opfsDoc.ts`, `src/services/fal/falClient.ts`

**Source of truth for prices / schemas:** each model’s `https://fal.ai/models/<id>/llms.txt` (research snapshotted 2026-09-24; re-verify before coding).

---

## 0. TL;DR — MatchDate picks

| Job | Model | Endpoint | Why |
|-----|-------|----------|-----|
| **Customizable TTS (no clone)** | **Gemini 3.1 Flash TTS** | `fal-ai/gemini-3.1-flash-tts` | **$0.05/1K**; natural-language **`style_instructions`** (accent, tone, pace, emotion); inline tags `[laughing]`/`[whispering]`; 30 voices; 80+ `language_code`s |
| **Higher-end TTS + cloning** | MiniMax Speech 2.8 HD (+ Voice Clone) | `fal-ai/minimax/speech-2.8-hd` · `fal-ai/minimax/voice-clone` | Sample-backed character identity; expressive tags + `voice_modify`; `duration_ms`; `output_format: url` |
| **Ultra-cheap fallback (optional)** | Kokoro | `fal-ai/kokoro/american-english` | **$0.02/1K** but **speed-only** — too limited for MatchDate character voice design; keep as cost escape hatch only |
| **Zero-shot alt (no clone fee)** | Seed Audio 1.0 or Chatterbox | `bytedance/seed-audio-1.0` · `fal-ai/chatterbox/text-to-speech` | Pass sample URL every call; no 7-day MiniMax expiry |

**Why not Kokoro as the fast tier:** Kokoro only exposes `speed` + a fixed preset list. MatchDate needs **accent / style / tone** customization before cloning — Gemini’s `style_instructions` is free-form English (“British accent, warm, slightly teasing”) and maps cleanly onto character sheet fields.

**Product shape (end state):**

1. **`voice` asset subtype** in the library (GUID + `voiceName` + preset / sample).
2. **Top-level VOICE view** — design → Say this → play (temp blob) → save design.
3. **Characters attach a voice** via `voiceAssetId`.
4. **Chat plays TTS** for assistant replies.

**Build order (locked):** see §7 —

1. **Phase A** — voice asset types / API / library  
2. **Phase B** — VOICE view + Gemini scaffold (you test API here)  
3. **Phase C** — voice on characters (after Phase B sign-off)  
4. Later — chat TTS, MiniMax clone, optional `audio` assets  

---

## 1. Goals (in scope)

| Goal | Detail |
|------|--------|
| Voice library (first) | Types, persistence, Assets **VOICE** filter, save/rename/delete by GUID |
| VOICE workspace (second) | Header nav view: controls + Say this + play; load via select/drag |
| Controllable TTS | Gemini style / gender / pace; utterances = temporary blobs |
| Character binding (third) | Sheet + attach `voiceAssetId` after VOICE scaffold is proven |
| Chat speech (later) | Play assistant replies in a character’s voice |
| Cost-aware | Rough cost on Say this |

**Out of scope until after Phase B test:** MiniMax / cloning, chat Play, character binding (Phase C), music/SFX/lip-sync.
---

## 2. Codebase findings (review 2026-10-23)

Findings from comparing the LuxNova-oriented LN-audio draft to MatchDate as it exists today. These drive the phases in §7.

### 2.1 What already exists

| Layer | Finding | Key paths |
|-------|---------|-----------|
| **fal HTTP** | Thin `falFetch` only — no `@fal-ai/client`, no queue subscribe helper | `src/services/fal/falClient.ts` |
| **Chat LLM** | OpenRouter via fal.run SSE (`chatService.streamCompletion`); registry under `models/chat/` | `chatService.ts`, `models/chat/*`, `MD-Models.md` |
| **Vision** | Separate fal.run OpenRouter vision URL + constants; DESCRIBE uses trait JSON prompts | `visionService.ts`, `visionTraitExtract.ts` |
| **Assets** | `OpfsAssetSubtype = 'image' \| 'video' \| 'frame' \| 'text'` only — **no `voice` / `audio`** | `src/types/opfsDoc.ts` |
| **Asset blobs** | `/matchdate/assets/{img\|vid\|text}/` + `metadata/matchDate-asset-{id}.json` + `library.json` | `paths.ts`, `assetDocument.ts`, `MD-Filesystem.md` |
| **Library UI** | Assets tab filters IMAGE / VIDEO / TEXT; characters are `kind: 'character'` (not assets) | `libraryBrowserSubtypes.ts`, `LibraryBrowser.tsx` |
| **Character** | Top-level `identity` (`male` \| `female` \| `binary`) + `images[]`; **no voice field** | `src/types/character.ts` |
| **Chat `@` attach** | Visible `@Name`; LLM also gets fenced `character`/`write` with `name`, **`identity`**, attributes, history, traits — **not voice** | `jsonAttach.ts`, `xmlAttach.ts` |
| **Messages** | `ThreadMessage`: `content` / `apiContent` / `attachments` — **no speech cache fields** | `src/types/chat.ts` |
| **Audio / TTS code** | **None** — no `models/tts/`, no `ttsService`, no voice storage | — |

### 2.2 LuxNova doc vs MatchDate (mismatches)

| LN-audio assumption | MatchDate reality |
|---------------------|-------------------|
| `@fal-ai/client` `subscribe` like `videoService.ts` | No video/audio fal subscribe layer; only `falFetch` for chat + vision |
| Paths `/luxnova/assets/aud/…` | Root is `/matchdate`; asset dirs are `img` / `vid` / `text` / `metadata` |
| Character detail-chat TTS surface | MatchDate chat is session threads + `@` character tools (`MD-Chat-Feature.md`) |
| Music / SFX / Kling lip-sync first-class | Not shipped; keep deferred (§9) |
| `character.voiceAssetId` already sketched | Character sheet has identity + images; voice not started |

### 2.3 Gaps to close (ordered — matches §7)

1. **`voice` asset subtype** — types, paths, `assetDocument`, library reconcile, Assets **VOICE** filter (Phase A).
2. **fal queue / subscribe + Gemini TTS** — beside `falFetch`; `audio.url` → temporary `Blob` (Phase B).
3. **VOICE view UI** — nav, designer, Say this, save/load/drag (Phase B).
4. **`character.voiceAssetId`** — sheet + attach (Phase C, after you verify B).
5. **Chat Play UX** — later (Phase D).

### 2.4 Model-pick rationale (from LN research + MatchDate goals)

| Need | Pick | Why it fits MatchDate |
|------|------|------------------------|
| Controllable voice (accent / style / tone) **without** a sample | **Gemini 3.1 Flash TTS** `$0.05/1K` | `style_instructions` is natural language; tags + `language_code` + `temperature`; 30 presets |
| Character voice + **cloning** from audio | **MiniMax Speech 2.8 HD** + **Voice Clone** | Sample-backed identity; expressive tags; `duration_ms`; clone id usable for TTS (not Kling-only) |
| Clone retention risk | Sample blob = source of truth; cache MiniMax id + `lastUsedAt` | MiniMax ids expire after **7 days idle** — OPFS sample lets us re-clone |
| Avoid clone fee later | Seed Audio / Chatterbox (Phase F) | Zero-shot from sample URL; no persistent provider id |

**Rejected / demoted for the “fast” slot:**

| Model | Why not default |
|-------|-----------------|
| **Kokoro** `$0.02/1K` | Only `speed` + preset enum — no accent/style/tone knobs |
| **ElevenLabs Turbo v2.5** `$0.05/1K` | Has `stability` / `similarity_boost` / `style` / `speed` / `language_code`, but **no free-form accent/tone prose**; accent is weaker than Gemini’s `style_instructions`. Keep as alternate if we want numeric style sliders |
| **ElevenLabs Eleven v3** `$0.10/1K` | Inline audio tags (incl. accents) — good, but same price band as MiniMax HD without our clone path |
| **Kling Create Voice** `$0.007` | Ids target Kling **video** `voice_ids`, not standalone chat TTS |

---

## 3. Recommended models (detail)

### 3.1 Controllable preset — Gemini 3.1 Flash TTS *(replaces Kokoro as fast tier)*

| | |
|--|--|
| **Endpoint** | `fal-ai/gemini-3.1-flash-tts` |
| **Price** | **$0.05 / 1K chars** (verified live llms.txt 2026-10-23) |
| **Voices** | 30 presets (Kore default; Puck, Charon, Zephyr, Aoede, …) |
| **Accent / style / tone** | **`style_instructions`** — natural language, e.g. `"Use a British accent with a cheerful tone"`, `"Whisper mysteriously"`, `"Speak warmly and slowly"` |
| **Inline tags** | `[sigh]`, `[laughing]`, `[whispering]`, `[short pause]` (also inline “Say cheerfully: …”) |
| **Language** | Optional `language_code` (80+ locales) or auto-detect from text |
| **Other** | `temperature` 0–2; optional multi-speaker `speakers[]` (date scenes later) |
| **Cloning** | No — design the voice with instructions + preset, or graduate to MiniMax clone |
| **Output** | `mp3` (default) / `wav` / `ogg_opus` |
| **Use** | Default when character has **no sample**; store chosen `voice` + `style_instructions` (+ optional `language_code`) on the voice asset / character |

**MatchDate mapping (proposed):**

```ts
// on VoiceAssetMetadata.preset when provider === 'gemini'
{
  provider: 'gemini';
  voiceId: 'Puck',                    // preset
  styleInstructions?: string;         // accent / tone / pace
  languageCode?: string;              // e.g. "English (UK)"
  temperature?: number;
}
```

Sheet / library can edit style as a short text field (“soft Southern drawl, unhurried”) without uploading audio.

### 3.1b Alternate controllable (numeric knobs) — ElevenLabs Turbo v2.5

Same **$0.05/1K**. Knobs: `stability`, `similarity_boost`, `style` (0–1 exaggeration), `speed` 0.7–1.2, `language_code`, chunk continuity via `previous_text` / `next_text`. Prefer Gemini when the product wants **prose** style; prefer Turbo if we want sliders only.

### 3.1c Ultra-cheap (demoted) — Kokoro

| | |
|--|--|
| **Endpoint** | `fal-ai/kokoro/american-english` |
| **Price** | **$0.02 / 1K chars** |
| **Controls** | `speed` only |
| **Use** | Optional Phase F “economy mode” — **not** initial default |

### 3.2 Higher-end — MiniMax Speech 2.8 HD + Voice Clone

| | TTS | Clone |
|--|-----|-------|
| **Endpoint** | `fal-ai/minimax/speech-2.8-hd` | `fal-ai/minimax/voice-clone` |
| **Price** | **$0.10 / 1K chars** (Turbo sibling **$0.06 / 1K**) | **$1.50** / clone (+ optional preview) |
| **Voices** | 300+ presets via `voice_setting`, or `custom_voice_id` | Sample ≥10 s |
| **Controls** | Pause tags `<#x#>`, `(laughs)` / `(sighs)`, `voice_modify`, `language_boost` | — |
| **Persistence** | — | `custom_voice_id` **deleted after 7 days unless used** with MiniMax TTS |
| **Output** | MP3 + `duration_ms` — set **`output_format: "url"`** (default `hex` inlines bytes) | preview MP3 optional |

**Turbo vs HD:** ship HD as the premium registry entry; allow Turbo later as a cost toggle if latency/cost matters.

### 3.3 Optional zero-shot path (spec note, not v1 required)

If MiniMax’s 7-day idle expiry is too risky for MatchDate’s “save once, speak anytime” model:

| Model | Endpoint | Idea |
|-------|----------|------|
| Seed Audio 1.0 | `bytedance/seed-audio-1.0` | `audio_urls: [sample]` + `@Audio1` in prompt; **$0.1875 / min** output; no clone id |
| Chatterbox | `fal-ai/chatterbox/text-to-speech` | `audio_url` + text; **$0.025 / 1K**; expressive |

**v1 recommendation:** store the **sample blob** as the source of truth on the voice asset; cache MiniMax `custom_voice_id` + `lastUsedAt` in metadata; on TTS, if id missing/expired → re-clone from sample (or fall back to Seed/Chatterbox later).

---

## 4. Data model

### 4.1 Asset subtype `voice`

Extend:

```ts
// opfsDoc.ts
export type OpfsAssetSubtype = 'image' | 'video' | 'frame' | 'text' | 'voice';
```

**On-disk:**

```
/matchdate/assets/
  voice/       matchDate-voice-{id}.mp3   (or .wav — sniff mime)
  metadata/    matchDate-asset-{id}.json  ← AssetDocument subtype: 'voice'
library.json   ← catalog row kind: 'asset', subtype: 'voice'
```

**Identity vs display name:**

| Field | Role |
|-------|------|
| `AssetDocument.id` | **Stable GUID** — only identity for refs, drag payloads, `character.voiceAssetId`, library catalog |
| `VoiceAssetMetadata.voiceName` | **Display name** — user-editable anytime; rename does not change id |
| `AssetDocument.name` / `library.json` `name` | Mirror of `voiceName` for list UI (keep in sync on save/rename) |

Never key characters, drag/drop, or favorites by display name.

**`AssetDocument` for voice** — `metadata` shape (proposed):

```ts
interface VoiceAssetMetadata {
  /**
   * Display name for the voice (library row, VOICE view title, picker labels).
   * May change freely; identity is always AssetDocument.id (GUID).
   */
  voiceName: string;
  /** Sample duration in ms (from decode or fal). */
  sampleDurationMs?: number;
  /** Original upload filename (not the display name). */
  originalName?: string;
  /** Preset / designed voice (no sample blob). */
  preset?: {
    provider: 'gemini' | 'minimax' | 'kokoro' | 'elevenlabs';
    voiceId: string; // e.g. Puck, Rachel, af_heart — provider preset, not our GUID
    /** Gemini: free-form accent / style / tone. */
    styleInstructions?: string;
    languageCode?: string;
    temperature?: number;
    /** ElevenLabs Turbo knobs (if used). */
    stability?: number;
    similarityBoost?: number;
    style?: number;
    speed?: number;
  };
  /** Derived provider ids — never the only copy of the voice. */
  providerIds?: {
    minimax?: { id: string; lastUsedAt?: string };
  };
  /** Optional waveform peak array for library thumb. */
  waveformPeaks?: number[];
}
```

**Rules:**

- **Track by GUID** (`AssetDocument.id`); `voiceName` is display-only and renameable.
- On create: allocate GUID once; set `voiceName` (default e.g. `"Untitled voice"` or first line of style).
- On rename: update `metadata.voiceName` + `AssetDocument.name` + catalog `name`; leave `id` unchanged.
- Canonical artifact = **sample blob** when cloned / uploaded (5–30 s clean speech preferred).
- Preset-only voices may omit blob and use `metadata.preset` (Gemini style text + voice id, or MiniMax stock).
- Provider clone ids are **cache**; re-clone from blob if expired.
- Do not confuse `preset.voiceId` (Gemini/MiniMax preset enum) with our asset GUID.

### 4.2 Character binding

```ts
interface Character {
  // …existing fields…
  /** Library voice asset GUID (`AssetDocument.id` with subtype voice) — not voiceName. */
  voiceAssetId?: string;
}
```

- Persist on `CharacterDocument` by **id only**; UI shows current `voiceName` looked up from the asset.
- Renaming a voice does not break character links.
- Sheet UI: picker / clear (Assets → VOICE or character-scoped drop).
- Chat attach (`buildCharacterWriteTool`): include `voiceAssetId` (GUID); optional `voiceName` for LLM readability — **do not** send blob bytes in the tool JSON.
### 4.3 Generated speech = temporary blobs (for now)

**VOICE view and early chat TTS do not persist synthesis output to OPFS.**

| Artifact | Now | Later (optional) |
|----------|-----|------------------|
| **TTS result** (“Say this” / chat Play) | In-memory `Blob` + object URL; play then revoke / GC | New asset subtype **`audio`** (utterance clip) if we want library history / replay after reload |
| **Voice design** (`voice` asset) | Saved: GUID + `voiceName` + preset knobs (and later sample blob for clones) | Unchanged — voice ≠ utterance |

Rules for the initial VOICE view:

- On **Say this**: call Gemini → hold `Blob` in component/view state → play via `Audio` / object URL.
- Do **not** write the utterance into `/matchdate/assets/` or `library.json`.
- Leaving the view / synthesizing again may drop the previous blob (revoke object URLs to avoid leaks).
- **Save** persists the **voice design** (`voice` asset metadata), not the last spoken line.

Future `audio` asset type (deferred): separate from `voice`; would store generated clips with refs to `voiceAssetId` + text + model. Not in the initial slice.

Chat message speech cache (`speechAssetId` on `ThreadMessage`) stays **out of scope** until we decide on `audio` assets; in-memory blob per bubble is enough for first chat Play.

---

## 5. fal integration shape

### 5.1 Registry (mirror chat models)

```
src/services/fal/models/tts/
  ttsTypes.ts          // TtsModelConfig, cost units
  gemini31FlashTts.ts
  minimaxSpeech28Hd.ts
  index.ts             // listTtsModels(), getTtsModel(), DEFAULT_TTS_MODEL_ID
```

```ts
export type TtsModelKind = 'preset' | 'cloneable';

export type TtsModelCost =
  | { unit: 'per_1k_chars'; usd: number }
  | { unit: 'per_minute'; usd: number }; // Seed Audio if added later

export interface TtsModelConfig {
  id: string;                 // app registry id
  endpoint: string;           // fal-ai/...
  label: string;
  shortLabel: string;
  kind: TtsModelKind;
  cost: TtsModelCost;
  supportsClone: boolean;
  /** Max chars per request (chunk long replies). */
  promptMax: number;
  description: string;
}
```

**Defaults:**

| Registry id | Endpoint | Role |
|-------------|----------|------|
| `gemini/3.1-flash-tts` | `fal-ai/gemini-3.1-flash-tts` | Default controllable (accent/style/tone) |
| `minimax/speech-2.8-hd` | `fal-ai/minimax/speech-2.8-hd` | Premium / cloned character voice |

### 5.2 Service

```
src/services/fal/ttsService.ts
  synthesizeSpeech({ text, modelId, voice }) → { blob, durationMs?, url? }
  cloneVoice({ sampleBlob | sampleUrl }) → { customVoiceId }   // MiniMax only
```

`voice` resolution:

| Character state | Model | Input |
|-----------------|-------|--------|
| No `voiceAssetId` | Gemini | default voice (e.g. Kore/Puck from `identity`) + optional default style |
| Preset voice asset | Gemini (or MiniMax stock) | `voice` + `style_instructions` / `language_code` from `metadata.preset` |
| Sample voice asset | MiniMax HD | ensure `providerIds.minimax.id` (clone if needed) + `voice_setting.voice_id` |

### 5.3 Call transport

MatchDate does **not** use `@fal-ai/client` today. Spec options (pick one in Phase B):

1. Add `@fal-ai/client` `fal.subscribe(endpoint, { input, … })` for queue models only.
2. Implement fal queue REST (submit → poll → result) on top of `falFetch`.

Normalize audio result: `{ url }` object **or** bare string URL → `fetch` → **temporary `Blob`** (play in UI). Do not OPFS-write utterances until an `audio` asset type exists.

---

## 6. Product / UX

### 6.0 VOICE view (Phase B — test harness)

Top-level route (e.g. `/voice`), header nav **VOICE** beside CHAT / CHARACTER / PROMPTS / CONFIG (`AppMainNavId` += `'voice'`).

| Area | Behavior |
|------|----------|
| **Voice controls** | Style instruction text; gender → Gemini preset (e.g. male/female/neutral → Puck/Kore/…); pace via style text and/or `temperature` (Gemini has no numeric `speed`) |
| **`voiceName` field** | Editable display name; identity remains asset GUID when saved |
| **Say this** | Text area + submit; calls Gemini; plays **temporary blob**; revoke prior object URL on next say / unmount |
| **Save** | Persist **voice design** (`voice` asset: GUID + `voiceName` + `preset`); not the utterance |
| **Load** | Select from library and/or **drag** a `voice` asset into the view; hydrate controls from `metadata` |
| **Busy / error** | Disable Say this while in flight; surface fal errors |

Layout can mirror Prompts/Config: main panel = designer; library sidebar still lists assets (VOICE subtype filter from Phase A).

### 6.1 Library (Phase A)

- Assets tab subtype filter: add **VOICE** (with IMAGE / VIDEO / TEXT).
- Row shows `voiceName` (mirrored catalog `name`); track by GUID.
- Create/rename/delete voice designs; favorites work like other assets.
- Drag payload: `kind: 'asset'`, `subtype: 'voice'`, `id` = GUID (same MatchDate library drag pattern).

### 6.2 Character sheet (Phase C — after B sign-off)

- Next to identity / images: **Voice** — select / clear / preview design (Say this in sheet optional).
- Bind `voiceAssetId` (GUID); UI shows looked-up `voiceName`.
- Changing voice marks dirty / saves with character doc.

### 6.3 Chat (later)

- When a character is `@`-attached, **Play** on assistant bubbles uses that character’s `voiceAssetId`.
- Strip markdown / tool fences; temporary blob per play (no `audio` asset yet).
- Autoplay off.

### 6.4 Cost display

- Estimate: `ceil(chars / 1000) * usd` for Gemini (and MiniMax later).
- Show near Say this / Play.

---

## 7. Implementation phases

**Gate:** Phase C does not start until you have tested Phase B (Gemini API + VOICE scaffold) and signed off.

```
Phase A ──► Phase B ──► [you test] ──► Phase C ──► Phase D+ …
voice          VOICE view              characters     chat / clone
assets         + Gemini
+ library
```

### Phase A — Voice asset types + library *(first)*

No fal TTS required yet.

- Extend `OpfsAssetSubtype` with `'voice'`; paths (`/matchdate/assets/voice/` if sample later; metadata always).
- `VoiceAssetMetadata` (`voiceName` required; `preset?`; GUID = `AssetDocument.id`).
- `assetDocument` helpers, save/load/delete/list, library reconcile + catalog `name` ↔ `voiceName`.
- Assets tab **VOICE** subtype filter; list row; rename/delete/favorite.
- Drag support for voice assets (library → drop targets later).

**Exit:** can create/rename/list/delete voice assets in the library; no Speak yet.

### Phase B — VOICE view + Gemini scaffold *(second — your test)*

- fal transport for Gemini (`subscribe` or queue REST on `VITE_FAL_KEY`).
- `models/tts/` with **Gemini only**; `ttsService.synthesizeSpeech` → temporary `Blob`.
- Nav: **VOICE** item + `/voice` route + `VoiceView` / designer components.
- Controls: style instructions, gender → preset, pace/temperature; `voiceName`.
- **Say this** → API → play blob; busy/error states.
- **Save** design to voice asset API from Phase A; **load** via select or drag from library.

**Exit:** you can design a voice, hear Gemini output, save/reload from library. **Pause for your API/scaffold check.**

### Phase C — Voice on characters *(after B sign-off)*

- `Character.voiceAssetId` + persistence + normalize.
- Sheet UI: attach / clear; show `voiceName` for bound GUID.
- Chat attach `write` includes `voiceAssetId` (+ optional `voiceName` for LLM).
- Brief `prompt-matchDate.md` note.

**Exit:** character keeps a voice across reload; attach exposes the link.

### Phase D — Chat TTS (later)

- Play on assistant messages; resolve from attached character’s voice (Gemini preset path).
- Temporary blobs only; strip markdown; no autoplay.

**Exit:** hear replies in the bound / default voice.

### Phase E — MiniMax cloning (later)

- Voice Clone + Speech 2.8 HD; sample blob source of truth; 7-day re-clone.
- Prefer MiniMax when sample-backed; Gemini for preset-only.

**Exit:** uploaded sample speaks as that character in chat / VOICE view.

### Phase F — Polish (optional)

- Optional **`audio`** asset subtype for persisted utterances.
- Identity → default Gemini voice; economy Kokoro; Turbo sliders; cost UI; abort on navigate.

---

## 8. Spec decisions (locked for v1)

| Decision | Choice |
|----------|--------|
| Build order | **A** library → **B** VOICE+Gemini (you test) → **C** characters → D chat → E clone |
| Controllable (no clone) model | **Gemini 3.1 Flash TTS** — `style_instructions` for accent/style/tone |
| Premium + clone model | MiniMax Speech 2.8 HD + Voice Clone |
| Demoted | Kokoro (speed-only) — optional economy later |
| Cloning | MiniMax Voice Clone; sample blob is source of truth |
| Asset subtype (now) | `voice` = design (preset / clone sample); **not** spoken lines |
| TTS / Say this output | **Temporary in-memory blobs** only |
| Asset subtype (later) | Optional `audio` for persisted utterances — deferred |
| Voice identity | `AssetDocument.id` (GUID); display name = `metadata.voiceName` (renameable) |
| Character field | `voiceAssetId?: string` (GUID, never voiceName) |
| Autoplay | Off; explicit Play / Say this |
| Music / SFX / lip-sync | Deferred (§9) |
| fal client | Extend with queue/subscribe; do not route TTS through OpenRouter chat |

---

## 9. Deferred research (from LuxNova LN-audio)

Not implementing now; keep for later MatchDate media work:

| Area | Prior shortlist |
|------|-----------------|
| **`audio` asset subtype** | Persist TTS utterances (distinct from `voice` design assets) |
| Music | Lyria 3 Pro, ACE-Step, MiniMax Music 2.6 |
| SFX | ElevenLabs SFX v2, MMAudio V2 |
| Multi-speaker dialogue | Gemini 3.1 Flash TTS multi-speaker, ElevenLabs Text-to-Dialogue |
| Video voice / lip-sync | Kling Create Voice + LipSync, ffmpeg merge |
| Zero-shot TTS without MiniMax expiry | Seed Audio 1.0, Chatterbox |

Full candidate tables, prices, and case studies lived in the prior LuxNova-oriented draft of this file (git history / 2026-09-29 research). Re-verify `llms.txt` before any deferred work.

---

## 10. Price / schema re-verify checklist (before / during Phase B)

| Item | Action |
|------|--------|
| Gemini 3.1 Flash TTS (`style_instructions`, voices) | [llms.txt](https://fal.ai/models/fal-ai/gemini-3.1-flash-tts/llms.txt) — re-fetched 2026-10-23 |
| fal queue / `fal.run` auth with `VITE_FAL_KEY` | Spike in Phase B with same key as chat |
| MiniMax Speech 2.8 HD / Voice Clone | Before Phase E only |
| ElevenLabs Turbo / Seed Audio / Kokoro | Phase F alternate only |

---

## 11. Sources

- fal explore: [Text-to-Speech APIs](https://fal.ai/explore/text-to-speech-apis)
- TTS: [gemini-3.1-flash-tts](https://fal.ai/models/fal-ai/gemini-3.1-flash-tts/llms.txt) · [elevenlabs/tts/turbo-v2.5](https://fal.ai/models/fal-ai/elevenlabs/tts/turbo-v2.5/llms.txt) · [minimax/speech-2.8-hd](https://fal.ai/models/fal-ai/minimax/speech-2.8-hd/llms.txt) · [minimax/voice-clone](https://fal.ai/models/fal-ai/minimax/voice-clone/llms.txt) · [kokoro/american-english](https://fal.ai/models/fal-ai/kokoro/american-english/llms.txt) · [seed-audio-1.0](https://fal.ai/models/bytedance/seed-audio-1.0/llms.txt) · [chatterbox](https://fal.ai/models/fal-ai/chatterbox/text-to-speech/llms.txt)
- MatchDate: `src/services/fal/falClient.ts`, `src/services/fal/models/chat/`, `src/types/opfsDoc.ts`, `src/types/character.ts`, `src/features/chat/attach/jsonAttach.ts`, `docs/MD-AssetLibrary.md`, `docs/MD-Chat-Feature.md`
