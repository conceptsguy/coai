-- Yjs document binary snapshots for PartyKit persistence fallback
-- Primary persistence is via PartyKit Durable Objects,
-- but this table serves as a backup and for migration from pre-Yjs projects.

CREATE TABLE yjs_documents (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  state BYTEA NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: same owner-scoped policy as projects
ALTER TABLE yjs_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own yjs documents"
  ON yjs_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = yjs_documents.project_id
      AND projects.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = yjs_documents.project_id
      AND projects.owner_id = auth.uid()
    )
  );
