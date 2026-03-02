import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppCache } from "@/hooks/useAppCache";

interface TeamMemberWithProfile {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
    email: string;
    job_title: string | null;
    company: string | null;
  };
}

interface Team {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export function useTeam() {
  const { isAuthenticated } = useAppCache();
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadTeam = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's team (either created or member of)
      const { data: memberOf } = await supabase
        .from("team_members")
        .select("team_id, role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      let teamId: string | null = null;

      if (memberOf) {
        teamId = memberOf.team_id;
        setIsAdmin(memberOf.role === "admin");
      } else {
        // Check if they created a team
        const { data: ownTeam } = await supabase
          .from("teams")
          .select("*")
          .eq("created_by", user.id)
          .limit(1)
          .maybeSingle();

        if (ownTeam) {
          teamId = ownTeam.id;
          setTeam(ownTeam);
          setIsAdmin(true);
        }
      }

      if (!teamId) {
        setLoading(false);
        return;
      }

      // Load team details
      const { data: teamData } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single();

      if (teamData) setTeam(teamData);

      // Load members
      const { data: members } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", teamId);

      if (members) {
        // Fetch profiles for each member
        const memberIds = members.map((m) => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, email, job_title, company")
          .in("id", memberIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        setTeamMembers(
          members
            .filter((m) => m.user_id !== user.id) // Exclude self
            .map((m) => ({
              ...m,
              profile: profileMap.get(m.user_id) || undefined,
            }))
        );
      }
    } catch (err) {
      console.error("Error loading team:", err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const createTeam = async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("teams")
      .insert({ name, created_by: user.id })
      .select()
      .single();

    if (error) throw error;

    // Add creator as admin member
    await supabase.from("team_members").insert({
      team_id: data.id,
      user_id: user.id,
      role: "admin",
    });

    await loadTeam();
    return data;
  };

  const inviteMember = async (email: string) => {
    if (!team) throw new Error("No team");

    // Find user by email
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!profile) throw new Error("User not found with that email");

    const { error } = await supabase.from("team_members").insert({
      team_id: team.id,
      user_id: profile.id,
      role: "member",
    });

    if (error) {
      if (error.code === "23505") throw new Error("Already a team member");
      throw error;
    }

    await loadTeam();
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", memberId);

    if (error) throw error;
    await loadTeam();
  };

  const updateMemberRole = async (memberId: string, role: string) => {
    const { error } = await supabase
      .from("team_members")
      .update({ role })
      .eq("id", memberId);

    if (error) throw error;
    await loadTeam();
  };

  return {
    team,
    teamMembers,
    loading,
    isAdmin,
    createTeam,
    inviteMember,
    removeMember,
    updateMemberRole,
    refetch: loadTeam,
  };
}
