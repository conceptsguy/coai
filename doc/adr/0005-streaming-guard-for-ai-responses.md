# ADR-0005: Streaming Guard for AI Responses

**Status:** Accepted
**Date:** 2026-03-28

## Context

AI responses stream over 5-30 seconds. During that time, Yjs observers fire as other clients edit the project, triggering `syncToZustand()` which rebuilds the entire state tree (ADR-0002). Without protection, an observer firing mid-stream would overwrite the partially-streamed assistant message with stale Yjs state.

## Decision

A local-only `_streamingNodeId` field in the Zustand store acts as a guard. The flow:

1. User submits a message → `_streamingNodeId` is set to the active node's ID
2. Streaming chunks update Zustand directly via `updateLastAssistantMessage()` — no Yjs write
3. `syncToZustand()` checks the guard: if set, it preserves the local messages for that node instead of overwriting with Yjs state
4. `onFinish` fires → final message is committed to Yjs, guard is cleared

The guard is stateless (a string, not a lock) and local-only (not synced to other clients).

Rejected **distributed locks** because: they add complexity and latency for a problem that only exists locally. Each client manages its own streaming state independently.

## Tradeoffs

**Gained:** Clean separation between streaming (local-only, fast) and persisted state (Yjs, durable). No flicker or data loss during AI response generation.

**Accepted:** A narrow race condition exists — if the observer fires after the guard is cleared but before the final Yjs write lands, the message could appear to reset briefly. In practice this is invisible because both the guard-clear and Yjs-write happen synchronously in `onFinish`. Even if they didn't, the final write is identical to the local state, so convergence is guaranteed.
