# MatchDate — Models

> **Purpose:** Document how MatchDate talks to LLMs through FAL/OpenRouter — current models, registry design, request flow, and how to add or switch models.

**Last updated:** 2026-09-01  
**Scope:** FAL chat completions, model registry, per-session overrides, and planned model picker work.

Related: [`MD-Chat-Feature.md`](./MD-Chat-Feature.md) (full chat pipeline), [`MD-portingGuide.md`](./MD-portingGuide.md) (implementation phases), [`MD-Filesystem.md`](./MD-Filesystem.md) (`modelId` on session documents).

---

## 1. Architecture overview

MatchDate does **not** call model providers directly. All chat traffic goes through **fal.ai’s OpenRouter router**, which exposes an OpenAI-compatible chat completions API.

```
┌─────────────────────────────────────────────────────────────────┐
│  UI (planned)                                                    │
│  ChatModelPicker, session model override                         │
└────────────────────────────┬────────────────────────────────────┘
                             │ model id (registry key)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  streamChatTurn                                                  │
│  Builds [system, history, user] → calls chatService              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  chatService.streamCompletion                                    │
│  Resolves id → ChatModelConfig → POST SSE body                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────────────┐
│  models/chat/index.ts    │   │  falClient.falFetch                │
│  CHAT_MODELS registry    │   │  Authorization: Key VITE_FAL_KEY   │
└──────────────────────────┘   └──────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  FAL OpenRouter (OpenAI-compatible SSE)                        │
│  POST https://fal.run/openrouter/router/openai/v1/chat/completions │
└─────────────────────────────────────────────────────────────────┘
```

### 1.1 Layer responsibilities

| Layer | File(s) | Role |
|-------|---------|------|
| **Auth / HTTP** | `src/services/fal/falClient.ts` | Reads `VITE_FAL_KEY`, sets `Authorization: Key …`, throws on non-OK responses |
| **Streaming** | `src/services/fal/chatService.ts` | Builds request body, consumes SSE, calls `onChunk` / `onDone` / `onError` |
| **Registry** | `src/services/fal/models/chat/*` | Maps app model ids → OpenRouter slugs and display metadata |
| **Turn builder** | `src/features/chat/streamChatTurn.ts` | Assembles messages (system + history + user) and delegates to `chatService` |
| **Persistence hook** | `types/session.ts`, `types/chat.ts` | Optional per-session `modelId` stored in OPFS session JSON |

### 1.2 Two different “model” strings

Keep these distinct:

| Name | Example | Where used |
|------|---------|------------|
| **Registry id** | `deepseek/deepseek-v4-flash` | Redux, `localStorage`, `thread.modelId`, `streamCompletion({ model })` |
| **OpenRouter slug** | `deepseek/deepseek-v4-flash` | `body.model` in the FAL POST (from `ChatModelConfig.modelName`) |

In MatchDate v1, registry ids and OpenRouter slugs are **the same string** for every model. The registry exists so the UI can show friendly labels and so legacy ids can be remapped without touching stored session data.

---

## 2. FAL endpoint and request shape

### 2.1 Endpoint

```ts
export const FAL_CHAT_COMPLETIONS_URL =
  'https://fal.run/openrouter/router/openai/v1/chat/completions';
```

- **Method:** `POST`
- **Auth:** `Authorization: Key <VITE_FAL_KEY>`
- **Response:** Server-Sent Events (`data: {…}` lines, terminated by `data: [DONE]`)

### 2.2 Request body

```ts
{
  model: chatModel.modelName,   // OpenRouter slug from registry
  messages: ChatMessage[],      // { role, content }
  stream: true,
  response_format: { type: 'text' },
}
```

### 2.3 Optional thinking toggle (DeepSeek V4)

`chatService.streamCompletion` accepts `thinking?: boolean`. When set:

| `thinking` | Extra body fields |
|------------|-------------------|
| `true` | `reasoning_effort: 'high'`, `thinking: { type: 'enabled' }` |
| `false` | `thinking: { type: 'disabled' }` |
| `undefined` | omitted (provider default) |

Not wired in the UI yet; reserved for a future “thinking” control on DeepSeek V4 models.

### 2.4 Message assembly (`streamChatTurn`)

Each user send produces:

```
[system prompt]          ← active preset or per-session override
[history messages]       ← prior turns (user content from apiContent when set)
[user content]           ← current composer text
```

`streamChatTurn` passes an optional `model` through to `chatService`. If omitted, `DEFAULT_CHAT_MODEL_ID` is used.

