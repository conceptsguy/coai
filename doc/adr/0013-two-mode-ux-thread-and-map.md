# ADR-0013: Two-Mode UX — Thread View and Map View

**Status:** Accepted
**Date:** 2026-04-04

## Context

Phase 1 gave every AI thread awareness of a shared project context document. The next question is UX: where does the conversation actually happen?

The current model treats the AI chat as a sidebar accessory to the canvas. But the pivot thesis says the conversation IS the work — the canvas is the map, not the workspace. When a user spends an hour deep in an AI thread exploring a design problem, the relevant surface is the thread, not a floating panel next to a node graph.

The canvas still has value — as a birds-eye view of project structure, a place to see who's working on what, and a surface for creating and connecting threads. But it should be the 10% view, not the 90% view.

## Decision

Add a persistent view mode toggle (Thread ↔ Map) to the TopBar.

**Thread View** is the primary work surface. Layout: three columns.
- **Left (240px, collapsible):** Thread list — all chat nodes in the project, clickable to switch threads
- **Center (flex-1):** Full-page chat for the selected thread. Message list fills the height; input at the bottom. Header shows thread title (editable), model selector, focus mode toggle.
- **Right (320px, collapsible):** Shared context panel — the living `SharedContextDoc`, plus pending context update proposals with Accept/Reject. Hidden completely in Focus Mode.

**Map View** is the existing React Flow canvas, unchanged. It serves as a navigation and awareness surface: see project topology, create new threads, drag-connect them.

**Focus Mode** (Thread View only): a toggle in the thread header that hides the shared context panel. For deep single-thread work without cross-thread awareness.

**View mode is local-only** — each collaborator can independently be in Thread View or Map View. This is a `viewMode` field in Zustand, not synced to Yjs.

## Alternatives Rejected

**Separate routes** (`/canvas/:id/thread/:nodeId`): Loses the Yjs connection during Next.js navigation. The CRDT requires a persistent WebSocket. Mode switching within a single page keeps the YjsProvider alive.

**Split-screen** (canvas left + thread right): The canvas loses usability when compressed. The thread loses focus when the canvas is constantly visible. The mental model of "two modes" is cleaner than a cramped split.

**Fold ChatSidebar into Thread View** (remove the sidebar): The sidebar serves Map View users well — compact, dockable to the right. Removing it would degrade Map View. Both coexist: sidebar in Map View, ThreadView in Thread mode.

**ReactFlowProvider always mounted**: Not needed in Thread View (no canvas interactions). Mount it only in Map View to avoid wasted overhead.

## Key Constraints

- `viewMode: 'map' | 'thread'` — local Zustand, not synced to Yjs
- `focusMode: boolean` — local Zustand, not synced
- `contextPanelOpen: boolean` — local Zustand, not synced
- Thread View replicates the `useChat` + `onFinish` patterns from ChatSidebar exactly (summarize, suggest-title, context analysis). No new AI primitives.
- ADR-0008 (compact card nodes + sidebar drawer) remains in effect for Map View
- Shared context panel is driven entirely by `useCanvasStore().sharedContext` — no new API calls on mount

## Consequences

- Thread View is the landing experience once a project is kicked off (in ideation mode)
- Map View remains the default for new projects (before kickoff)
- The shared context panel is always visible by default in Thread View, making the shared document a first-class part of the workspace — not buried in a badge
- Focus Mode is the escape hatch for deep individual work
