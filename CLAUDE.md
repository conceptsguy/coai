@AGENTS.md

# Coai — Collaborative AI Canvas

## What This Is

An infinite canvas where AI chat sessions are visual nodes you can place, connect, and collaborate through. Connected nodes share context via rolling summaries so conversations inform each other. Starting as an internal Crema tool, targeting SaaS.

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **React Flow** (`@xyflow/react`) — node/edge canvas
- **Vercel AI SDK 6** (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`, `@ai-sdk/openai`) — streaming chat, model abstraction
- **Zustand** — client state (canvas-store.ts is the single source of truth)
- **Tailwind CSS 4** + **shadcn/ui** (base-ui based) — styling/components
- **Supabase** — planned for auth, persistence, realtime (not yet wired)

## Commands

```bash
npm run dev     # Start dev server
npm run build   # Production build (use to verify changes compile)
npm run lint    # ESLint
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts           # Streaming chat endpoint (POST)
│   │   ├── summarize/route.ts      # Rolling summary generation (Haiku)
│   │   └── suggest-title/route.ts  # Auto-title from first exchange (Haiku)
│   ├── canvas/[id]/page.tsx        # Main canvas page
│   ├── layout.tsx                  # Root layout (Geist fonts, metadata)
│   └── page.tsx                    # Landing page → redirects to canvas
├── components/
│   ├── canvas/
│   │   ├── CanvasEditor.tsx        # ReactFlow wrapper (controls, minimap, edge validation)
│   │   └── ChatNode.tsx            # Custom node: compact card, hover preview, click→sidebar
│   ├── chat/
│   │   ├── ChatSidebar.tsx         # Right-side drawer for active chat
│   │   └── ModelSelector.tsx       # Model picker dropdown
│   └── ui/                         # shadcn/ui primitives
├── lib/
│   ├── ai/providers.ts             # getModel(provider, modelId) abstraction
│   └── store/canvas-store.ts       # Zustand store — all canvas/node/edge state
└── types/canvas.ts                 # ChatNodeData, ChatFlowNode, ModelConfig, etc.
```

## Architecture Decisions

- **All AI calls go through server** — API routes proxy to Anthropic/OpenAI. Never call from client.
- **React Flow node ID = future Postgres record ID** — same UUID everywhere.
- **Cheap models for background tasks** — Haiku for summarization and auto-titling; frontier models for user-facing chat.
- **Context linking via summaries** — connected nodes inject rolling summaries into the system prompt, not raw message history. Keeps token costs manageable.
- **Nodes are always compact cards on canvas** — no expanded on-canvas view. Hover shows a message preview popover; click opens the sidebar drawer.

## Key Patterns

### State (canvas-store.ts)
Zustand store is the single source of truth. Key actions:
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

## What's Not Built Yet
- Auth (Supabase)
- Persistence / database (everything is in-memory Zustand)
- Multiplayer / realtime sync (Yjs planned)
- Agent nodes (mediator/strategist)
- File nodes
- BYOK (bring your own key)
