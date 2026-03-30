-- Project members: email-based invites with pending state
-- Owner stays on projects.owner_id; this table holds editors (and future roles).
-- profile_id is null for pending invites (user hasn't signed up yet).

create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  email text not null,
  profile_id uuid references profiles(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz default now()
);

create unique index idx_project_members_email_project
  on project_members(project_id, email);
create index idx_project_members_profile
  on project_members(profile_id);
create index idx_project_members_pending
  on project_members(email) where profile_id is null;

-- Helper: returns true if the calling user owns or is a member of the project.
-- security definer so it can read projects/project_members without circular RLS.
create or replace function is_project_member(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from projects where id = p_project_id and owner_id = auth.uid()
  )
  or exists (
    select 1 from project_members
    where project_id = p_project_id and profile_id = auth.uid()
  );
$$ language sql security definer stable;

-- ============================================================
-- Updated RLS policies: owner OR member access
-- ============================================================

-- PROJECTS -----------------------------------------------
drop policy "Owners select own projects" on projects;
create policy "Users select accessible projects"
  on projects for select
  using (is_project_member(id));

-- insert/update/delete stay owner-only (unchanged logic)
-- (policies already reference auth.uid() = owner_id)

-- NODES --------------------------------------------------
drop policy "Access nodes in own projects" on nodes;
create policy "Access nodes in member projects"
  on nodes for all
  using (is_project_member(project_id));

-- EDGES --------------------------------------------------
drop policy "Access edges in own projects" on edges;
create policy "Access edges in member projects"
  on edges for all
  using (is_project_member(project_id));

-- MESSAGES -----------------------------------------------
drop policy "Access messages in own nodes" on messages;
create policy "Access messages in member projects"
  on messages for all
  using (
    node_id in (
      select n.id from nodes n where is_project_member(n.project_id)
    )
  );

-- YJS DOCUMENTS ------------------------------------------
drop policy "Users can manage own yjs documents" on yjs_documents;
create policy "Users can manage yjs documents in member projects"
  on yjs_documents for all
  using (is_project_member(project_id))
  with check (is_project_member(project_id));

-- PROJECT MEMBERS ----------------------------------------
alter table project_members enable row level security;

create policy "Members see project members"
  on project_members for select
  using (is_project_member(project_id));

create policy "Owners insert project members"
  on project_members for insert
  with check (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
  );

create policy "Owners delete project members"
  on project_members for delete
  using (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
  );

-- PROFILES -----------------------------------------------
-- Let users see profiles of people they share a project with
create policy "Users see collaborator profiles"
  on profiles for select
  using (
    auth.uid() = id
    or id in (
      -- other members of projects I belong to
      select pm.profile_id from project_members pm
      where pm.profile_id is not null
        and pm.project_id in (
          select p.id from projects p where p.owner_id = auth.uid()
          union
          select pm2.project_id from project_members pm2
          where pm2.profile_id = auth.uid()
        )
      union
      -- owners of projects I'm a member of
      select p.owner_id from projects p
      where p.id in (
        select pm3.project_id from project_members pm3
        where pm3.profile_id = auth.uid()
      )
    )
  );

-- ============================================================
-- Extend signup trigger to resolve pending invites
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );

  -- Activate any pending invites for this email
  update public.project_members
    set profile_id = new.id
    where email = lower(new.email)
      and profile_id is null;

  return new;
end;
$$ language plpgsql security definer;
