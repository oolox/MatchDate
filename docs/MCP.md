# MasterDater — fal MCP research

> **Purpose:** Capture what fal’s **Model Generation MCP** (`https://mcp.fal.ai/mcp-relay`) is, whether it can replace MasterDater’s fal API layer, and how we should (and should not) integrate it as we add **video** and **audio** generation.

**Last updated:** 2026-11-13  
**Status:** research / scoping (no code change).  
**Related:** [`MD-audio.md`](./MD-audio.md), [`MD-Models.md`](./MD-Models.md), [`MD-Chat-Feature.md`](./MD-Chat-Feature.md), [`MD-imageAssets.md`](./MD-imageAssets.md), `src/services/fal/falClient.ts`

**Primary sources (re-check before shipping):**

- [fal MCP server docs](https://fal.ai/docs/documentation/setting-up/mcp)
- [fal MCP product page](https://fal.ai/mcp)
- [Cursor setup](https://fal.ai/docs/documentation/setting-up/mcp/cursor)
- [Launch blog (Mar 2026)](https://blog.fal.ai/connect-your-ai-to-1-000-models-with-the-fal-mcp-server/) — older URL / API-key examples; prefer current docs for OAuth relay

---

## 0. TL;DR

| Question | Answer |
|----------|--------|
| What is `mcp.fal.ai/mcp-relay`? | Hosted **MCP** endpoint so **AI assistants** (Cursor, Claude, ChatGPT, …) can search/run fal models via tools |
| Can we **replace** `falClient` / `fal.run` in the MasterDater SPA? | **No** — wrong client, wrong auth, wrong control plane for a product UI |
| Useful for MasterDater? | **Yes, as a research & agent-dev surface** (discover models, schemas, pricing, spike video/audio) |
| Right runtime for in-app generation? | Keep **`fal.run` + `VITE_FAL_KEY`** (or `@fal-ai/client` queue); mirror MCP’s **submit → poll → result** semantics for long jobs |
| Video / long audio later? | Use fal **Queue** (`submit` / `status` / `result`) — same pattern MCP wraps as `submit_job` / `check_job` / `get_job_result` |

**Recommendation:** Do **not** route chat TTS, vision, or future user-facing image/video/audio through MCP. Use MCP in Cursor to pick models and learn schemas; implement MasterDater media jobs on the existing fal HTTP layer (extend with queue helpers).

---

## 1. What fal MCP is

### 1.1 Model Generation Server

fal documents three MCP-related surfaces:

| Surface | URL | Role |
|---------|-----|------|
| **Model Generation (relay)** | `https://mcp.fal.ai/mcp-relay` | Primary: search catalog, price, upload, run/queue image·video·audio·etc. |
| **Documentation MCP** | `https://fal.ai/docs/mcp` | Public docs search only — **no** generation, **no** account |
| **Platform MCP** | (separate product) | Account / serverless debugging — **not** the generation path |

Transport for the relay: **Streamable HTTP**. Auth for plugin / assistant clients: **OAuth browser sign-in** (no API key pasted into chat). Credits bill the user’s **Active MCP account**.

> Older blog posts show `https://mcp.fal.ai/mcp` + `Authorization: Bearer $FAL_KEY`. Current setup docs emphasize **`mcp-relay` + OAuth**. Treat the blog as historical; verify live client config before connecting.

### 1.2 Who the client is

MCP tools are invoked by an **assistant runtime** (Cursor Agent, Claude, ChatGPT plugin, …), not by a React `onClick` in MasterDater.

Flow:

```text
User ↔ AI assistant ↔ MCP tools ↔ fal Platform API ↔ model queue / CDN
```

MasterDater today:

```text
User ↔ MasterDater UI ↔ falFetch (VITE_FAL_KEY) ↔ fal.run / OpenRouter
```

Those are different products. MCP does not give the browser app a drop-in SDK.

### 1.3 Tool surface (model-generation server)

Documented tools (availability can change — check the client’s tool list):

| Tool | Purpose |
|------|---------|
| `search_models` | Catalog search (`query`, `category`, `limit`, `cursor`) |
| `recommend_model` | Task → candidate models |
| `get_model_schema` | Input/output JSON schema for an `endpoint_id` |
| `get_pricing` | Unit pricing (up to 50 ids); may throttle |
| `search_docs` | fal docs search |
| `run_model` | Run with **bounded wait (~45s)**; returns `completed` or `processing` + `request_id` |
| `submit_job` | Fire-and-forget queue; returns `request_id` immediately |
| `check_job` | Poll status (`status_url` optional) |
| `get_job_result` | Fetch completed output (`response_url` optional) |
| `cancel_job` | Cancel queued/running job |
| `upload_file` | CDN input: public `url`, base64 `data`, or `prepare_upload` signed PUT (≤ ~90 MB) |

Product page / marketplace listings may also mention extras (`estimate_cost`, `submit_jobs`, `wait_for_jobs`, account helpers, library save). **Authoritative list = connected client + current docs.**

**Categories** called out for search include: `text-to-image`, `image-to-video`, `text-to-video`, `text-to-speech`, `image-to-3d`, `image-editing`, `llm`, and more.

### 1.4 Cost & limits

- MCP **server itself is free**.
- Generations bill at **normal fal model rates** (same credits as API).
- Same **concurrency** limits as direct API.
- Docs stress: if `run_model` returns `processing`, **poll** — do **not** resubmit (new billable job).
- Long jobs (video, 3D, training): start with `submit_job` → `check_job` → `get_job_result`.

---

## 2. MasterDater fal layer today

| Path | Mechanism | Notes |
|------|-----------|--------|
| Auth | `VITE_FAL_KEY` → `Authorization: Key …` | `falClient.getFalHeaders` / `falFetch` |
| Chat LLM | `POST fal.run/openrouter/router/openai/v1/chat/completions` SSE | `chatService` — streaming; not a fal “queue model” in the MCP sense |
| Vision | `fal.run/openrouter/router/vision` | `visionService` |
| TTS | `fal.run/fal-ai/gemini-3.1-flash-tts` via `falFetch` | `ttsService` → temp blob; Say this + quote/dateSummary play |
| Queue / `@fal-ai/client` | **Not wired** | `MD-audio` already recommends queue REST or `fal.subscribe` for longer media |

Product requirements the SPA must keep:

- Deterministic models (registry ids, voice presets, cost labels)
- Abort / stop mid-play and mid-request (`AbortSignal`)
- Persist assets into **OPFS** (not only fal CDN URLs)
- End-user UX without Cursor OAuth
- SSE token streaming for chat (MCP `run_model` is not a substitute)

---

## 3. Could MCP replace our fal API layer?

### 3.1 Verdict: **No as the app transport**

| Concern | MCP relay | MasterDater needs |
|---------|-----------|-----------------|
| Client | Assistant MCP host | Browser SPA |
| Auth | OAuth (or key in **IDE** MCP config) | App-held `VITE_FAL_KEY` (or future user-scoped proxy) |
| Streaming chat | Not the design | Required for composer |
| Latency / UX | Tool turns + 45s bounded wait | Immediate button → progress → blob/OPFS |
| Abort | Job cancel tools; assistant-mediated | Sync stop on play button / abort controllers |
| Discovery | Soft `recommend_model` | Hard registries + prompts |
| Media home | fal CDN / assistant download links | MasterDater library + character binding |

Replacing `falFetch` with “call MCP tools from the browser” would mean embedding an MCP client + OAuth in the web app for every user — far heavier than fal.run, and still a poor fit for SSE chat.

### 3.2 What MCP *can* replace (narrowly)

| Use | Fit |
|-----|-----|
| Manual model research in Cursor | **Excellent** |
| Spike “which TTS / video endpoint?” before coding registries | **Excellent** |
| One-off generate-and-inspect during design | **Good** |
| Runtime for Say this / chat Play / future Generate Video | **Poor** |
| OpenRouter chat completions streaming | **Out of scope** for MCP generation tools |

### 3.3 Relationship to fal Platform API

MCP is a **tool facade** over fal’s platform (catalog + queue + CDN upload). MasterDater already talks to the same underlying platform via **`fal.run`**. Replacing MCP with nothing; replacing `fal.run` with MCP would only add an assistant-shaped hop.

Conceptual mapping:

| MCP tool | Closest MasterDater / fal API idea |
|----------|-----------------------------------|
| `run_model` | `fal.run/<endpoint>` or short `subscribe` |
| `submit_job` / `check_job` / `get_job_result` | fal **Queue** submit / status / result |
| `upload_file` | `fal.storage.upload` / signed upload |
| `get_model_schema` / `get_pricing` | Model page `llms.txt` + our registries |
| `search_models` / `recommend_model` | Dev research only |

---

## 4. Video & audio generation (future) — implications

### 4.1 Audio (beyond current Gemini TTS)

Already in product: short TTS via sync-ish `fal.run` + download blob.

Likely next (from `MD-audio`): MiniMax clone, longer utterances, optional persisted `audio` assets.

| Path | Guidance |
|------|----------|
| Short TTS | Keep `ttsService` + `falFetch` |
| Clone / longer jobs | Add **queue** helper; same semantics as MCP `submit_job` chain |
| MCP | Use in Cursor to compare endpoints / schemas / price before locking a registry entry |

### 4.2 Video (new)

Video is almost always **long-running** → MCP docs say use queue tools from the start. MasterDater should do the same on the API:

```text
submit (endpoint_id, input)
  → request_id
poll status (respect poll_after_seconds)
  → COMPLETED
get result
  → media URL(s)
download → OPFS asset (subtype video)
  → library + optional character / date attach
```

MCP is ideal for **picking** Kling / Wan / etc. and validating inputs once; the shipped app should call fal queue with `VITE_FAL_KEY`.

### 4.3 Image generation (if revived)

Same story as video but often short enough for `run_model`-style wait; still prefer direct `fal.run` / queue in-app for OPFS save and cost UI.

---

## 5. Integration scope (proposed)

### 5.1 In scope (recommended)

**A. Dev / agent workflow (now)**

1. Optionally connect Cursor to `https://mcp.fal.ai/mcp-relay` (OAuth) for MasterDater contributors.
2. Use tools to research candidates for:
   - image-to-video / text-to-video
   - TTS / voice clone
   - upscalers / edit models
3. Capture chosen `endpoint_id` + schema fields into `src/services/fal/models/**` registries (same pattern as chat/TTS).
4. Keep this doc + model pages as the product source of truth — not live `recommend_model` at runtime.

**B. Runtime media job layer (when building video / long audio)**

Add a small MasterDater service (names illustrative):

| Module | Responsibility |
|--------|----------------|
| `falClient.ts` | Existing key + `falFetch` |
| `falQueue.ts` (new) | `submitJob` / `checkJob` / `getJobResult` / `cancelJob` against fal Queue REST **or** `@fal-ai/client` |
| `falUpload.ts` (new, if needed) | CDN upload for image/audio reference inputs |
| `videoService.ts` / extended `ttsService` | Product APIs; call queue; map results → Blob / OPFS |

Design the queue API to **mirror MCP job semantics** so mental model and docs stay aligned — without speaking MCP on the wire.

**C. UI progress**

- Generating vs playing already exists for speech (`SayPlayButton`).
- Video: reuse the same mental model — **generating** (queue) vs **ready** (local asset / preview), with cancel → `cancelJob`.

### 5.2 Out of scope / non-goals

- Calling `mcp.fal.ai` from the MasterDater browser bundle.
- Replacing OpenRouter SSE chat with MCP `run_model`.
- End-user OAuth to fal MCP as the only way to generate.
- Dynamically picking models every turn via `recommend_model` in production (unstable UX + cost surprises).
- Relying on fal CDN URLs as permanent library storage (download into OPFS; CDN is ephemeral / expiration-based).

### 5.3 Optional later (only if product becomes agent-shaped)

If MasterDater ships an **in-app agent** that should “use tools” to generate media:

1. Prefer a **MasterDater-owned tool layer** that wraps `falQueue` / `ttsService` (deterministic, audited).
2. Or host a **backend MCP bridge** with server-side fal key — still not the public `mcp-relay` OAuth path for random users.
3. Do not point end users at Cursor’s fal plugin.

### 5.4 Suggested phases

| Phase | Work | MCP role |
|-------|------|----------|
| **0 — Research** | This doc; Cursor MCP optional | Discovery |
| **1 — Queue primitive** | `falQueue` + one spike model (short video or long TTS) | Schema/price via MCP or `llms.txt` |
| **2 — Video MVP** | Generate → poll → OPFS `video` asset → library | Confirm endpoint via MCP once |
| **3 — Audio expansion** | Clone / multi-speaker per `MD-audio` | Compare candidates via MCP |
| **4 — Unified Generate UI** | Shared progress/cancel; cost estimate from registry | No MCP at runtime |

---

## 6. Practical Cursor usage (contributors)

Manual MCP config shape (from fal Cursor docs):

```json
{
  "mcpServers": {
    "fal": {
      "url": "https://mcp.fal.ai/mcp-relay"
    }
  }
}
```

Then complete **browser sign-in** in Cursor Customize → MCP. Prefer marketplace plugin if available.

Safe first prompt (docs):

```text
Use fal to search for image generation models. Do not run a model.
```

For MasterDater spikes, prefer prompts that **stop before spend**:

```text
Use fal to recommend text-to-video models and show get_pricing for the top 3.
Do not run or submit a job.
```

---

## 7. Open questions

1. **Prod key architecture:** Keep shared `VITE_FAL_KEY` vs per-user / server proxy before expensive video is enabled.
2. **`@fal-ai/client` vs raw queue REST:** `MD-audio` left this open; pick when implementing `falQueue` (MCP won’t decide).
3. **CDN TTL:** MCP `expiration_seconds` vs MasterDater always copying media into OPFS immediately.
4. **Whether Platform MCP** is useful for serverless experiments — only if we deploy custom fal apps (not planned).

---

## 8. Decision record

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Replace SPA fal layer with MCP? | **No** | Assistant protocol ≠ product API |
| Use MCP in development? | **Yes (optional)** | Fast catalog / schema / pricing research for video & audio |
| Runtime for future video/audio? | **fal.run + Queue** | Abortable, key-based, OPFS-friendly; same semantics MCP wraps |
| Chat / vision | **Keep current OpenRouter-via-fal paths** | SSE + existing registries |

---

## 9. References

- fal MCP setup: https://fal.ai/docs/documentation/setting-up/mcp  
- fal MCP overview: https://fal.ai/mcp  
- Cursor: https://fal.ai/docs/documentation/setting-up/mcp/cursor  
- Docs-only MCP: https://fal.ai/docs/mcp  
- MasterDater fal auth: `src/services/fal/falClient.ts`  
- MasterDater TTS: `src/services/fal/ttsService.ts`  
- MasterDater chat: `src/services/fal/chatService.ts`  
- Audio roadmap: `docs/MD-audio.md`  