---

## 3. Current models (shipped)

As of Phase 3, the registry contains **one** model:

| Registry id | Label | Short | OpenRouter slug | Default | Description |
|-------------|-------|-------|-----------------|---------|-------------|
| `deepseek/deepseek-v4-flash` | DeepSeek V4 Flash | `fla` | same | **Yes** | Everyday chat and long-context work |

**Source:** `src/services/fal/models/chat/deepseekV4Flash.ts`  
**Default constant:** `DEFAULT_CHAT_MODEL_ID` in `src/services/fal/models/chat/index.ts`

**Spike script:** `npm run fal:spike` (`scripts/fal-phase0-spike.mjs`) hardcodes this slug for a live API smoke test.

**Tests:** `src/services/fal/chatService.test.ts` asserts the default POST body uses `deepseek/deepseek-v4-flash`.

---

## 4. Planned model lineup

The porting guide and LuxNova reference target **four** chat models on the same FAL/OpenRouter path. These are documented for UI/picker work; only Flash is registered in MatchDate today.

| Registry id | Label | Short | Best for | Notes |
|-------------|-------|-------|----------|-------|
| `deepseek/deepseek-v4-flash` | DeepSeek V4 Flash | `fla` | Everyday chat, long context | **Default** — shipped |
| `deepseek/deepseek-v4-pro` | DeepSeek V4 Pro | `pro` | Hard reasoning, planning | Supports thinking toggle |
| `aion-labs/aion-2.0` | Aion 2.0 | `aio` | Roleplay, storytelling, creative writing | ~131k context |
| `meta-llama/llama-4-maverick` | Llama 4 Maverick | `mav` | General chat | Multimodal-capable on OpenRouter |

Reference implementations (including `cost` and `contextLength` fields) live in the LuxNova repo under `src/services/fal/models/chat/`.

### 4.1 Extended registry type (target)

MatchDate’s `ChatModelConfig` is currently slim:

```ts
// src/services/fal/models/chatTypes.ts (today)
export interface ChatModelConfig {
  id: string;
  label: string;
  modelName: string;
  shortLabel?: string;
  description?: string;
}
```

When adding the full picker, extend toward the LuxNova shape:

```ts
export type ChatModelCost = {
  inputUsdPerMt: number;
  outputUsdPerMt: number;
  cacheReadUsdPerMt?: number;
};

export type ChatModelConfig = {
  id: string;
  label: string;
  modelName: string;
  shortLabel?: string;
  description: string;
  contextLength?: number;   // for attachment warnings
  cost: ChatModelCost;      // display estimates in Config UI
};
```

