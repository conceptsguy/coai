@AGENTS.md

# Coai — Collaborative AI Canvas

## What This Is

An infinite canvas where AI chat sessions are visual nodes you can place, connect, and collaborate through. Connected nodes share context via rolling summaries so conversations inform each other. Starting as an internal Crema tool, targeting SaaS.

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **React Flow** (`@xyflow/react`) — node/edge canvas
- **Vercel AI SDK 6** (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`, `@ai-sdk/openai`) — streaming chat, model abstraction
- **Yjs** + **PartyKit** (`y-partykit`) — CRDT-based multiplayer sync (source of truth)
- **Zustand** — client state (reactive projection of Yjs doc)
- **Tailwind CSS 4** + **shadcn/ui** (base-ui based) — styling/components
- **Supabase** — auth (email/password), Postgres database (profiles, projects, nodes, edges, messages), RLS

## Commands

```bash
npm run dev     # Start dev server
npm run build   # Production build (use to verify changes compile)
npm run lint    # ESLint
```

## Project Structure

```
partykit/
├── partykit.json                    # PartyKit config (room routing, persistence)
└── server.ts                        # Yjs WebSocket server (onConnect, snapshot persistence)

src/
├── app/
│   ├── api/
│   │   ├── canvas/[id]/seed/route.ts # GET: seed data for Yjs doc migration (auth-guarded)
│   │   ├── chat/route.ts           # Streaming chat endpoint (POST, auth-guarded)
│   │   ├── summarize/route.ts      # Rolling summary generation (Haiku, auth-guarded)
│   │   └── suggest-title/route.ts  # Auto-title from first exchange (Haiku, auth-guarded)
│   ├── auth/
│   │   ├── callback/route.ts       # OAuth code exchange
│   │   └── signout/route.ts        # POST sign-out handler
│   ├── canvas/[id]/page.tsx        # Main canvas page (auth + project access only)
│   ├── login/page.tsx              # Email/password sign-in
│   ├── signup/page.tsx             # Registration
│   ├── layout.tsx                  # Root layout (Geist fonts, metadata)
│   └── page.tsx                    # Landing page (auth-aware)
├── components/
│   ├── canvas/
│   │   ├── CanvasEditor.tsx        # ReactFlow wrapper + presence overlay
│   │   ├── ChatNode.tsx            # Custom node: compact card, hover preview, collaborator ring
│   │   ├── CollaboratorAvatars.tsx # Top-right avatar stack (who's online)
│   │   └── CollaboratorCursors.tsx # Remote cursor overlay on canvas
│   ├── chat/
│   │   ├── ChatSidebar.tsx         # Right-side drawer for active chat
│   │   └── ModelSelector.tsx       # Model picker dropdown
│   └── ui/                         # shadcn/ui primitives
├── lib/
│   ├── ai/providers.ts             # getModel(provider, modelId) abstraction
│   ├── store/canvas-store.ts       # Zustand store — reactive projection from Yjs
│   ├── yjs/
│   │   ├── doc.ts                  # Yjs document schema (getNodesMap, etc.)
│   │   ├── utils.ts                # Y.Map ↔ TypeScript type conversions
│   │   ├── bridge.ts               # Yjs write actions + Yjs→Zustand observers
│   │   ├── provider.tsx            # React context: Yjs doc + PartyKit connection
│   │   ├── seed.ts                 # Populate Yjs doc from Supabase (migration)
│   │   └── awareness.ts            # Presence: cursors, collaborator state
│   └── supabase/
│       ├── client.ts               # Browser client (createBrowserClient)
│       ├── server.ts               # Server client (createServerClient, async cookies)
│       ├── admin.ts                # Service role client (bypasses RLS)
│       └── sync.ts                 # Direct Supabase writes (messages for AI routes)
├── proxy.ts                        # Auth session refresh + route protection (Next.js 16)
└── types/canvas.ts                 # ChatNodeData, ChatFlowNode, ModelConfig, etc.

doc/
├── adr/                             # Architecture Decision Records (see below)
└── design.md                        # Design system — colors, typography, spacing, patterns

supabase/
└── migrations/
    ├── 001_*.sql                    # Initial schema (profiles, projects, nodes, edges, messages)
    └── 002_yjs_documents.sql        # Yjs binary snapshot storage
```

## Architecture Decision Records

All significant architectural decisions are documented in `doc/adr/`. Each record captures the context, the decision with rejected alternatives, and tradeoffs.

**Before implementing a feature:** read all ADRs in `doc/adr/` to ensure your approach is consistent with established decisions. If an existing decision needs to change, create a new ADR that supersedes the old one — never silently diverge.

**During feature development:** if you make an architectural decision (new technology, data model choice, integration pattern, security boundary, etc.), create a new ADR before or alongside the implementation. Use the next available sequence number and follow the format in `doc/adr/0001-use-architecture-decision-records.md`.

**When superseding a decision:** update the old ADR's status to `Superseded by ADR-NNNN` and set the new ADR's status to `Accepted`.

Current ADRs:
- **0001** — Use Architecture Decision Records
- **0002** — Yjs as Source of Truth with Zustand Projection
- **0003** — PartyKit for Managed WebSocket Infrastructure
- **0004** — Dual-Write Pattern (Yjs + Supabase)
- **0005** — Streaming Guard for AI Responses
- **0006** — Context Linking via System Prompt Injection
- **0007** — Server-Side AI Only
- **0008** — Compact Card Nodes with Sidebar Drawer
- **0009** — Debounced Position and Metadata Sync
- **0010** — Email/Password Auth via Supabase

## Design System

All visual decisions are documented in `doc/design.md`. Key rules:
- **Dark mode default** — canvas tool aesthetic, not consumer app
- **Canvas is the hero** — chrome recedes, toolbars float, panels are collapsible
- **Color means something** — blue=interactive, orange=source handle, green=presence, red=destructive. No decorative color.
- **Compact density** — `text-sm` max on canvas, `gap-2` default, truncate aggressively
- **No AI slop** — no purple gradients, no glassmorphism, no bouncy animations, no chat-app aesthetics

Read `doc/design.md` before making any visual changes.

## Key Patterns

### State (canvas-store.ts)
Zustand store is a **reactive projection** of the Yjs document. Actions write to Yjs; observers push changes to Zustand. Key actions:
- `addChatNode(position, modelConfig)` — creates node, returns UUID
- `addMessage(nodeId, message)` / `updateLastAssistantMessage(nodeId, content)`
- `updateNodeTitle(nodeId, title)` / `updateNodeSummary(nodeId, summary)`
- `openSidebar(nodeId)` / `closeSidebar()`
- `getConnectedContexts(nodeId)` — returns summaries from incoming source nodes

### Chat Flow
1. User types in sidebar → `addMessage()` to store + `sendMessage()` via AI SDK
2. `onFinish` callback: saves assistant message, triggers summarization
3. On first assistant response: auto-suggests a title if still default "Chat N"
4. Connected contexts are injected as system prompt sections

### Edge/Connection Rules
- Edges must go from a **source handle** (orange, `source-*`) to a **target handle** (blue, `target-*`)
- Self-connections and duplicates are blocked
- `isValidConnection` on ReactFlow enforces this visually while dragging

### Node Interactions
- **Click** → opens sidebar drawer
- **Hover (400ms)** → floating preview of last 4 messages
- **Click title text** → inline edit (Enter saves, Escape reverts, `nodrag` class prevents drag)
- Titles are editable on the node card and in the sidebar header

## Available Models (hardcoded in types/canvas.ts)
- Claude Sonnet (`claude-sonnet-4-20250514`)
- Claude Haiku (`claude-haiku-4-5-20251001`)
- GPT-4o (`gpt-4o`)
- GPT-4o Mini (`gpt-4o-mini`)

## Auth & Database

### Auth Flow
- Email/password via Supabase Auth
- `src/proxy.ts` refreshes sessions on every request and protects `/canvas/*` and `/api/*` routes
- Always use `supabase.auth.getUser()` (server-verified), never `getSession()` alone
- All API routes have auth guards at the top of their POST handlers

### Database Schema (Supabase Postgres)
- `profiles` — auto-created via trigger on `auth.users` insert
- `projects` — canvases, owned by a user
- `nodes` — chat nodes with position, model config, summary
- `edges` — connections between nodes (text ID matching React Flow format)
- `messages` — chat messages (append-only, belongs to a node)
- `yjs_documents` — binary Yjs state snapshots (one per project, used by PartyKit for persistence)
- All tables have RLS policies scoped to project owner via `auth.uid()`

### Supabase Clients
- **Browser** (`lib/supabase/client.ts`): `createBrowserClient` — for `'use client'` components
- **Server** (`lib/supabase/server.ts`): `createServerClient` — for server components, API routes (note: `cookies()` must be awaited in Next.js 16)
- **Admin** (`lib/supabase/admin.ts`): service role client — bypasses RLS

## Multiplayer / Realtime Sync (Yjs + PartyKit)

### Architecture
- **Yjs** is the source of truth for all canvas data (nodes, edges, messages, project metadata)
- **Zustand** is a reactive projection layer: Yjs observers push changes → `useCanvasStore.setState()`
- **PartyKit** provides the managed WebSocket server (Cloudflare Workers + Durable Objects)
- Data flow: `User Action → Yjs Doc → (observer) → Zustand → React`

### Yjs Document Schema (`src/lib/yjs/doc.ts`)
- `yDoc.getMap('nodes')` → `Y.Map<string, Y.Map>` (nodeId → node fields)
- `yDoc.getMap('edges')` → `Y.Map<string, Y.Map>` (edgeId → edge fields)
- `yDoc.getMap('messages')` → `Y.Map<string, Y.Array<Y.Map>>` (nodeId → messages)
- `yDoc.getMap('project')` → `Y.Map` (title, purpose)

### Key Files
- `src/lib/yjs/doc.ts` — Yjs doc schema accessors
- `src/lib/yjs/utils.ts` — Convert between Yjs Y.Map ↔ TypeScript types
- `src/lib/yjs/bridge.ts` — Write actions (yjsAddNode, etc.) + observers (Yjs → Zustand)
- `src/lib/yjs/provider.tsx` — React context providing Yjs doc + PartyKit connection
- `src/lib/yjs/seed.ts` — Populates Yjs doc from Supabase for pre-Yjs projects
- `src/lib/yjs/awareness.ts` — Presence: cursors, collaborator tracking
- `partykit/server.ts` — PartyKit Yjs server with snapshot persistence

### Streaming AI Responses
- Streaming chunks stay **local-only** in Zustand (`updateLastAssistantMessage`)
- Final message committed to Yjs via `addMessage` in `onFinish` callback
- Messages also written to Supabase `messages` table for server-side AI API routes

### Presence (Phase 2)
- Awareness protocol via y-partykit broadcasts cursor position + selected node
- `CollaboratorCursors` renders remote cursors on the canvas
- `CollaboratorAvatars` shows who's online (top-right)
- `ChatNode` shows colored border when another user has it selected

### Running Locally
```bash
# Terminal 1: PartyKit server
npm run dev:partykit

# Terminal 2: Next.js dev server
npm run dev
```

### Environment Variables
- `NEXT_PUBLIC_PARTYKIT_HOST` — PartyKit server host (default: `localhost:1999`)

## What's Not Built Yet
- Sharing / access control (project_members table, share dialog)
- Offline support (y-indexeddb for local persistence)
- Agent nodes (mediator/strategist)
- File nodes
- BYOK (bring your own key)
