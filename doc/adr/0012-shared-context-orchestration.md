# ADR-0012: Shared Cognitive Workspace — Shared Context Orchestration

**Status:** Accepted
**Date:** 2026-04-04

## Context

CoAI's original model is "canvas of connected AI chats." Context flows only along explicitly drawn edges via rolling summaries (ADR-0006). Each chat node is self-contained; the AI in any given thread has no awareness of the broader project being worked on unless the user manually wires edges.

As teams use CoAI for longer, multi-session collaborative work, the absence of project-level shared state becomes a bottleneck:

- Every new chat node starts cold — no awareness of the problem statement, constraints, or decisions already made
- Context flows only from nodes the user remembers to connect — it's structural, not semantic
- There is no living document the team can point to as "what we know so far"

The pivot to a "shared cognitive workspace" adds a **project-level shared context document** (the `SharedContextDoc`) that all threads can read from and propose updates to. The AI in each thread is aware of the project's shared context without requiring the user to manually connect edges.

## Decision

### Data layer

Extend the existing Yjs document (same Y.Doc, same PartyKit room) with three new maps:

- `yDoc.getMap('sharedContext')` — the live shared context document, stored as a flat key-value map where scalar fields are plain strings and array fields are JSON-serialized strings. Flat storage avoids deeply nested Y.Maps that are harder to observe and diff atomically.
- `yDoc.getMap('threads')` — thread metadata (owner, focus mode, status) keyed by nodeId, stored separately from `yDoc.getMap('nodes')` to preserve backward compatibility with all existing `nodeToYMap`/`yMapToNode` converters.
- `yDoc.getMap('contextUpdates')` — pending (proposed) context updates, keyed by updateId. Accepted and rejected updates are removed from this map; they are persisted only to Supabase for audit.

A **Supabase mirror** (`shared_context_docs` table, one row per project) provides a server-readable snapshot for API routes that need the current shared context without connecting to the Yjs doc.

### Orchestration layer (two-phase context update)

AI proposals for shared context updates go through a human-gated two-phase flow:

1. **Propose** — after an AI exchange, the client calls `POST /api/context/propose`, which analyzes the exchange (using Haiku) and inserts a row in `context_updates` (status = `proposed`). The client pushes the pending update to `yDoc.getMap('contextUpdates')`, surfacing a badge for all collaborators in real-time.
2. **Accept/Reject** — a project member reviews and calls `POST /api/context/accept` or `/api/context/reject`. On accept: the `shared_context_docs` row is updated in Supabase, and the client writes the new value to `yDoc.getMap('sharedContext')`, which propagates to all open tabs via PartyKit.

This prevents AI-generated content from modifying shared state without human review, consistent with ADR-0007 (server-side AI only, humans remain in control).

### System prompt injection

`POST /api/chat` is extended to accept an optional `sharedContext` field. When present, a structured "Project Context" block is prepended to the system prompt before any edge-based `connectedContexts` blocks (ADR-0006). The edge-based path remains unchanged and composable.

### Project modes

Projects gain a `mode` field (`'canvas'` | `'ideation'`). Existing projects default to `'canvas'` and behave exactly as before. A kickoff flow (`POST /api/project/kickoff`) sets mode to `'ideation'`, generates an initial `SharedContextDoc` from the project brief (using Haiku), and persists it to both Supabase and Yjs.

## Alternatives Rejected

**Promote `project.purpose` to a structured doc** — Simple, but couples a schema-agnostic text field to a typed interface. Hard to evolve per-section or per-mode.

**Separate Y.Doc per project for shared context** — Clean separation but adds a second PartyKit room per project, doubling WebSocket connection overhead and complicating the provider. The existing single-room approach handles the load.

**AI writes directly to shared context** — Removes human review. Rejected because hallucinated or incorrect content would propagate to all collaborators immediately with no recourse.

## Tradeoffs

- Adding three new Yjs maps increases the deep observer count in `observeYjsDoc`. The existing rebuild-on-change approach (ADR-0002) remains acceptable at the assumed scale (<1000 nodes per project).
- The flat key→string storage for `sharedContext` means array fields are JSON.parse'd on every `syncToZustand` call. This is negligible at the document sizes expected for shared context.
- Supabase mirror of shared context is eventually consistent (written on accept, not on every Yjs change). API routes that read `shared_context_docs` may lag behind the live Yjs state by one round-trip. Acceptable for Phase 1.
- Projects without a kickoff have `sharedContext: null` in Zustand; the chat route silently skips shared context injection. The feature is fully opt-in.

## ADRs Preserved

- **ADR-0002** — Yjs remains source of truth; Zustand is a reactive projection. All new maps follow the same observer pattern.
- **ADR-0004** — Dual-write extended to new tables (`shared_context_docs`, `context_updates`).
- **ADR-0005** — Streaming guard is untouched. Shared context is read-only from the AI's perspective during a stream.
- **ADR-0006** — Edge-based context linking continues to function. Shared context is additive.
- **ADR-0007** — All LLM calls server-side. Client writes to Yjs only after receiving the result from an API route.
- **ADR-0009** — Debounced sync patterns unchanged.
