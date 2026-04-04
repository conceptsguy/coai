# ADR-0014: Convergence Synthesis

**Status:** Accepted  
**Date:** 2026-04-04

## Context

Phase 1 built the accumulation side of the shared cognitive workspace: threads propose context updates, humans accept them, and the `SharedContextDoc` grows incrementally. But the document grows in additive fragments — bullet by bullet, section by section. There is no moment where the team steps back and asks: _what does all of this add up to?_

Phase 2 made the SharedContextDoc a first-class UI surface in Thread View. This makes the absence of synthesis more visible: users can see a growing list of insights, decisions, and open questions but there is no narrative that ties them together.

The `SharedContextDoc` already has a `convergenceSummary` field (string, nullable) that was reserved for this purpose but never populated.

## Decision

Add a `POST /api/context/synthesize` endpoint that reads all thread summaries and the current shared context document for a project and asks Haiku to produce a `convergenceSummary`.

**Input to the model:**
- The full current `SharedContextDoc` (problem statement, constraints, workstreams, themes, insights, decisions, tensions)
- Per-thread rolling summaries (from the `summary` column of the `nodes` table for all chat nodes in the project)

**Output:** A 2–4 sentence convergence summary that identifies the through-line: what the team has collectively learned, what has been resolved, and what remains open.

**Trigger:** A "Synthesize threads" button in `SharedContextPanel`, visible when `sharedContext` is non-null and at least one thread has a rolling summary. The button re-labels to "Re-synthesize" after a first synthesis.

**Write path:** Same as other section updates — the API returns `{ convergenceSummary }`, the client calls `updateSharedContextSection('convergenceSummary', text)` which writes to Yjs → propagates to all collaborators in real-time.

**Supabase mirror:** The endpoint upserts `convergence_summary` in `shared_context_docs` alongside writing it into the response for the Yjs path.

## Alternatives Rejected

**Automatic synthesis after every N updates:** Too noisy. The convergence summary is a deliberate team act — "we're ready to step back and see what we know." Auto-triggering it would cheapen the signal.

**Streaming the synthesis:** The convergence summary is 2–4 sentences. A full streaming setup for a response that small would add complexity without meaningful UX gain. `generateText` is sufficient.

**User-editable convergence summary:** Keeping it AI-generated and "refresh on demand" keeps the mental model clean: it's a snapshot of the AI's synthesis at this moment, not an authoritative document the team maintains.

## Key Constraints

- Uses Haiku (cheap model) per the two-tier model rule (ADR-0007)
- Read-only on the server — only reads `nodes.summary` and `shared_context_docs`; writes only to `shared_context_docs.convergence_summary`
- Client does the Yjs write (ADR-0002)
- The synthesis is idempotent — calling it multiple times replaces the previous summary

## Consequences

- The shared cognitive workspace now has a full lifecycle: seed → accumulate → synthesize
- Teams can use "Synthesize threads" as a lightweight standup artifact: "here's what we collectively know right now"
- The convergence summary surfaces in the system prompt of subsequent AI calls (via `buildSharedContextBlock` in `/api/chat`) — threads started after synthesis are informed by the team's synthesis
