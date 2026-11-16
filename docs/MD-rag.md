# MasterDater — RAG and agents

> **Purpose:** High-level research on how MasterDater could stop pasting the whole value model and system prompt into every chat call, and instead **retrieve** the pieces a turn actually needs — then how an **agent** would use that retrieval. Written for someone new to both ideas.
>
> **Status:** research, plus a first retrieval pipeline in the app (no embeddings, no second model). See [What is in the app](#what-is-in-the-app).
>
> **Last updated:** 2026-11-15
>
> **Related:** [`MD-ValueModel.md`](./MD-ValueModel.md), [`MD-CharacterPrompt.md`](./MD-CharacterPrompt.md), [`MD-tools.md`](./MD-tools.md), [`MD-Models.md`](./MD-Models.md), [`MD-Chat-Feature.md`](./MD-Chat-Feature.md), [`prompts/prompt-masterDater.md`](../prompts/prompt-masterDater.md)

---

## Revert point

Baseline before any RAG or agent implementation. There is no pull request for this work. The branch is `main`, in sync with `origin/main`.

| | |
|--|--|
| Remote | https://github.com/oolox/MatchDate.git |
| Branch | `main` |
| Commit | `cf3f3ca912df8119ab00d8810c318dc9c041a832` |
| Subject | Add datePlan tool and paired dateHistory for plan, transcript, and summary. |
| Date | 2026-11-15 |

To drop later RAG changes and return to this tree: `git checkout cf3f3ca912df8119ab00d8810c318dc9c041a832`. This doc itself is not in that commit.

### What is in the app

Each send builds the system message in `assembleChatContext`:

- The MasterDater prompt is split by heading. A date turn gets the date schemas. A plain question does not. Any other bundled prompt is still sent whole.
- The session’s value-model text is retrieved on **every** turn. A Schwartz model contributes the definitions plus the passages that name the attached characters’ top scores. Any other model is sent whole. The active list lives on the session (`valueModelIds`). The dropdown still picks one. An empty list means none.
- `weight` and `recentHistoryCount` live on the session (defaults 50 and 3). `set weight N` and `set history N` update them before the model replies.
- Character tool fences sent to the model keep the last N history beats. Traits stay.

Not built: embeddings, memory search, a tool-calling loop, and the clerk retry.

---

## 0. TL;DR

| Question | Answer |
|----------|--------|
| What is RAG? | Look up a few relevant passages, paste those into the prompt, then generate. Retrieval-Augmented Generation. |
| What is an agent? | A loop that can decide “I need more information or a tool” before it writes the final reply. Today MasterDater is one shot: one model call, then the app parses JSON tools out of the reply. |
| Should we embed the current prompt and value model into a vector database? | **Not yet.** Both documents are small and highly structured. Embedding them would be less reliable than picking sections on purpose. |
| What *should* change? | Split “rules the model must always obey” from “reference it should see only when relevant.” Inject the rules every turn. Retrieve value-model passages from the characters’ scores, and retrieve prompt sections from what the user is trying to do. |
| Where do agents fit? | First as a **fixed pipeline** the app runs (route → retrieve → write → apply tools). Later, if needed, as a model that chooses tools itself. |
| When do real embeddings earn their keep? | When the library outgrows the window: long date histories, many characters, several behavioral-model essays, user text assets. |

**Recommendation:** treat the system prompt as a constitution (always present, short) and the value model as a reference book (fetched by the values actually in play). Add a vector index only after section-and-score retrieval is not enough.

---

## 1. Primer

### 1.1 What happens in a normal chat call

A chat model does not “know” MasterDater. Each request is a fresh list of messages. The app builds that list in `streamChatTurn`:

```text
system   ← instructions (who you are, how to behave, which JSON to emit)
history  ← earlier user and assistant turns
user     ← this turn’s text, plus any @-attached character JSON
```

Whatever is not in that list is invisible. There is no separate memory of “the value model” unless we put it in one of those messages.

### 1.2 What RAG is

RAG adds a lookup step before the model writes:

```text
question  →  find a few passages  →  paste them into the prompt  →  model answers
```

The letters:

| Piece | Plain meaning | MasterDater example |
|-------|----------------|---------------------|
| **Corpus** | The pile of text you might need | Value-model doc, prompt sections, character history, past dates, library text assets |
| **Chunk** | One labeled slice of that pile | “Stimulation vs. Security” section, or the `dateTranscript` rules |
| **Retrieve** | Pick the slices that matter for *this* turn | A date between a thrill-seeker and a homebody pulls the clash write-up, not the whole essay |
| **Augment** | Paste those slices into the prompt | They show up as a “reference” block under the short system rules |
| **Generate** | The model writes, using that paste as its source | Compatibility talk and scores follow the retrieved definitions |

People often picture RAG as “embeddings + a vector database.” That is one way to retrieve. It is not the only way, and it is the wrong first tool for a ten-value circle.

**Embeddings**, in one sentence: a model turns a paragraph into a list of numbers so that similar meanings land near each other. Search becomes “find the nearest numbers,” which is useful when you cannot predict the wording. It is weak when the right passage is a specific table row you could have named directly.

### 1.3 What an agent is

An agent is not a different kind of model. It is a **loop**:

```text
look at the task
  → decide you need a tool or a document
  → call it
  → read the result
  → either call something else, or write the final answer
```

A tool is anything the loop can call: search the value model, load a character, write a history beat, synthesize speech. The model proposes the call; the app performs it and returns the result.

MasterDater already has the *second half* of tools. The model emits fenced JSON (`character`, `datePlan`, `dateTranscript`, `dateSummary`). After the stream finishes, the app parses that JSON and writes the library. There is no loop. The model cannot look something up, see the result, and then continue. It has to guess from whatever was pasted in at the start.

Two shapes, from simpler to freer:

| Shape | Who decides the steps | Fit for MasterDater |
|-------|------------------------|---------------------|
| **Pipeline** | The app. Same stages every turn, with branches. | Best first step. Predictable, testable, cheap. |
| **Tool-calling agent** | The model. It chooses tools until it stops. | Later, for open questions (“compare these three and only update the one who changed”). Easy to wander, easy to skip a required tool. |

A pipeline can still be described as “an agent” in product language. The important design choice is that **the app owns the plan** until a free-form loop proves necessary.

---

## 2. What the app does today

One model call does every job: role-play, compatibility judgment, date scripting, and sheet updates.

| Input | Where it comes from | When it is sent |
|-------|---------------------|-----------------|
| System prompt | Whole bundled file, default `prompts/prompt-masterDater.md` (~300 lines: role, trait rules, date protocol, every tool schema) | Every turn |
| Value model (“preprompt”) | A library text asset, default name `MD-ValueModel.md`, chosen in the value-model dropdown and stored on the session | **Every turn**, as retrieved passages (the whole asset when it is not Schwartz). This replaced a first-message-only paste |
| Characters | `@` mentions become fenced JSON (`name`, identity, all ten scores, traits, history) | The turn they are attached. History on the wire is the last N beats (default 3). Traits stay whole |
| Session weight | Field on the session. `set weight N` writes it. One line is injected each turn | Every turn |

`assembleChatContext` runs on every send, then `streamChatTurn` still sends `system + history + user` to FAL OpenRouter. There is no agent loop and no embedding index. Character history older than the last N beats is still on the sheet, and is not searched by meaning yet.

---

## 3. What to pin, and what to retrieve

This is the design rule that keeps RAG from making the product worse.

**Pin** text the model must follow even when retrieval misses. Keep it short and send it every turn.

**Retrieve** text that is true, long, and only sometimes relevant. If the lookup fails, the reply should get more generic, not break the product.

| Kind | Examples | Treatment |
|------|----------|-----------|
| Constitution | Voice (“speak as the character”, “do not mention scores”), tool envelope shape, “do not invent value names”, emit order for a date | Always in the system message |
| Playbook | Conversation-in-character vs. date scene, trait-tag table, per-tool JSON examples, the `weight` rubric | Retrieved by **intent** |
| Value reference | Definitions, higher-order dimensions, adjacent pairs, opposite clashes, romantic compromises | Retrieved by **the scores on the attached characters** |
| Memory | Old history beats, past date transcripts, unused characters, extra essays in the library | Retrieved by **who is in the scene**, and later by semantic search |

Do not retrieve the constitution. If a vector search drops “emit `datePlan` before the transcript,” the date UI breaks. Do not pin the whole value-model essay forever either: most turns need two or three passages, and models follow a long stuffed prompt less carefully than a short one (the middle gets ignored).

The current bundled prompt mixes all four kinds in one file. The rearchitecture is mostly a split, not a new database.

---

## 4. Rearchitecture

### 4.1 Target shape of one turn

```text
user text + attached character ids
        │
        ▼
┌───────────────────┐
│ 1. Intent         │  conversation | date | sheet edit | question | mixed
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 2. Retrieve       │  value passages (from scores)
│                   │  prompt sections (from intent)
│                   │  memory slices (history / traits / past dates)
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 3. Assemble       │  pinned rules
│                   │  + retrieved reference
│                   │  + short character cards
│                   │  + recent chat
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 4. One writer     │  same streaming call we have now
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 5. Apply tools    │  existing parse → library / dateHistory
└───────────────────┘
```

The writer still speaks to the user. Retrieval changes what it is allowed to see, not the chat UI.

### 4.2 Value model: retrieve by scores, not by vibe

`MD-ValueModel.md` is a small reference book with stable headings: ten definitions, four dimensions, adjacent pairs, four opposite clashes, three romance write-ups. The right passage is determined by numbers we already store.

For each attached character, take the top one or two `attributes` (highest `value`). Then:

| Situation | What to pull |
|-----------|----------------|
| Any scoring or comparison | One-line definition of each value that is high or being edited |
| Two characters | The higher-order dimension of each top value, plus the adjacent-pair note if they neighbor, or the opposite-clash note if they face each other |
| A date | The matching “Romantic Relationships” subsection (rebel/rule-follower, thrill-seeker/homebody, altruist/alpha, or a natural-match blurb) |
| User asks about a named value | That value’s row only |

Hedonism sits on a border; if it is a top value, also pull the short “Role of Hedonism” note.

This lookup is a table, not a similarity search. “They want different weekends” does not need an embedding to land on Stimulation vs. Security if those are the top scores. Embeddings can miss that heading because the user’s words and the heading do not look alike.

Send the retrieved passages **every turn they apply**, including turn two and later. That closes the first-message-only preprompt gap without pasting the full essay every time.

Sessions will carry more than one value model, and not all of them will be Schwartz. See [Decisions](#8-decisions): each active model is another book in the retrieval pack, not another agent. Schwartz keeps the score-to-passage table above. Any other model is chunked on its own headings and its own score names. A model with no fixed score list is sent as heading chunks, then by embedding, until it grows enough structure to tag. Label every passage with the asset it came from so the writer can say which lens a judgment used.

### 4.3 System prompt: retrieve by intent

Split `prompt-masterDater.md` into sections the assembler can mix. The file can stay the authoring source; the app would load slices instead of the raw file.

| Section | Include when |
|---------|----------------|
| Role, boundaries, “hide the mechanics” | Always |
| Tool envelope (fence, `origin`, `action`, ids) | Always, compressed |
| In-character conversation | User is talking *to* a character |
| Trait continuity + tag table | A trait is being created, changed, or the user asks about appearance or personality facts |
| Date protocol and emit order | User asked for a date, or two characters are in a shared scene |
| `datePlan` / `dateTranscript` / `dateSummary` schemas | Same as date protocol — and only those schemas |
| `character` create/update schema | A sheet write is likely |
| Quote / other tools | Only if that tool is in play |

Intent can start as rules, not a model:

- Words like “date”, “go out”, two attached characters, or an existing date thread → date pack.
- Direct address of one character → conversation pack.
- “Change her eyes”, “add a trait”, “set Security to …” → trait or attribute pack.
- Otherwise → question pack (definitions + short character cards, no date schemas).

A later classifier (a tiny model call, or the same model with a constrained first step) can replace the keyword list when users describe scenes without the word “date”. Keep the keyword path as the fallback so a classifier failure still sends a safe pack.

`weight` is a field on the session document, not a line buried in the prompt. Default 50. When the user says `set weight`, the app updates the session and injects one line: “compatibility weight is 62.” The long rubric stays in the date pack. Today the number lives only inside `prompt-masterDater.md`.

### 4.4 Character memory: the first real RAG corpus

Scores and prompt sections do not need vectors. Character memory will.

Today an attach sends the whole sheet. A better card for the prompt:

- Name, identity, voice asset name if any
- Top values (name + score, not the unused low scores, unless the user is editing them)
- Traits that match the scene (physical traits for a date, conscience traits for an argument)
- The last N history beats. Default N is 3, stored on the session so a thread can change it
- Pointers to older beats and past dates, not their full text

When a reply needs an older beat (“the trip you took in March”), retrieval searches that character’s history summaries and date `shortSummary` lines, then pulls the matching entry. Full transcripts stay out of the prompt until the user asks what was said.

That index is the RAG system worth building:

| Stored | Why |
|--------|-----|
| History summaries, trait lines, date summaries | Short, factual, per character |
| Optional: transcript segments | Only if summary search is not enough |
| Each active value-model asset, plus other library text | One corpus per model; essays that are not models stay data |

Each chunk needs metadata the filter can use before any similarity math: `characterId`, `valueModelId`, `kind` (`history` | `trait` | `date` | `value-model` | `prompt`), `at`, value tags. Filter first (“this character, history only” or “this value model only”), then rank. Unfiltered vector search will mix one character’s dates into another’s voice, or one theory into another.

### 4.5 Where the index lives

MasterDater is a browser app. Chat goes to FAL; files live in OPFS. A RAG index should follow that, not add a server, until there is a reason to.

| Stage | Store | Lookup |
|-------|--------|--------|
| Now → first retrieval | In-memory maps built from the value-model headings, prompt sections, and the open character | Exact: value pair, intent, character id |
| Library starts to get long | Vectors next to the library (IndexedDB or an OPFS sidecar) | Filter by metadata, then nearest-neighbor in the browser |
| Embeddings | FAL/OpenRouter, same key and billing path as chat ([`MD-Models.md`](./MD-Models.md)). Run when a character or text asset is saved — not on every keystroke | Cache by chunk text so unchanged beats are not re-embedded |

Avoid a hosted vector database while the corpus is one user’s library. Revisit that only if search must run somewhere other than the browser, or if libraries become large enough that client-side ranking is slow. They will not be, for a long time, at the size of personal character sheets.

### 4.6 What the model should see (sketch)

Not an implementation — the shape of the assembled system message:

```text
[Pinned rules — always, short]

[Session] weight=50. Recent history: 3.
Active value models: Schwartz, <other asset name>.

[Value reference — retrieved, one labeled pack per model]
Schwartz
- Stimulation: …
- Security: …
- Clash: Thrill-seeker & homebody — …
<other model>
- …only the passages that match this turn…

[Playbook — retrieved]
- Date emit order and the three tool schemas needed this turn

[Characters — cards, not full dumps]
- Alex: top Stimulation 82, Hedonism 70. Traits: … Recent: …
- Blair: top Security 88, Tradition 74. Traits: … Recent: …

[Older memory — only if retrieved]
- 2026-03-02: they argued about a last-minute trip. Summary: …
```

Recent chat stays in the message list, as it does now. Retrieved memory should be **deduped against that chat** so the same story is not in both places.

---

## 5. Agents

### 5.1 Start with a pipeline

The loop in §4.1 is the agent. The app is the planner. The writer model does not choose whether to load a value model; the pipeline loads every model listed on the session, using that model’s own scores or headings. That keeps compatibility authoritative and keeps one voice when several models are active.

Stages and what each is allowed to do:

| Stage | Reads | Writes | Model? |
|-------|--------|--------|--------|
| Intent | User text, who is attached, session mode | A label: conversation, date, edit, question | Optional. Rules first |
| Retrieve | Label + character scores + library index | The reference block | No |
| Write | Pinned rules + reference + recent chat | User-visible prose and tool JSON | Yes, the existing streaming model |
| Apply | Tool JSON | Character sheets, date history | No. Already implemented after the stream |

One writer keeps voice consistent. Splitting “judge” and “novelist” into two model calls sounds cleaner and usually produces a date scene that ignores the judgment, or a judgment the scene contradicts. The same rule is why several value models do not become several agents: they are packs of text in this one call. If a numeric compatibility callout is wanted later, ask the **same** writer for a structured field inside `dateSummary`, and compute adjacency in the app from the active model’s rules so the number is not a vibe.

### 5.2 When a real tool loop is worth it

Move the planner into the model only for turns where the app cannot know the plan up front:

- “Update whoever actually changed, leave the other sheet alone.”
- “Find the date where they talked about moving, and continue from that.”
- “Score this new person against everyone in the library, then tell me the closest three.”

Those need a loop because the next read depends on the last result. The tools to expose, still high level:

| Tool | Why the loop needs it |
|------|------------------------|
| `search_memory` | Find history or dates by meaning, then read them |
| `get_character` | Load a sheet that was not @-mentioned |
| `get_value_passage` | Pull a clash or definition after the model notices which values matter |
| `list_characters` | Library-wide comparison |

Do **not** give the loop `update_character` as its only write path at first. Keep writes as the fenced JSON the app already validates. A loop that can both invent a scene and patch storage in the same breath is harder to undo. The accept path described in [`MD-tools.md`](./MD-tools.md) stays the gate.

Tool-calling here is the provider’s tool API (the model returns a tool name and arguments, the app returns a result, the model continues). That is different from today’s “tools,” which are JSON the model writes *into the answer*. Both can coexist: retrieval tools run before or during the loop; character and date tools remain the answer’s structured output.

### 5.3 A later multi-agent split (only if one writer fails)

If a single writer keeps dropping tools or mixing voices, split roles — not a swarm of peers talking to each other.

```text
Router (app)
  ├─ Archivist   retrieves memory and value passages; returns text, no user-facing prose
  ├─ Writer      one streaming voice; may be “in character” or narrator, not both at once
  └─ Clerk       checks the writer’s JSON against schemas and attached ids; no creativity
```

Decided shape: the archivist is retrieval (no model). The clerk is the parser that already exists, still not a model. It checks the writer’s JSON after the stream. On a hard miss — `dateSummary` date or location differs from the plan, a required tool is missing, or a character id was invented — send that error back **once** and ask the writer to fix the tools, not to restage the scene. If the check passes, do not retry. Do not add a second writer, a per-model agent, or a separate compatibility agent. Extra creative agents multiply cost and contradict each other.

### 5.4 What the user would notice

Little, if this is done well. The same composer, the same bubbles, the same tool cards. Differences worth designing on purpose:

- Value-model text is present on every turn that uses values, not only the first.
- Dates and score edits track the passages that match these two people, so opposite-value pairs clash more consistently and adjacent pairs do not get a generic pep talk.
- Long-running characters stop dragging every past date into the prompt; the model can still be asked to recall one.
- A bad retrieval shows up as a blander answer, not as a broken tool, because the constitution stayed pinned.

A small debug surface (even a collapsed “context used” list in a dev build) is worth planning: which value passages, which prompt sections, which memory chunks. Without that, RAG failures look like “the model got worse.”

---

## 6. Suggested order of work

No estimates. Each step is useful alone.

1. **Fix the contract before adding search.** Append the selected value-model text on every turn, or stop telling the model it is in context. This is the current bug a RAG design must not preserve.
2. **Split the bundled prompt** into pinned rules and named sections. Assemble by intent with simple rules. Ship that without any embeddings.
3. **Index each active value model by its own headings and score names.** Inject the matching passages, not the file. Schwartz can ship first; the index must already allow a list of models on the session.
4. **Shrink character attaches** to cards plus the session’s recent-history count (default 3). Keep full sheets in OPFS.
5. **Add memory search** when step 4 is not enough: chunk history and date summaries, embed on save, filter by character, then rank.
6. **Add a tool loop** only for the cross-library and “find that old date” cases. Leave ordinary chat and ordinary dates on the pipeline.

Steps 2–4 are the rearchitecture. Steps 5–6 are the point where the usual RAG-and-agent stack actually appears.

---

## 7. Risks

| Risk | Why it happens | Guard |
|------|----------------|-------|
| Retrieved instructions contradict each other | Two prompt versions, or a library essay that says “ignore the tools” | Only the app’s pinned sections can contain instructions. Retrieved library text is data, and the prompt should say so |
| Wrong clash for the couple | Embedding search on the user’s wording | Select passages from top scores first. Use search only inside that short list |
| Lost tool format | Date schema was “retrieved” and missed | Schemas for tools this intent must emit are part of the playbook, included as a set, not one chunk at random |
| Stale index | History updated in the library, vectors still describe the old beat | Rebuild a character’s chunks on save. The sheet in OPFS stays the source of truth |
| First-turn preprompt bug, repeated | Retrieval runs once and its text is not stored | Assemble the system message on every send, the way `resolveThreadSystemPrompt` already does |
| Agent loops that never finish | Model keeps searching | Cap tool rounds (a handful). Then force a final write with whatever was retrieved |
| Cost and latency | A planner call plus a writer call plus embeddings | Pipeline with no extra model call until intent rules fail. Embed on save, not per token of chat |
| Privacy | Character history sent to an embeddings API | Same trust boundary as chat today (FAL). Do not add a second vendor casually. Local embeddings are an option later if that boundary becomes a problem |

---

## 8. Decisions

Answers to the open questions. These are the build constraints.

### 8.1 Several value models, loaded by retrieval

**Decision.** A session can have one or many value models, and later models will not all be Schwartz. The active set is a list of library text assets on the session document (today’s single preprompt in `localStorage` is the migration source, not the long-term home).

**Load them with RAG. Do not make an agent per model.**

A value model is a book. An agent is a worker. The worker is the one writer in §5.1. Giving each theory its own agent means two writers producing two dates, and a third step to glue them together. When both theories should shape the *same* reply, retrieve a short pack from each book and paste both packs into that one call, each labeled with its source. The writer can then say where the models agree and where they clash.

Use a separate agent only if a model changes the **procedure**, not the facts — for example a scored interview that must ask a series of questions before it will judge. That difference is a playbook section retrieved while that model is active, still spoken by the same writer. Split a second agent only after that playbook proves too different to share one voice.

How a model is retrieved depends on its shape:

| Model shape | Lookup |
|-------------|---------|
| Fixed named scores (Schwartz today) | Table from the characters’ top scores to passages. No embeddings |
| Different names, but stable headings | Chunk on those headings and on that model’s score names. Same pipeline, different tags |
| Prose with no score list | Heading chunks first. Embeddings when a heading match is not enough |

Character sheets still store the ten Schwartz scores only. Until a sheet can record scores for more than one model, the score table runs for Schwartz, and every other active model is retrieved as text.

### 8.2 Weight lives on the session

**Decision.** `weight` (default 50) is a field on the session document, next to `modelId`. The prompt receives one injected line. The rubric stays in the date playbook. `set weight` / `get weight` update and read the session, not the prompt file.

### 8.3 Recent history

**Decision.** A character card includes the last **3** history beats by default. The count is a session field so a thread can change it. Older beats stay in OPFS and are retrieved only when the turn needs them. Traits tagged `Physical` and `Style` still belong on a date card even when they are older than those three beats; the count limits history summaries, not traits that define how someone looks.

### 8.4 One writer, one clerk retry

**Decision.** Keep a single writer. The clerk is deterministic code (the parser we already run), not a second model. After the stream it checks structural invariants: date summary matches the plan’s time and place, required tools for this intent are present, character ids are ones we attached or created. On failure, one retry that asks the writer to repair the tools and leave the scene alone. No retry when the check passes. No second creative model.

### 8.5 Embeddings provider

**Decision.** When embeddings are added, call them through FAL/OpenRouter, same key and billing path as chat ([`MD-Models.md`](./MD-Models.md)). Do not add a second vendor for the index.

---

## 9. Glossary

| Term | Meaning here |
|------|----------------|
| System prompt | The instruction message. Not the user’s text. |
| Preprompt | Today’s name for the value-model document appended to that instruction. |
| RAG | Retrieve passages, add them to the prompt, then generate. |
| Chunk | A slice of a document stored for lookup. |
| Embedding | A numeric fingerprint of a chunk’s meaning, used for “sounds like this” search. |
| Pin | Always include. Used for rules. |
| Pipeline agent | Fixed stages the app runs. |
| Tool-calling agent | The model chooses the next tool. |
| Constitution | The short rules that must survive a bad search. |
