# ADR 0011: Email-Based Invite for Project Members

**Status:** Accepted
**Date:** 2026-03-30

## Context

Coai is a collaborative AI canvas — the core value prop is working on AI together. Currently only the project owner can access a canvas. We need a mechanism for owners to invite collaborators.

Options considered:
1. **Share links with tokens** — generate a unique URL; anyone with the link gains access. Simple but hard to revoke and no audit trail.
2. **Email-based invites** — owner enters an email; a `project_members` row is created. If the invitee has an account, they get immediate access. If not, the invite is "pending" and activates on signup.
3. **Team/workspace model** — all members of a team see all projects. Too heavy for v1; doesn't support per-canvas sharing.

## Decision

**Email-based invites** (option 2). The `project_members` table stores invites with the target email and an optional `profile_id` (null = pending). A Postgres trigger on `auth.users` INSERT resolves pending invites when the invitee signs up.

### Key design choices

- **Owner stays on `projects.owner_id`** — not duplicated into `project_members`. Avoids dual-source-of-truth for ownership.
- **Two roles:** `owner` (implicit from `projects.owner_id`) and `editor` (explicit row in `project_members`). Editors can do everything except delete the project or manage members.
- **Auto-accept:** When an existing user is invited, they immediately see the canvas — no separate accept/decline flow for v1.
- **No email notifications for v1:** The invite is stored in the database. Invitees discover shared canvases on their landing page. Email notifications can be added later.
- **RLS helper function:** `is_project_member(project_id)` checks `projects.owner_id` OR `project_members.profile_id` against `auth.uid()`. All table policies use this function.

## Consequences

- Members can access canvases via the landing page "Shared with you" section.
- Yjs/PartyKit connections have no independent auth — access control is enforced at the Supabase layer. A removed member keeps their WebSocket connection until they refresh, then gets bounced.
- Profile visibility is scoped: users can see profiles of people they share a project with, not all users.
- Future: email notifications, viewer role, team workspaces can build on this foundation.