Pricing is indicative — confirm live rates on [openrouter.ai](https://openrouter.ai) and fal model pages before showing cost in UI.

---

## 5. Model registry API

**Directory:** `src/services/fal/models/chat/`

| Export | Status | Purpose |
|--------|--------|---------|
| `CHAT_MODELS` | Shipped | `Record<id, ChatModelConfig>` |
| `DEFAULT_CHAT_MODEL_ID` | Shipped | Default when no override |
| `getChatModel(id)` | Shipped | Resolve id → config; throws if unknown |
| `listChatModels()` | Planned | `Object.values(CHAT_MODELS)` for picker |
| `isKnownChatModelId(id)` | Planned | Validate stored prefs / session overrides |
| `resolveChatModelId(id)` | Planned | Map retired ids (e.g. legacy Euryale → Aion 2.0) |
| `chatModelTabLabel(model)` | Planned | 3-letter subheader tab label |

### 5.1 Adding a new model

1. Create `src/services/fal/models/chat/<name>.ts` exporting `*_ID` constant and `ChatModelConfig` object.
2. Register it in `CHAT_MODELS` inside `index.ts`.
3. Re-export the id constant from `index.ts` if other modules need it.
4. Add a unit test row in `chatModels.test.ts` (when that file exists) validating unique ids and required fields.
5. Wire the picker UI (`ChatModelPicker`) to call `listChatModels()`.

Example stub:

```ts
// src/services/fal/models/chat/deepseekV4Pro.ts
import type { ChatModelConfig } from '../chatTypes';

export const DEEPSEEK_V4_PRO_ID = 'deepseek/deepseek-v4-pro';

export const deepseekV4Pro: ChatModelConfig = {
  id: DEEPSEEK_V4_PRO_ID,
  label: 'DeepSeek V4 Pro',
  modelName: DEEPSEEK_V4_PRO_ID,
  shortLabel: 'pro',
  description: 'Hard reasoning, planning, and careful analysis',
};
```

```ts
// index.ts — add to CHAT_MODELS
import { deepseekV4Pro, DEEPSEEK_V4_PRO_ID } from './deepseekV4Pro';

export const CHAT_MODELS: Record<string, ChatModelConfig> = {
  [DEEPSEEK_V4_FLASH_ID]: deepseekV4Flash,
  [DEEPSEEK_V4_PRO_ID]: deepseekV4Pro,
};
```

No changes to `chatService.ts` are required if `modelName` is the correct OpenRouter slug.

---

## 6. Model selection and persistence

### 6.1 Resolution order (target)

When sending a message, the effective model id should resolve as:

1. **Per-session override** — `thread.modelId` if it is a known registry id
2. **Global preference** — `localStorage` key `txtModel` (planned)
3. **Default** — `DEFAULT_CHAT_MODEL_ID`

Planned helper (not yet in MatchDate; pattern from porting docs):

```ts
export function resolveThreadChatModel(
  thread: Thread | undefined,
  fallback: string,
): string {
  const modelId = thread?.modelId?.trim();
  if (modelId && Object.prototype.hasOwnProperty.call(CHAT_MODELS, modelId)) {
    return modelId;
  }
  return fallback;
}
```

### 6.2 Where `modelId` is stored

| Location | Field | Status |
|----------|-------|--------|
| `Thread` | `modelId?: string` | Type defined; not set by UI yet |
| `SessionDocument.text` | `modelId?: string` | Persisted to OPFS when thread is saved |
| Redux `thread` slice | via `loadThread` / `applyThreadToSession` | Round-trips with session save |

`MessageComposerContainer` does **not** pass `model` to `streamChatTurn` yet — every turn uses the default Flash model.

### 6.3 UI work remaining

| Component | Purpose |
|-----------|---------|
| `ChatModelPicker` | Tabs or dropdown in chat subheader |
| `resolveThreadChatModel` | Pick model at send time |
| `localStorage` `txtModel` | Remember last global choice |
| Context warnings | When `contextLength` is small and `@` attachments are large (see `MD-Chat-Feature.md` §6) |

---

## 7. Environment and security

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_FAL_KEY` | Yes | fal API key; read at build/runtime via `import.meta.env` |

- `.env` is gitignored; `.env.example` shows the placeholder.
- The key is embedded in the browser bundle — acceptable for personal/local use; use a backend proxy for production.

---

## 8. File map

| Path | Role |
|------|------|
| `src/services/fal/falClient.ts` | API key, headers, `falFetch` |
| `src/services/fal/chatService.ts` | SSE streaming, thinking body flags |
| `src/services/fal/chatService.test.ts` | Default model + abort behavior |
| `src/services/fal/models/chatTypes.ts` | `ChatModelConfig` type |
| `src/services/fal/models/chat/index.ts` | Registry + `getChatModel` |
| `src/services/fal/models/chat/deepseekV4Flash.ts` | Default model entry |
| `src/features/chat/streamChatTurn.ts` | Message list + `model` passthrough |
| `src/types/chat.ts` | `Thread.modelId` |
| `src/types/session.ts` | `SessionTextFields.modelId` |
| `scripts/fal-phase0-spike.mjs` | Live streaming smoke test |

---

## 9. Quick reference

**Default model id:** `deepseek/deepseek-v4-flash`

**Minimal streaming call (conceptual):**

```ts
await chatService.streamCompletion({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello' },
  ],
  onChunk: (delta) => { /* accumulate */ },
  onDone: () => {},
  onError: (err) => {},
});
```

**Turn entry point:**

```ts
await streamChatTurn({
  systemPrompt,
  historyMessages,
  userContent,
  model: 'deepseek/deepseek-v4-flash', // optional; defaults to Flash
  signal,
  abortRef,
  controller,
  onChunk,
  onDone,
  onError,
  notify,
});
```

---

## 10. Related reading

| Doc | Section |
|-----|---------|
| [`MD-Chat-Feature.md`](./MD-Chat-Feature.md) | §2 FAL layer, §2.6 registry, §6 `@` attachments + context limits |
| [`MD-portingGuide.md`](./MD-portingGuide.md) | Phase 0 spike, Phase 1 model registry note |
| [`MD-Filesystem.md`](./MD-Filesystem.md) | Session JSON `modelId` field |
