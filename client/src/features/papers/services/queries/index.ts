import { useQuery } from "@tanstack/react-query";
import { PapersKeys } from "./keys";
import { supabase } from "@/lib/supabase";
import { PaginatedParams } from "@/hooks/usePagination";
import useAuth from "@/features/auth/hooks/useAuth";
import type {
  SubmitAuthor,
  SubmitConference,
  SubmitExistingPaper,
} from "../../types";

export interface MyPaperItem {
  paper_id: number;
  title: string;
  abstract: string | null;
  status: string | null;
  created_at: string | null;
  submitted_conf: number | null;
  conference?: {
    conf_name: string | null;
  } | null;
}

export interface MyPaperReview {
  review_id: number;
  review_date: string | null;
  recommendation: string | null;
  score: number | null;
  comments: string | null;
  reviewer?: {
    full_name: string | null;
  } | null;
}

export interface MyPaperVersion {
  version_id: number;
  version_number: number | null;
  upload_date: string | null;
  file_path: string | null;
}

export interface MyPaperDetail {
  paper_id: number;
  title: string | null;
  status: string | null;
  conference?: {
    conf_name: string | null;
  } | null;
}

export interface MyPaperDetailResult {
  paper: MyPaperDetail;
  latestVersion: MyPaperVersion | null;
  reviews: MyPaperReview[];
}

export interface PublicPaperDetail {
  paper_id: number;
  title: string | null;
  abstract: string | null;
  primary_author_id: number | null;
  author: {
    full_name: string | null;
  } | null;
  conference?: {
    conf_name: string | null;
  } | null;
  session_links?: {
    session: {
      format_type: string | null;
    } | null;
  }[] | null;
}

export const usePublicPaperDetailQuery = (paperId: number | null) => {
  return useQuery({
    queryKey: [PapersKeys.PublicPaperDetail, paperId],
    queryFn: async () => {
      if (!paperId) throw new Error("Invalid paper id.");

      const { data, error } = await supabase
        .from("papers")
        .select(`
          paper_id, title, abstract, primary_author_id,
          author:profiles!primary_author_id(full_name),
          conference:conferences!submitted_conf(conf_name),
          session_links:session_papers(session:sessions(format_type))
        `)
        .eq("paper_id", paperId)
        .single();

      if (error) throw error;

      return {
        ...data,
        author: Array.isArray(data.author) ? data.author[0] ?? null : data.author ?? null,
        conference: Array.isArray(data.conference) ? data.conference[0] ?? null : data.conference ?? null,
        session_links: data.session_links,
      } as PublicPaperDetail;
    },
    enabled: !!paperId,
  });
};

export const useAcceptedPapersQuery = (conferenceId: number) => {
  return useQuery({
    queryKey: [PapersKeys.AcceptedPapers, conferenceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("papers")
        .select(
          `
          paper_id, title, abstract,
          author:profiles!primary_author_id ( full_name )
        `,
        )
        .eq("submitted_conf", conferenceId)
        .eq("status", "ACCEPTED");

      if (error) throw error;

      const formatted = (data || []).map((p) => ({
        paper_id: p.paper_id,
        title: p.title,
        abstract: p.abstract,
        author_name: p.author?.[0]?.full_name,
      }));

      return formatted;
    },
    enabled: !!conferenceId,
  });
};

export const useMyPapersQuery = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: [PapersKeys.MyPapers, session?.user?.id],
    queryFn: async () => {
      const userId = session?.user?.user_metadata["user_id"] as
        | number
        | undefined;

      if (!userId) {
        throw new Error("You are not logged in or your session has expired.");
      }

      const { data, error } = await supabase
        .from("papers")
        .select(
          `
          paper_id,
          title,
          abstract,
          status,
          created_at,
          submitted_conf,
          conference:conferences!submitted_conf (conf_name)
        `,
        )
        .eq("primary_author_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return ((data || []) as Array<any>).map((paper) => ({
        paper_id: paper.paper_id,
        title: paper.title,
        abstract: paper.abstract,
        status: paper.status,
        created_at: paper.created_at,
        submitted_conf: paper.submitted_conf,
        conference: Array.isArray(paper.conference)
          ? (paper.conference[0] ?? null)
          : (paper.conference ?? null),
      })) as MyPaperItem[];
    },
    enabled: !!session,
  });
};

