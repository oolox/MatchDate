# MasterDater — RAG and agents

> **Purpose:** High-level research on how MasterDater could stop pasting the whole value model and system prompt into every chat call, and instead **retrieve** the pieces a turn actually needs — then how an **agent** would use that retrieval. Written for someone new to both ideas.
>
> **Status:** research, plus a retrieval pipeline and an intent classifier in the app. See [What is in the app](#what-is-in-the-app) and [§8.6](#86-intent-classifier).
>
> **Last updated:** 2026-11-15
>
> **Related:** [`MD-ValueModel.md`](./MD-ValueModel.md), [`MD-CharacterPrompt.md`](./MD-CharacterPrompt.md), [`MD-tools.md`](./MD-tools.md), [`MD-Models.md`](./MD-Models.md), [`MD-Chat-Feature.md`](./MD-Chat-Feature.md), [`prompts/prompt-masterDater.md`](../prompts/prompt-masterDater.md)

---

## Revert point

Baseline before any RAG or agent implementation. That tree was `main` at the commit below. Later RAG work is also on `main` (no pull request).

| | |
|--|--|
| Remote | https://github.com/oolox/MatchDate.git |
| Branch | `main` |
| Commit | `cf3f3ca912df8119ab00d8810c318dc9c041a832` |
| Subject | Add datePlan tool and paired dateHistory for plan, transcript, and summary. |
| Date | 2026-11-15 |

To drop later RAG changes and return to this tree: `git checkout cf3f3ca912df8119ab00d8810c318dc9c041a832`. This doc itself is not in that commit.

### Revert point before the classifier

Keyword intent and retrieval, before the classifier call. Pushed to `main`.

| | |
|--|--|
| Remote | https://github.com/oolox/MatchDate.git |
| Branch | `main` |
| Commit | `ff12abdd1ad658ff1ccd26a093bfeae53968457a` |
| Subject | Record an intent classifier as required scope before it is built. |
| Date | 2026-11-15 |

To drop the classifier and return to keyword intent: `git checkout ff12abdd1ad658ff1ccd26a093bfeae53968457a`.

### What is in the app

Each send classifies, then builds the system message in `assembleChatContext`, then streams one writer:

- The MasterDater prompt is split on headings (`#` through `####`). `classifyChatIntent` returns `date`, `conversation`, `edit`, or `question` and uses the same registry model as the writer, with thinking off. `detectChatIntent` runs only when that call fails or the label is unusable. Cancelling the turn aborts the classifier instead of falling back. A date label gets the date protocol and the `datePlan`, `dateTranscript`, and `dateSummary` schemas. A plain question with no characters in the turn or the thread gets the preamble, Inputs, Your job, and the presentation note — not the tool schemas. Characters already in the thread count, so a follow-up still gets conversation, quote, continuity, and the character create/update schemas. If a date selection does not contain `datePlan`, the full MasterDater prompt is sent. Any bundled prompt without a “When to emit tools” heading is sent whole.
- The session’s value-model text is retrieved on **every** turn, after the prompt sections, under `[Value model: <name>]`. A body that mentions Schwartz and all ten Basic Value names contributes the top-level and definition sections, plus later sections that name this turn’s top two scores. Sections that name none of the ten, or eight or more, are skipped. With two or more attached characters, a section is kept only when its named values cover at least two characters’ top scores. With no scores attached, clash write-ups stay out. Any other model is sent whole. The Inputs section of `prompt-masterDater.md` still says the preprompt arrives on the first turn; the assembler sends the passages every turn anyway.
- The active list lives on the session (`valueModelIds`). The dropdown still writes one id, or an empty list for none. A thread with no list yet inherits the last dropdown choice from `localStorage`.
- `weight` and `recentHistoryCount` live on the session (defaults 50 and 3). `set weight N` (0–100) and `set history N` (0–20) update them before the classifier runs. The system message then includes a `[Session]` block: the weight, the history count, the active model names, and a line that the session weight overrides any `weight=` example in the playbook. There is no `get weight` parser.
- Character tool fences in the user message and in earlier turns keep the last N history beats. Traits and all ten scores stay.

Not built: embeddings, memory search, heading chunks for non-Schwartz models, top-scores-only character cards, a tool-calling loop, and the clerk retry. The intent classifier from [§8.6](#86-intent-classifier) is in the app.

---

## 0. TL;DR

| Question | Answer |
|----------|--------|
| What is RAG? | Look up a few relevant passages, paste those into the prompt, then generate. Retrieval-Augmented Generation. |
| What is an agent? | A loop that can decide “I need more information or a tool” before it writes the final reply. MasterDater’s writer is still one streaming call, then the app parses JSON tools out of the reply. A short classifier call runs first. |
| Should we embed the current prompt and value model into a vector database? | **Not yet.** Both documents are small and highly structured. Embedding them would be less reliable than picking sections on purpose. |
| What *should* change? | Split “rules the model must always obey” from “reference it should see only when relevant.” Inject the rules every turn. Retrieve value-model passages from the characters’ scores, and retrieve prompt sections from what the user is trying to do. |
| Where do agents fit? | A fixed pipeline: classify intent → retrieve → one writer → apply tools. The classifier is a short model call, not a second writer. A tool-calling loop comes later, only for open-ended lookups. |
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
| System prompt | Bundled file, default `prompts/prompt-masterDater.md`. For that file, `selectPromptSections` keeps the sections the intent needs. Other bundled prompts go out whole | Every turn, after the classifier |
| Value model (“preprompt”) | Library text assets named on the session (`valueModelIds`). The dropdown sets one id. Empty means none | **Every turn**, as retrieved passages (the whole asset when it is not Schwartz) |
| Characters | `@` mentions become fenced JSON (`name`, identity, all ten scores, traits, history) in the **user** message, not the system message | The turn they are attached, and again inside earlier turns. History on the wire is the last N beats (default 3). Traits and scores stay whole |
| Session block | `weight` and `recentHistoryCount` on the session. `set weight N` / `set history N` write them | Every turn, as `[Session]` after the prompt sections and before the value-model passages |

`classifyChatIntent` runs, then `assembleChatContext`, then `streamChatTurn` sends `system + history + user` to FAL OpenRouter. There is no agent loop and no embedding index. Character history older than the last N beats is still on the sheet, and is not searched by meaning yet.

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
│ 1. Classify       │  short model call → date | conversation | edit | question
│                   │  keyword list only if that call fails
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

Send the retrieved passages **every turn they apply**, including turn two and later. The app does this now. The bundled prompt still describes a first-turn paste; the assembler does not.

**In the app,** Schwartz lookup is narrower than the table above. Top two scores per attached character fence. Kept sections are heading level 1 or less, titles that match “10 basic values” or “higher-order,” and later sections whose named values match those scores. There is no separate Hedonism branch and no special case for a user naming a value in prose. A non-Schwartz body is the whole asset. Passages are labeled `[Value model: <name>]`.

Sessions can carry more than one value model, and not all of them will be Schwartz. See [Decisions](#8-decisions): each active model is another book in the retrieval pack, not another agent. The session field is already a list. The dropdown still stores one id. Schwartz keeps the score-to-passage table above as the target; the app uses the narrower rule in the previous paragraph. Any other model should be chunked on its own headings and its own score names. A model with no fixed score list should be heading chunks, then embeddings, until it grows enough structure to tag. That chunking is not built. Label every passage with the asset it came from so the writer can say which lens a judgment used.

### 4.3 System prompt: retrieve by intent

Split `prompt-masterDater.md` into sections the assembler can mix. The file stays the authoring source. `selectPromptSections` loads slices when the file has a “When to emit tools” heading, and returns any other prompt whole.

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

Intent is a **classifier call**, specified in [§8.6](#86-intent-classifier). The app does not train a model. Before the writer streams, it asks the same chat provider for one label. `detectChatIntent` remains only as the fallback when that call fails or returns a label outside the set.

The keyword list is the fragile version of this step: “take them out tonight” can miss `date`, and “ask what a date is” can look like one. The classifier only chooses the label. It does not pick headings inside a pack.

The table above is the target pack. What ships is coarser:

| Shipped rule | Include when |
|--------------|----------------|
| Preamble, Inputs, Your job, Presentation note | Always, once the file is recognized as the MasterDater prompt |
| Continuity, trait tags, `update` / `create` schemas | A character is attached this turn or already in the thread, or the label is `edit`, `date`, or `conversation` |
| Conversation and Character Activities | Same character presence, or the label is `conversation` or `date` |
| Date protocol, `datePlan` / `dateTranscript` / `dateSummary` | Label is `date` only. Two attached characters do not add this pack by themselves |
| `quote` schema | A date, a conversation label, or any character in the turn or the thread |
| “When to emit tools” | Any of the tool packs above |

A date pack that does not contain the text `datePlan` is replaced by the full file.

`weight` is a field on the session document, not only a line in the prompt. Default 50. When the user says `set weight N`, the app updates the session and injects `compatibility weight: N`, plus a line that this overrides the playbook. The long rubric still sits in the Date section (`weight=50` and the examples) and is sent only on a date label. `set history N` is the same kind of session write. The prompt still mentions `get weight`; the app does not parse it.

### 4.4 Character memory: the first real RAG corpus

Scores and prompt sections do not need vectors. Character memory will.

An attach still sends the sheet: name, identity, all ten scores, every trait, and history trimmed to the session’s recent-history count. A better card for the prompt, not built yet:

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

Not an implementation — the shape of the assembled system message. What ships today is the selected prompt sections, then `[Session]`, then one `[Value model: <name>]` block per active asset. Character JSON stays in the user message and in history. The block below is the later card, including memory that is not retrieved yet:

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
| Classify | User text, who is attached, who is already in the thread | One label: `date`, `conversation`, `edit`, `question` | Yes. A short non-streaming call. No user-facing prose |
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

1. **Fix the contract before adding search.** Append the selected value-model text on every turn, or stop telling the model it is in context. **In the app:** passages go out every send. The Inputs section of `prompt-masterDater.md` still tells the model the preprompt is a first-turn paste.
2. **Split the bundled prompt** into pinned rules and named sections. Assemble by intent. Ship that without any embeddings. **In the app** for `prompt-masterDater.md`. The classifier chooses the label; keyword intent is the fallback.
3. **Index each active value model by its own headings and score names.** Inject the matching passages, not the file. Schwartz can ship first; the index must already allow a list of models on the session. **Partial:** Schwartz passages follow the top scores, other models are the whole asset, and `valueModelIds` is a list the dropdown fills with one id.
4. **Shrink character attaches** to cards plus the session’s recent-history count (default 3). Keep full sheets in OPFS. **Partial:** history is capped. Scores and traits are still whole.
5. **Replace keyword intent with the classifier** in [§8.6](#86-intent-classifier). Keep `detectChatIntent` as the fallback. **In the app.**
6. **Add memory search** when the history cap is not enough: chunk history and date summaries, embed on save, filter by character, then rank.
7. **Add a tool loop** only for the cross-library and “find that old date” cases. Leave ordinary chat and ordinary dates on the pipeline.

Steps 6–7 are where embeddings and a tool-calling agent appear. The clerk retry in [§8.4](#84-one-writer-one-clerk-retry) is not in the app.

---

## 7. Risks

| Risk | Why it happens | Guard |
|------|----------------|-------|
| Retrieved instructions contradict each other | Two prompt versions, or a library essay that says “ignore the tools” | Only the app’s pinned sections can contain instructions. Retrieved library text is data, and the prompt should say so |
| Wrong clash for the couple | Embedding search on the user’s wording | Select passages from top scores first. Use search only inside that short list |
| Lost tool format | Date schema was “retrieved” and missed, or the classifier picked `question` for a date | Schemas for the chosen label are included as a set. An unrecognized classifier answer falls back to `detectChatIntent` |
| Stale index | History updated in the library, vectors still describe the old beat | Rebuild a character’s chunks on save. The sheet in OPFS stays the source of truth |
| First-turn preprompt bug, repeated | Retrieval runs once and its text is not stored, or the prompt still says the preprompt arrived only on turn one | `assembleChatContext` rebuilds the system message on every send. `resolveThreadSystemPrompt` only returns the bundled prompt body |
| Agent loops that never finish | Model keeps searching | Cap tool rounds (a handful). Then force a final write with whatever was retrieved |
| Cost and latency | A classifier call before every writer call, plus embeddings later | The classifier prompt is a few lines and does not stream. Same FAL path as chat. Keyword fallback skips the wait when the call fails |
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

**Decision.** `weight` (default 50) is a field on the session document, next to `modelId`. The prompt receives one injected line. The rubric stays in the date playbook. `set weight` updates the session, not the prompt file. `get weight` is still only a sentence in the Date section; the app does not parse it.

### 8.3 Recent history

**Decision.** A character card includes the last **3** history beats by default. The count is a session field so a thread can change it (`set history N`, 0–20). Older beats stay in OPFS and are retrieved only when the turn needs them. That retrieval is not built. Traits tagged `Physical` and `Style` still belong on a date card even when they are older than those three beats; the count limits history summaries, not traits that define how someone looks. The history cap is in the app. Trait filtering is not: every trait is still sent.

### 8.4 One writer, one clerk retry

**Decision.** Keep a single writer. The clerk is deterministic code (the parser we already run), not a second model. After the stream it checks structural invariants: date summary matches the plan’s time and place, required tools for this intent are present, character ids are ones we attached or created. On failure, one retry that asks the writer to repair the tools and leave the scene alone. No retry when the check passes. No second creative model.

### 8.5 Embeddings provider

**Decision.** When embeddings are added, call them through FAL/OpenRouter, same key and billing path as chat ([`MD-Models.md`](./MD-Models.md)). Do not add a second vendor for the index.

### 8.6 Intent classifier

**Decision.** Keyword matching in `detectChatIntent` is the fallback, not the authority. Each send classifies intent with a model call before `assembleChatContext` picks prompt sections.

This is not a model we train, and it is not a second writer. It is one short, non-streaming completion on the same FAL/OpenRouter path as chat ([`MD-Models.md`](./MD-Models.md)). The same registry model as the writer is fine. A faster chat model from that registry is also fine. No new npm package and no new service.

What the call sees:

- The user’s text for this turn
- How many characters are attached on this turn
- How many characters already appear in the thread

What it must return, and nothing else:

```text
{ "intent": "date" | "conversation" | "edit" | "question" }
```

The app parses that JSON (`parseIntentLabel` takes the first JSON object in the reply). Any other shape, a timeout, or a network error uses `detectChatIntent` and continues. Aborting the send cancels the classifier and does not fall back. The classifier call sets thinking off. The user does not see the classifier’s text. The streaming writer is the only voice, and it requests reasoning only when the composer Reason toggle is on.

The label selects the pack in §4.3. It does not choose individual headings inside a pack. A `date` label still includes the date schemas as a set.

The classifier does not emit tools, does not see the value-model essay, and does not replace session `weight` or the score-to-passage lookup.

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
| Classifier | A short model call that returns one intent label. Not a writer, and not a model we train. |
| Tool-calling agent | The model chooses the next tool. |
| Constitution | The short rules that must survive a bad search. |
