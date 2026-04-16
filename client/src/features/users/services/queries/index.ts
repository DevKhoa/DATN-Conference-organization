import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UsersKeys } from "./keys";
import { ChairCandidate, ProfileData } from "./types";
import useAuth from "@/features/auth/hooks/useAuth";
import {
  formatRoleLabel,
  getHighestRole,
  Role,
  ROLE_PRIORITY,
} from "@/features/auth/types";

export const useChairCandidatesQuery = () => {
  return useQuery({
    queryKey: [UsersKeys.ChairCandidates],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "user_id, full_name, email, organization, user_roles!inner(role_id)",
        )
        // TODO: need to change since user_roles no longer used
        .eq("user_roles.role_id", 6);

      if (error) throw error;

      const formatted: ChairCandidate[] = (data || []).map((u: any) => ({
        user_id: u.user_id,
        full_name: u.full_name,
        email: u.email,
        organization: u.organization,
      }));

      return formatted;
    },
  });
};

export const useMyProfileQuery = () => {
  const { session, roles } = useAuth();

  return useQuery({
    queryKey: [UsersKeys.MyProfile, session?.user?.id, roles],
    queryFn: async () => {
      const userId = session?.user?.user_metadata["user_id"] as
        | number
        | undefined;

      if (!userId) {
        throw new Error("You are not logged in or your session has expired.");
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          user_id,
          full_name,
          email,
          organization,
          description,
          created_at,
          avatar_url
        `,
        )
        .eq("user_id", userId)
        .single();

      if (error) throw error;

      const highestRole = getHighestRole(roles);
      const roleId = highestRole
        ? ROLE_PRIORITY.indexOf(highestRole) + 1
        : ROLE_PRIORITY.indexOf(Role.ATTENDEE) + 1;
      const roleName = formatRoleLabel(highestRole);

      return {
        user_id: data.user_id,
        full_name: data.full_name,
        email: data.email,
        organization: data.organization,
        description: data.description,
        created_at: data.created_at,
        role_name: roleName,
        role_id: roleId,
        avatar_url: data.avatar_url,
      } as ProfileData;
    },
    enabled: !!session,
  });
};
