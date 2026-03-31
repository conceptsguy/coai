-- File storage: Supabase Storage bucket + metadata table
-- Supports file nodes on the canvas (user uploads + AI-generated documents)

-- ============================================================
-- Storage bucket
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-files', 'project-files', false, 52428800)  -- 50MB limit
on conflict (id) do nothing;

-- Storage RLS: project members can read/write files scoped to their projects
-- File paths follow: {project_id}/{node_id}/{filename}

create policy "Project members can read files"
  on storage.objects for select
  using (
    bucket_id = 'project-files'
    and is_project_member((storage.foldername(name))[1]::uuid)
  );

create policy "Project members can upload files"
  on storage.objects for insert
  with check (
    bucket_id = 'project-files'
    and is_project_member((storage.foldername(name))[1]::uuid)
  );

create policy "Project members can delete files"
  on storage.objects for delete
  using (
    bucket_id = 'project-files'
    and is_project_member((storage.foldername(name))[1]::uuid)
  );

-- ============================================================
-- Files metadata table (1:1 with file nodes)
-- ============================================================

create table files (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null unique,
  project_id uuid not null references projects(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_type text not null,       -- MIME type
  file_size bigint not null,     -- bytes
  content_text text,             -- extracted text for context injection (null for binary)
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create index idx_files_project on files(project_id);
create index idx_files_node on files(node_id);

-- RLS
alter table files enable row level security;

create policy "Access files in member projects"
  on files for all
  using (is_project_member(project_id));

-- ============================================================
-- Add node_type column to nodes table
-- ============================================================

alter table nodes add column if not exists node_type text not null default 'chat';
alter table nodes add constraint nodes_type_check check (node_type in ('chat', 'file'));