export const useMyPaperDetailQuery = (paperId: number | null) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: [PapersKeys.MyPaperDetail, paperId, session?.user?.id],
    queryFn: async () => {
      const userId = session?.user?.user_metadata["user_id"] as
        | number
        | undefined;

      if (!paperId || Number.isNaN(paperId)) {
        throw new Error("Invalid paper id.");
      }

      if (!userId) {
        throw new Error("You are not logged in or your session has expired.");
      }

      const [
        { data: paperData, error: paperError },
        { data: versionData },
        { data: reviewsData },
      ] = await Promise.all([
        supabase
          .from("papers")
          .select(
            "paper_id, title, status, conference:conferences!submitted_conf(conf_name)",
          )
          .eq("paper_id", paperId)
          .eq("primary_author_id", userId)
          .single(),
        supabase
          .from("paper_versions")
          .select("version_id, version_number, upload_date, file_path")
          .eq("paper_id", paperId)
          .order("version_number", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("reviews")
          .select(
            "review_id, review_date, recommendation, score, comments, reviewer:profiles!reviewer_id(full_name)",
          )
          .eq("paper_id", paperId)
          .order("review_date", { ascending: false }),
      ]);

      if (paperError) throw paperError;

      const normalizedPaper = {
        ...paperData,
        conference: Array.isArray((paperData as any).conference)
          ? (((paperData as any).conference[0] ?? null) as {
            conf_name: string | null;
          } | null)
          : (((paperData as any).conference ?? null) as {
            conf_name: string | null;
          } | null),
      } as MyPaperDetail;

      const normalizedReviews = ((reviewsData || []) as Array<any>).map(
        (review) => ({
          review_id: review.review_id,
          review_date: review.review_date,
          recommendation: review.recommendation,
          score: review.score,
          comments: review.comments,
          reviewer: Array.isArray(review.reviewer)
            ? (review.reviewer[0] ?? null)
            : (review.reviewer ?? null),
        }),
      ) as MyPaperReview[];

      return {
        paper: normalizedPaper,
        latestVersion: (versionData as MyPaperVersion | null) ?? null,
        reviews: normalizedReviews,
      } as MyPaperDetailResult;
    },
    enabled: !!paperId && !!session,
  });
};

export interface PapersFilterParams {
  searchTerm?: string;
  statusFilter?: string;
  conferenceFilter?: string;
  authorFilter?: string;
}

