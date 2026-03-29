# ADR-0001: Use Architecture Decision Records

**Status:** Accepted
**Date:** 2026-03-28

## Context

Coai is built by humans and AI agents across multiple sessions. CLAUDE.md captures *what* to build and *how*, but not *why* specific architectural choices were made over alternatives. Without that reasoning:

- New sessions re-litigate decisions that were already carefully weighed
- Agents make changes that silently contradict established patterns
- As features like sharing, agent nodes, and BYOK are added, the original constraints behind current architecture are lost

## Decision

Adopt Architecture Decision Records as lightweight markdown files in `doc/adr/`. Each ADR captures context, the decision with rejected alternatives, and tradeoffs.

Format: `NNNN-kebab-case-title.md` with three sections — Context, Decision, Tradeoffs. Status is one of `Accepted`, `Superseded by ADR-NNNN`, or `Deprecated`. ADRs are immutable once accepted; changing course means a new ADR that supersedes the old one.

CLAUDE.md instructs all agents to read existing ADRs before implementing features and to create new ADRs when architectural decisions are made.

## Tradeoffs

Small overhead per decision, but prevents expensive rework from uninformed changes. ADRs can go stale if not maintained — superseding is the mechanism to keep them honest rather than silent edits.
