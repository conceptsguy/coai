# ADR-0009: Debounced Position and Metadata Sync

**Status:** Accepted
**Date:** 2026-03-28

## Context

Dragging a node on the canvas fires React Flow's `onNodesChange` callback 30+ times per second. Writing each position update to Yjs would generate excessive network traffic and fill the operation log, impacting all connected clients.

## Decision

Position and metadata writes to Yjs are debounced:

- **Node position:** 500ms debounce — captures the final resting position after a drag, not every intermediate frame
- **Project title/purpose:** 2000ms debounce — these are edited infrequently and a longer delay avoids Yjs writes on every keystroke

During the debounce window, React Flow's internal state (or local Zustand state for metadata) reflects the latest value immediately. The Yjs write happens once the user stops moving/typing.

## Tradeoffs

**Gained:** Network traffic drops from ~30 updates/sec to ~2 updates/sec during drag. Connected clients see smooth final positions rather than jittery intermediate frames. Yjs operation log stays compact.

**Accepted:** During the debounce window, the local client and remote clients see different positions. This means a collaborator watching someone drag a node will see it "jump" to the final position rather than following the drag smoothly. For position this is acceptable — smooth remote cursors (via awareness, ADR-0002) provide the "someone is working here" signal, not node position updates.
