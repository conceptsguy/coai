-- ============================================================
-- 006_shared_cognitive_workspace.sql
-- Phase 1: Shared cognitive workspace data model
-- ============================================================

-- ── projects: add mode + brief columns ──────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'canvas'
    CHECK (mode IN ('canvas', 'ideation')),
  ADD COLUMN IF NOT EXISTS brief text DEFAULT '';

-- ── threads: one row per chat node when in workspace mode ───
-- node_id UNIQUE ensures one thread per node; existing node RLS
-- continues to protect access via is_project_member().
CREATE TABLE threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  node_id uuid NOT NULL UNIQUE REFERENCES nodes(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES profiles(id),
  participants uuid[] NOT NULL DEFAULT '{}',
  focus_mode boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'parked', 'resolved')),
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_threads_project ON threads(project_id);
CREATE INDEX idx_threads_node    ON threads(node_id);
CREATE INDEX idx_threads_status  ON threads(project_id, status);

ALTER TABLE threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access threads in member projects"
  ON threads FOR ALL
  USING (is_project_member(project_id));

-- ── shared_context_docs: one row per project ────────────────
-- Supabase holds the canonical snapshot; Yjs holds the live
-- realtime version. Columns use jsonb per section for
-- independent querying in future phases.
CREATE TABLE shared_context_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'ideation',
  problem_statement text DEFAULT '',
  constraints_and_goals jsonb NOT NULL DEFAULT '[]',
  workstreams jsonb NOT NULL DEFAULT '[]',
  emerging_themes jsonb NOT NULL DEFAULT '[]',
  key_insights jsonb NOT NULL DEFAULT '[]',
  tensions_and_open_questions jsonb NOT NULL DEFAULT '[]',
  decisions_made jsonb NOT NULL DEFAULT '[]',
  convergence_summary text DEFAULT NULL,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_shared_context_project ON shared_context_docs(project_id);

ALTER TABLE shared_context_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access shared context in member projects"
  ON shared_context_docs FOR ALL
  USING (is_project_member(project_id));

-- ── context_updates: proposed/accepted/rejected updates ─────
-- target_section is plain text (not enum) so new SharedContextDoc
-- sections can be added without a migration.
CREATE TABLE context_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  proposed_by_thread_id uuid REFERENCES threads(id) ON DELETE SET NULL,
  proposed_by_node_id uuid REFERENCES nodes(id) ON DELETE SET NULL,
  proposed_by_user_id uuid NOT NULL REFERENCES profiles(id),
  target_section text NOT NULL,
  content text NOT NULL,
  rationale text DEFAULT '',
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'accepted', 'rejected')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_context_updates_project ON context_updates(project_id);
CREATE INDEX idx_context_updates_status  ON context_updates(project_id, status);

ALTER TABLE context_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access context updates in member projects"
  ON context_updates FOR ALL
  USING (is_project_member(project_id));
