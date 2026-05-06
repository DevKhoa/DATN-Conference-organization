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

export const CHAIR_CANDIDATE_SEARCH_KEYS = [
  "full_name",
  "email",
  "organization",
] as const;

export type ChairCandidateSearchKey =
  (typeof CHAIR_CANDIDATE_SEARCH_KEYS)[number];

type UseChairCandidatesQueryParams = {
  searchKey?: ChairCandidateSearchKey;
  searchTerm?: string;
  limit?: number;
  enabled?: boolean;
};

type UseSearchChairCandidatesBySessionQueryParams =
  UseChairCandidatesQueryParams & {
    sessionId: number;
  };

export const useChairCandidatesQuery = ({
  searchKey = CHAIR_CANDIDATE_SEARCH_KEYS[0],
  searchTerm = "",
  limit,
  enabled = true,
}: UseChairCandidatesQueryParams = {}) => {
  const normalizedSearchTerm = searchTerm.trim();

  return useQuery({
    queryKey: [
      UsersKeys.ChairCandidates,
      searchKey,
      normalizedSearchTerm,
      limit,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_chair_candidates", {
        p_search_key: searchKey,
        p_search_term: normalizedSearchTerm,
        p_limit: typeof limit === "number" ? limit : undefined,
        p_role_id: 6,
      });

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];

      const formatted: ChairCandidate[] = rows.map((u) => ({
        user_id: u.user_id,
        full_name: u.full_name,
        email: u.email,
        organization: u.organization,
      }));

      return formatted;
    },
    enabled,
  });
};

export const useSearchChairCandidatesBySessionQuery = ({
  searchKey = CHAIR_CANDIDATE_SEARCH_KEYS[0],
  searchTerm = "",
  limit,
  sessionId,
  enabled = true,
}: UseSearchChairCandidatesBySessionQueryParams) => {
  const normalizedSearchTerm = searchTerm.trim();

  return useQuery({
    queryKey: [
      UsersKeys.ChairCandidates,
      searchKey,
      normalizedSearchTerm,
      limit,
      sessionId,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_chair_candidates_by_session",
        {
          p_search_key: searchKey,
          p_search_term: normalizedSearchTerm,
          p_limit: typeof limit === "number" ? limit : undefined,
          p_role_id: 6,
          p_session_id: sessionId,
        },
      );

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];

      const formatted: ChairCandidate[] = rows.map((u) => ({
        user_id: u.user_id,
        full_name: u.full_name,
        email: u.email,
        organization: u.organization,
      }));

      return formatted;
    },
    enabled,
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
