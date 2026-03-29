# ADR-0003: PartyKit for Managed WebSocket Infrastructure

**Status:** Accepted
**Date:** 2026-03-28

## Context

Yjs needs a WebSocket server to relay document updates between clients. Options considered:

1. **Self-hosted y-websocket** — run the reference Yjs server on a VPS or container
2. **PartyKit** — managed Yjs-aware WebSocket hosting on Cloudflare Durable Objects
3. **Liveblocks** — commercial multiplayer platform with Yjs adapter

## Decision

Use PartyKit with `y-partykit` for the Yjs relay server. Configuration in `partykit/server.ts`:

- `persist: { mode: "snapshot" }` — store only the final Y.Doc state, not the full operation log. Simpler, smaller, sufficient for our needs since we don't need operation-level history.
- `gc: false` — garbage collection disabled so all messages are preserved indefinitely. Required because summarization and context linking need full message history.

Rejected **self-hosted y-websocket** because: it requires managing WebSocket scaling, persistence, and reconnection logic — operational burden that doesn't add product value at this stage.

Rejected **Liveblocks** because: it's a heavier commercial dependency with its own state model. PartyKit gives us raw Yjs access with minimal abstraction.

## Tradeoffs

**Gained:** Zero-ops WebSocket hosting, automatic scaling via Durable Objects, built-in Yjs persistence, simple `onConnect` API.

**Accepted:** Dependency on Cloudflare's Durable Objects platform. PartyKit is open-source but the managed hosting is a single vendor. If PartyKit shuts down, we'd need to self-host the same `y-partykit` server code on Cloudflare Workers directly or migrate to y-websocket.

**Deferred:** With `gc: false` and snapshot persistence, the stored document grows indefinitely. For active projects with 10K+ messages this could become expensive. Future work: time-based message archival or a separate cold-storage tier.
