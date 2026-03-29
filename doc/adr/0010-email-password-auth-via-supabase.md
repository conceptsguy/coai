# ADR-0010: Email/Password Auth via Supabase

**Status:** Accepted
**Date:** 2026-03-28

## Context

Coai starts as an internal Crema tool with a small number of known users before expanding to a multi-tenant SaaS. Auth needs for the initial build are simple — Crema team members need accounts. The options:

1. **Supabase Auth (email/password)** — built into the existing database platform
2. **Clerk** — managed auth with pre-built UI components, social login, MFA
3. **Custom JWT** — full control, significant build burden

## Decision

Use Supabase Auth with email/password. Session management is handled by `@supabase/ssr` with cookie refresh in `proxy.ts` (Next.js 16 proxy). Route protection gates `/canvas/*` and `/api/*`.

All database access is scoped via RLS policies using `auth.uid()`. The current model is single-owner: each project belongs to one user, and RLS policies check project ownership. There is no `project_members` table yet.

Rejected **Clerk** because: it adds a vendor dependency and cost for functionality we don't need yet (social login, MFA, pre-built components). Supabase Auth is included in the existing Supabase subscription.

Rejected **custom JWT** because: session management, token refresh, and cookie handling are solved problems that don't benefit from custom implementation.

## Tradeoffs

**Gained:** Auth is bundled with the database — no additional vendor, cost, or integration surface. RLS policies tie directly to `auth.uid()`, keeping the security model simple and auditable.

**Accepted:** No social login, no MFA, no invite flows. These will be needed for SaaS but are premature for an internal tool with <10 users.

**Deferred:** Sharing/access control (`project_members` table, invite flow, role-based permissions). SSO for enterprise clients. These should be separate ADRs when the requirements are concrete.
