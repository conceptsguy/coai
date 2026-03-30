"use server";

import { createClient } from "@/lib/supabase/server";

export type MemberInfo = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: "owner" | "editor";
  isPending: boolean;
};

export async function inviteMember(
  projectId: string,
  rawEmail: string
): Promise<{ success: true; pending: boolean } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const email = rawEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { success: false, error: "Invalid email address" };
  }

  // Verify caller is project owner
  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();

  if (!project || project.owner_id !== user.id) {
    return { success: false, error: "Only the owner can invite members" };
  }

  // Reject self-invite
  if (email === user.email?.toLowerCase()) {
    return { success: false, error: "You can't invite yourself" };
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("email", email)
    .single();

  if (existing) {
    return { success: false, error: "This person is already invited" };
  }

  // Look up profile to see if user exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  const { error } = await supabase.from("project_members").insert({
    project_id: projectId,
    email,
    profile_id: profile?.id ?? null,
    role: "editor",
  });

  if (error) {
    return { success: false, error: "Failed to send invite" };
  }

  return { success: true, pending: !profile };
}

export async function removeMember(
  projectId: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // RLS enforces owner-only delete, but let's be explicit
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("id", memberId)
    .eq("project_id", projectId);

  if (error) {
    return { success: false, error: "Failed to remove member" };
  }

  return { success: true };
}

export async function getMembers(projectId: string): Promise<MemberInfo[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get project owner
  const { data: project } = await supabase
    .from("projects")
    .select("owner_id, profiles!projects_owner_id_fkey(email, display_name, avatar_url)")
    .eq("id", projectId)
    .single();

  if (!project) return [];

  const ownerProfile = project.profiles as unknown as {
    email: string;
    display_name: string | null;
    avatar_url: string | null;
  };

  const members: MemberInfo[] = [
    {
      id: project.owner_id,
      email: ownerProfile?.email ?? "",
      displayName: ownerProfile?.display_name ?? null,
      avatarUrl: ownerProfile?.avatar_url ?? null,
      role: "owner",
      isPending: false,
    },
  ];

  // Get project members
  const { data: rows } = await supabase
    .from("project_members")
    .select("id, email, role, profile_id, profiles(display_name, avatar_url)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (rows) {
    for (const row of rows) {
      const profile = row.profiles as unknown as {
        display_name: string | null;
        avatar_url: string | null;
      } | null;

      members.push({
        id: row.id,
        email: row.email,
        displayName: profile?.display_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        role: row.role as "editor",
        isPending: row.profile_id === null,
      });
    }
  }

  return members;
}
