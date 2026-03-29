# ADR-0002: Yjs as Source of Truth with Zustand Projection

**Status:** Accepted
**Date:** 2026-03-28

## Context

Coai needs realtime multiplayer editing of a shared canvas — nodes, edges, messages, and project metadata must stay in sync across all connected clients. The two viable approaches were:

1. **Supabase Realtime** — server-authoritative, Postgres changes broadcast to clients via WebSocket
2. **Yjs (CRDT)** — client-authoritative, conflicts resolved automatically via merge semantics, synced peer-to-peer through a relay server

The canvas involves frequent, fine-grained updates (dragging nodes, typing messages) where latency and conflict resolution matter more than strict ordering.

## Decision

Yjs is the source of truth for all canvas data. The Y.Doc holds nodes, edges, messages, and project metadata as nested Y.Maps and Y.Arrays.

Zustand is a **read-only reactive projection** — Yjs deep observers rebuild the store on every change, and React components subscribe to Zustand. Actions write to Y.Doc first; Zustand follows automatically via observers. No component ever writes directly to Zustand for canvas state.

Rejected **Supabase Realtime** because: (a) it requires round-trips to the server for every mutation, adding latency to drag operations and typing; (b) conflict resolution is last-write-wins rather than merge-based, which loses concurrent edits; (c) it couples the sync layer to the database, making offline support harder to add later.

## Tradeoffs

**Gained:** Instant local mutations, automatic CRDT conflict resolution, clean separation between sync (Yjs) and rendering (Zustand), future path to offline via y-indexeddb.

**Accepted:** `syncToZustand()` rebuilds the entire state tree on every Yjs change — safe but expensive. This assumes projects stay under ~1000 nodes. If projects grow larger, we'll need selective observers that only update changed subtrees. Also, debugging is harder because the true state lives in Y.Doc, not the Zustand devtools.
