# MasterDater — dev log

> **Purpose:** A short record of what changed and what is still open. High level. Newest day first.
>
> **Last updated:** 2026-11-15

---

## 2026-11-15

This session added a reasoning toggle on the composer, restyled the live reasoning text as a tool card, stopped character thumbnails from flashing during chat streaming, and brought the RAG doc in line with the assembler.

Pushed to `main`:

| Commit | What landed |
|--------|-------------|
| `051a54d` | Composer Reason toggle. Off by default, remembered in the browser. On asks the writer for reasoning and shows those tokens under the waiting spinner, three lines, scrolling. Off leaves the spinner as it was. |
| `ddc1395` | That reasoning text uses the same tool card as other chat tools. Three scrolling lines, scrollbar hidden. |
| `502d107` | Character and image thumbnails stay on screen through streaming instead of flashing the placeholder and reloading. Quote speakers keep a resolved portrait. Date-summary names do not refetch on every token. Typecheck fixes rode along in the same commit. |

The thumbnail cache only reads portraits. Creating a character still waits for confirmation. Updating one still goes through the character update tool. A duplicate sheet seen during streaming was the loading flash, and the write path was left as it was.

`docs/MD-rag.md` was updated in the working tree so it describes the classifier, the section pack, the session weight and history lines, and the Schwartz passage lookup. That doc edit is not committed.

### Open

- The RAG doc edit is still uncommitted.
- The Reason toggle and the thumbnail cache were not exercised on a live model stream. A real send would call the provider and write a chat. Tests cover the reasoning request and the thumbnail cache. The project typechecks.
- `prompts/prompt-masterDater.md` still tells the model the value model arrives on the first turn. The app sends the passages every turn. Left unchanged on purpose during the doc pass.
- Noted while aligning the RAG doc, and not started: embeddings and memory search, heading chunks for non-Schwartz models, a dropdown that can store more than one value model, character cards that send only top scores and relevant traits, a `get weight` command, the clerk retry, and a tool-calling loop.
