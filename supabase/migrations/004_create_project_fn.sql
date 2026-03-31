-- Security-definer function to create a project.
-- Bypasses RLS since auth.uid() returns null with publishable-key ES256 JWTs.
-- Caller must pass the verified user ID (verified via supabase.auth.getUser() in app code).
create or replace function create_project(p_owner_id uuid)
returns uuid as $$
declare
  new_id uuid;
begin
  insert into projects (owner_id)
  values (p_owner_id)
  returning id into new_id;

  return new_id;
end;
$$ language plpgsql security definer;
