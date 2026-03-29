# ADR-0007: Server-Side AI Only

**Status:** Accepted
**Date:** 2026-03-28

## Context

LLM API calls require API keys and incur per-token costs. The question is whether to call providers from the client (with a proxy for keys) or exclusively from server-side API routes.

## Decision

All LLM calls go through Next.js API routes (`/api/chat`, `/api/summarize`, `/api/suggest-title`). The client never calls AI providers directly.

Each route has an auth guard at the top — `supabase.auth.getUser()` — that rejects unauthenticated requests. API keys live in server-side environment variables only.

A two-tier model strategy keeps costs manageable:
- **Frontier models** (Sonnet, GPT-4o) for user-facing chat — quality matters
- **Cheap models** (Haiku, GPT-4o Mini) for background tasks (summarization, title suggestion) — speed and cost matter more than peak quality

## Tradeoffs

**Gained:** API keys never reach the client. Auth is enforced at the route level, not just the UI. Cost control is centralized — we can add rate limiting, logging, or model routing in one place. The BYOK feature (future) can be layered onto these same routes.

**Accepted:** Every AI interaction has a server round-trip. For streaming chat this is negligible (the stream starts quickly), but for background tasks like summarization it means the client must wait for a network call that could theoretically run locally. This is the right tradeoff for a multi-user tool where cost and access control matter.
