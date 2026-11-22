# MasterDater — dev log

> **Purpose:** A short record of what changed and what is still open. High level. Newest day first.
>
> **Last updated:** 2026-11-15

---

## 2026-11-15

This session added a reasoning toggle on the composer, restyled the live reasoning text as a tool card, stopped character thumbnails from flashing during chat streaming, and then widened value-model retrieval so a date or a conversation sees the whole Schwartz theory.

Pushed to `main`:

| Commit | What landed |
|--------|-------------|
| `051a54d` | Composer Reason toggle. Off by default, remembered in the browser. On asks the writer for reasoning and shows those tokens under the waiting spinner, three lines, scrolling. Off leaves the spinner as it was. |
| `ddc1395` | That reasoning text uses the same tool card as other chat tools. Three scrolling lines, scrollbar hidden. |
| `502d107` | Character and image thumbnails stay on screen through streaming instead of flashing the placeholder and reloading. Quote speakers keep a resolved portrait. Date-summary names do not refetch on every token. Typecheck fixes rode along in the same commit. |
| `fd7ff3a` | RAG notes and this log. Date transcripts must put spoken lines in `quote` segments and must not put a raw `"` inside a JSON string. One raw quote was dropping a whole transcript into a code block and skipping the character sheet. |
| `7fc0f1f` | A `date` or `conversation` sends the Schwartz value model whole. The prompt tells the writer that every score pulls: peaks set the main motive, near-ties count, and a low score opposite a high one is a conflict inside that person. `edit` and `question` still use the top-two passage filter. |

The thumbnail cache only reads portraits. Creating a character still waits for confirmation. Updating one still goes through the character update tool. A duplicate sheet seen during streaming was the loading flash, and the write path was left as it was.

The top-two filter was limiting dates. The scores were already on the character fence, but the circle explanation, the opposite-values table, and the other romance write-ups were cut out before the writer saw them. Sending the whole model on a date or a conversation is the fix. Retrieval stays for later memory, where the right passage cannot be named ahead of time.

### Open

- The Reason toggle, the thumbnail cache, and the full-model date path were not exercised on a live model stream. A real send would call the provider and write a chat. Tests cover the reasoning request, the thumbnail cache, and the assembler.
- A transcript already stored with a raw `"` stays a JSON block. The prompt change applies to later replies.
- Still not started: embeddings and memory search, heading chunks for non-Schwartz models, a dropdown that can store more than one value model, character cards that send only top scores and relevant traits, a `get weight` command, the clerk retry, and a tool-calling loop.
