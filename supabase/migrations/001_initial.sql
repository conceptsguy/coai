-- Profiles (auto-populated from auth.users via trigger)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Projects (canvases)
create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null default 'Untitled Canvas',
  purpose text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Nodes (chat nodes on the canvas)
create table nodes (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null default 'New Chat',
  model_provider text not null default 'anthropic',
  model_id text not null default 'claude-sonnet-4-20250514',
  model_label text not null default 'Claude Sonnet',
  position_x float not null default 0,
  position_y float not null default 0,
  is_collapsed boolean default false,
  summary text default '',
  summary_message_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Edges (connections between nodes)
create table edges (
  id text primary key,
  project_id uuid not null references projects(id) on delete cascade,
  source_node_id uuid not null references nodes(id) on delete cascade,
  target_node_id uuid not null references nodes(id) on delete cascade,
  source_handle text,
  target_handle text,
  created_at timestamptz default now()
);

-- Messages (chat messages within nodes)
create table messages (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references nodes(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz default now()
);

-- Indexes
create index idx_projects_owner on projects(owner_id);
create index idx_nodes_project on nodes(project_id);
create index idx_edges_project on edges(project_id);
create index idx_messages_node on messages(node_id);
create index idx_messages_node_created on messages(node_id, created_at);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Row Level Security
alter table profiles enable row level security;
alter table projects enable row level security;
alter table nodes enable row level security;
alter table edges enable row level security;
alter table messages enable row level security;

-- Profiles: users see and update their own
create policy "Users see own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Projects: owners have full access
create policy "Owners select own projects"
  on projects for select
  using (auth.uid() = owner_id);

create policy "Owners insert own projects"
  on projects for insert
  with check (auth.uid() = owner_id);

create policy "Owners update own projects"
  on projects for update
  using (auth.uid() = owner_id);

create policy "Owners delete own projects"
  on projects for delete
  using (auth.uid() = owner_id);

-- Nodes: access through project ownership
create policy "Access nodes in own projects"
  on nodes for all
  using (project_id in (select id from projects where owner_id = auth.uid()));

-- Edges: access through project ownership
create policy "Access edges in own projects"
  on edges for all
  using (project_id in (select id from projects where owner_id = auth.uid()));

-- Messages: access through node → project ownership
create policy "Access messages in own nodes"
  on messages for all
  using (node_id in (
    select n.id from nodes n
    join projects p on n.project_id = p.id
    where p.owner_id = auth.uid()
  ));
