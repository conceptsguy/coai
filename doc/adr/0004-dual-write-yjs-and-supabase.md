# ADR-0004: Dual-Write Pattern (Yjs + Supabase)

**Status:** Accepted
**Date:** 2026-03-28

## Context

After adopting Yjs as the client-side source of truth (ADR-0002), server-side API routes (`/api/chat`, `/api/summarize`, `/api/suggest-title`) still need to read conversation history. These routes run on the server and cannot access the client's Y.Doc.

Two options:

1. **Yjs-only** — have PartyKit expose an HTTP API for reading Y.Doc state server-side
2. **Dual-write** — write messages to both Yjs (for realtime) and Supabase (for server reads)

## Decision

Every chat message is written to both Yjs and Supabase. The client's `ChatSidebar.onSubmit` and `onFinish` callbacks call `syncInsertMessage()` to write to Supabase alongside the Yjs mutation.

- Yjs is the source of truth for the client (realtime sync, canvas state)
- Supabase `messages` table is the source of truth for server API routes (summarization, title suggestion)

The PartyKit server's `onConnect` callback has a placeholder for future server-side message persistence, signaling the intent to eventually eliminate the dual-write.

## Tradeoffs

**Gained:** Server API routes work without any changes to PartyKit. Migration from the pre-Yjs architecture was incremental — old Supabase-reading code continued working while Yjs was layered on top.

**Accepted:** Two network calls per message write (slightly slower). Risk of Yjs and Supabase diverging if one write fails and the other succeeds — mitigated by the fact that Supabase data is only used for background AI tasks, not user-facing state.

**Deferred:** Eliminating the dual-write by reading from PartyKit's persisted Y.Doc on the server. This would make Yjs the single source of truth everywhere and remove the Supabase messages table dependency.
