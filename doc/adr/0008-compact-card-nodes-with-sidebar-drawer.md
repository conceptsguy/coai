# ADR-0008: Compact Card Nodes with Sidebar Drawer

**Status:** Accepted
**Date:** 2026-03-28

## Context

The canvas needs to display many chat nodes simultaneously while still allowing deep interaction with individual conversations. Two UX approaches:

1. **Expandable nodes** — click a node to expand it in-place on the canvas, showing the full chat
2. **Compact cards + sidebar** — nodes are always small cards on the canvas; clicking opens a separate sidebar drawer for the full chat

## Decision

Nodes are always compact cards showing title, model badge, message count, and summary snippet. Interaction model:

- **Click** opens a right-side sidebar drawer with the full chat interface
- **Hover (400ms delay)** shows a floating popover with the last 4 messages for quick scanning
- **Click title text** enables inline editing directly on the card (Enter saves, Escape reverts)

No expanded on-canvas view exists.

Rejected **expandable nodes** because: an expanded chat node would occlude neighboring nodes and edges, breaking spatial awareness. The canvas is for seeing the big picture — relationships between conversations. The sidebar is for going deep into one conversation. These are different modes that benefit from spatial separation.

## Tradeoffs

**Gained:** The canvas stays legible at any zoom level. Users can see 20+ node titles and their connections at a glance. The sidebar provides a full-width chat experience without cramming it into a node's bounds.

**Accepted:** Context-switching between the canvas and sidebar requires a click. Users can't see two full conversations side-by-side on the canvas. The hover preview partially mitigates this by providing quick reads without opening the sidebar.

**Deferred:** Split-view (two sidebars) for comparing conversations. Minimap for navigating large canvases.