export const usePapersCountQuery = (filters: PapersFilterParams = {}) => {
  const { searchTerm, statusFilter, conferenceFilter, authorFilter } = filters;

  return useQuery({
    queryKey: [PapersKeys.PapersCount, searchTerm, statusFilter, conferenceFilter, authorFilter],
    queryFn: async () => {
      let query = supabase
        .from("papers")
        .select(
          "*, author:profiles!primary_author_id (full_name), conference:conferences!submitted_conf (conf_name)",
          { count: "exact", head: false },
        );

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,abstract.ilike.%${searchTerm}%`);
      }
      if (statusFilter && statusFilter !== "ALL") {
        query = query.eq("status", statusFilter);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      // Conference and author filters require post-filtering since they are joined tables
      let filteredCount = count || 0;
      if ((conferenceFilter && conferenceFilter !== "ALL") || (authorFilter && authorFilter !== "ALL")) {
        const rows = data || [];
        const filtered = rows.filter((p: any) => {
          const conf = Array.isArray(p.conference) ? p.conference[0] : p.conference;
          const auth = Array.isArray(p.author) ? p.author[0] : p.author;
          if (conferenceFilter && conferenceFilter !== "ALL" && conf?.conf_name !== conferenceFilter) return false;
          if (authorFilter && authorFilter !== "ALL" && auth?.full_name !== authorFilter) return false;
          return true;
        });
        filteredCount = filtered.length;
      }

      return filteredCount;
    },
  });
};

export const usePaginatedPapersQuery = ({
  page,
  pageSize,
  totalCount = 0,
  filters = {},
}: PaginatedParams & { filters?: PapersFilterParams }) => {
  const { searchTerm, statusFilter, conferenceFilter, authorFilter } = filters;

  return useQuery({
    queryKey: [PapersKeys.PaginatedPapers, page, pageSize, totalCount, searchTerm, statusFilter, conferenceFilter, authorFilter],
    queryFn: async () => {
      const totalPages = Math.ceil(totalCount / pageSize);

      // Build the main query with filters applied server-side
      let query = supabase
        .from("papers")
        .select(
          `
          *,
          author:profiles!primary_author_id (full_name),
          conference:conferences!submitted_conf (conf_name)
        `,
        )
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,abstract.ilike.%${searchTerm}%`);
      }
      if (statusFilter && statusFilter !== "ALL") {
        query = query.eq("status", statusFilter);
      }

      // For conference/author filters on joined tables, we fetch all matching rows then paginate client-side
      const needsJoinFilter = (conferenceFilter && conferenceFilter !== "ALL") || (authorFilter && authorFilter !== "ALL");

      let papers: any[];

      if (needsJoinFilter) {
        const { data, error } = await query;
        if (error) throw error;

        const normalized = (data || []).map((p: any) => ({
          ...p,
          author: Array.isArray(p.author) ? p.author[0] ?? null : p.author ?? null,
          conference: Array.isArray(p.conference) ? p.conference[0] ?? null : p.conference ?? null,
        }));

        const filtered = normalized.filter((p: any) => {
          if (conferenceFilter && conferenceFilter !== "ALL" && p.conference?.conf_name !== conferenceFilter) return false;
          if (authorFilter && authorFilter !== "ALL" && p.author?.full_name !== authorFilter) return false;
          return true;
        });

        const from = (page - 1) * pageSize;
        papers = filtered.slice(from, from + pageSize);
      } else {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const { data, error } = await query.range(from, to);
        if (error) throw error;

        papers = (data || []).map((p: any) => ({
          ...p,
          author: Array.isArray(p.author) ? p.author[0] ?? null : p.author ?? null,
          conference: Array.isArray(p.conference) ? p.conference[0] ?? null : p.conference ?? null,
        }));
      }

      // Fetch ALL unique conferences for filter dropdown
      const { data: allConfsData } = await supabase
        .from("papers")
        .select("conference:conferences!submitted_conf (conf_name)")
        .not("submitted_conf", "is", null);

      // Fetch ALL unique authors for filter dropdown
      const { data: allAuthorsData } = await supabase
        .from("papers")
        .select("author:profiles!primary_author_id (full_name)")
        .not("primary_author_id", "is", null);

      const uniqueConfs = Array.from(
        new Set(
          (allConfsData || []).map((p: any) => {
            const c = Array.isArray(p.conference) ? p.conference[0] : p.conference;
            return c?.conf_name;
          }).filter(Boolean),
        ),
      ) as string[];

      const uniqueAuthors = Array.from(
        new Set(
          (allAuthorsData || []).map((p: any) => {
            const a = Array.isArray(p.author) ? p.author[0] : p.author;
            return a?.full_name;
          }).filter(Boolean),
        ),
      ) as string[];

      return {
        data: papers,
        totalCount,
        totalPages,
        currentPage: page,
        conferencesList: uniqueConfs.sort(),
        authorsList: uniqueAuthors.sort(),
      };
    },
    placeholderData: (previousData) => previousData,
  });
};

export const useSubmitOpenConferencesQuery = (enabled = true) => {
  return useQuery({
    queryKey: [PapersKeys.SubmitOpenConferences],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conferences")
        .select("conf_id, conf_name, start_date, location")
        .eq("open_for_papers", true)
        .order("start_date", { ascending: true });

      if (error) throw error;
      return (data || []) as SubmitConference[];
    },
    enabled,
  });
};

export const useSubmitAuthorsQuery = (enabled = true) => {
  return useQuery({
    queryKey: [PapersKeys.SubmitAuthors],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, organization")
        .order("full_name");

      if (error) throw error;
      return (data || []) as SubmitAuthor[];
    },
    enabled,
  });
};

export const useSubmitExistingPapersQuery = (
  conferenceId: number | null,
  enabled = true,
) => {
  return useQuery({
    queryKey: [PapersKeys.SubmitExistingPapers, conferenceId],
    queryFn: async () => {
      if (!conferenceId) return [] as SubmitExistingPaper[];

      const { data, error } = await supabase
        .from("papers")
        .select("paper_id, title, author:profiles!primary_author_id(full_name)")
        .eq("submitted_conf", conferenceId);

      if (error) throw error;

      return ((data || []) as Array<any>).map((paper) => ({
        paper_id: paper.paper_id,
        title: paper.title,
        author_name: Array.isArray(paper.author)
          ? (paper.author[0]?.full_name ?? "Unknown")
          : (paper.author?.full_name ?? "Unknown"),
      })) as SubmitExistingPaper[];
    },
    enabled: !!conferenceId && enabled,
  });
};
