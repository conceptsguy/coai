-- Fix messages RLS policy: add explicit WITH CHECK for INSERT operations.
-- Previously with_check was null (relying on USING fallback), which caused
-- 403 Forbidden when client-side code tried to insert messages directly.
drop policy "Access messages in member projects" on messages;

create policy "Access messages in member projects"
  on messages for all
  using (
    node_id in (
      select n.id from nodes n where is_project_member(n.project_id)
    )
  )
  with check (
    node_id in (
      select n.id from nodes n where is_project_member(n.project_id)
    )
  );
