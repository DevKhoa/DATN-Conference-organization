import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  MailPlus,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import { Route } from "@/routes/(app)/conferences.$conferenceId.sessions/$sessionId/chairs";
import {
  fetchSessionChairInvitations,
  useSessionsByConferenceQuery,
} from "@/features/sessions/services/queries";
import { SessionKeys } from "@/features/sessions/services/queries/keys";
import {
  useCreateChairInvitationMutation,
  useMatchReviewMutation,
  useRecommendChairMutation,
} from "@/features/sessions/services/mutations";
import { AdminChairInvitationsTable } from "@/features/sessions/components/admin-chair-invitations-table";
import type { ChairInvitationTableItem } from "@/features/sessions/components/chair-invitations-columns";
import useAuth from "@/features/auth/hooks/useAuth";
import { ChairCandidateSearch } from "./components/ChairCandidateSearch";
import type { ChairCandidate } from "@/features/users/services/queries/types";
import type { IMatchReviewResponse } from "@/features/sessions/services/mutations/types";

type RecommendedChair = {
  user_id: number;
  full_name: string;
  email: string;
  organization: string;
  similarity?: string;
  match_score: number;
};

const ChairInvitationsPage = () => {
  const navigate = useNavigate();
  const { conferenceId, sessionId } = Route.useParams();
  const { session: authSession } = useAuth();

  const invitedBy = authSession?.user?.user_metadata?.user_id as
    | number
    | undefined;

  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    sessionId ? String(sessionId) : "",
  );
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedChair, setSelectedChair] = useState<ChairCandidate | null>(
    null,
  );
  const [recommendedChairs, setRecommendedChairs] = useState<
    RecommendedChair[]
  >([]);
  const [expandedReasoningUserId, setExpandedReasoningUserId] = useState<
    number | null
  >(null);
  const [reasoningByUserId, setReasoningByUserId] = useState<
    Record<number, IMatchReviewResponse | undefined>
  >({});
  const [loadingReasoningUserId, setLoadingReasoningUserId] = useState<
    number | null
  >(null);

  const { data: sessions = [], isLoading: isLoadingSessions } =
    useSessionsByConferenceQuery(Number(conferenceId));

  const createInvitationMutation = useCreateChairInvitationMutation();
  const recommendChairMutation = useRecommendChairMutation();
  const matchReviewMutation = useMatchReviewMutation();

  const invitationScope = selectedSessionId || "ALL";

  const { data: invitationRows = [], isLoading: isLoadingInvitations } =
    useQuery<ChairInvitationTableItem[]>({
      queryKey: [
        SessionKeys.ChairInvitations,
        conferenceId,
        invitationScope,
        sessions.map((s) => s.session_id).join(","),
      ],
      queryFn: async () => {
        const targetSessions = selectedSessionId
          ? sessions.filter((s) => s.session_id === Number(selectedSessionId))
          : sessions;

        const responses = await Promise.all(
          targetSessions.map((s) => fetchSessionChairInvitations(s.session_id)),
        );

        return responses.flatMap((res) =>
          (res.invitations || []).map(
            (inv): ChairInvitationTableItem => ({
              invitation_id: inv.invitation_id,
              conf_id: inv.conf_id,
              conf_name: inv.conf_name,
              session_id: inv.session_id,
              session_name: inv.session_name || res.session_name,
              email: inv.email,
              status: inv.status,
              token: inv.token,
              invited_by: inv.invited_by,
              created_at: inv.created_at,
              responded_at: inv.responded_at,
              invitee_user_id: inv.invitee_user_id,
              invite_link: inv.invite_link,
            }),
          ),
        );
      },
      enabled: Boolean(conferenceId) && sessions.length > 0,
    });

  const handleCreateInvitation = async () => {
    if (!selectedSessionId) {
      toast.error("Please select a session before sending an invitation.");
      return;
    }

    if (!inviteEmail.trim()) {
      toast.error("Please enter an invitee email.");
      return;
    }

    try {
      await createInvitationMutation.mutateAsync({
        sessionId: Number(selectedSessionId),
        email: inviteEmail.trim(),
        invitedBy,
      });
      setInviteEmail("");
      toast.success("Invitation sent successfully.");
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        "Failed to send invitation.";
      toast.error(message);
    }
  };

  const handleSelectChair = (candidate: ChairCandidate) => {
    setSelectedChair(candidate);
    setInviteEmail(candidate.email || "");
  };

  const handleClearChair = () => {
    setSelectedChair(null);
  };

  const handleRecommendChair = async () => {
    if (!selectedSessionId) {
      toast.error("Please select a session before requesting recommendations.");
      return;
    }

    try {
      const response = await recommendChairMutation.mutateAsync({
        sessionId: Number(selectedSessionId),
        limit: 5,
        threshold: 0.1,
      });

      setRecommendedChairs(response.recommended_chairs);
      setReasoningByUserId({});
      setExpandedReasoningUserId(null);
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        "Failed to recommend chairs.";
      toast.error(message);
    }
  };

  const handleShowReasoning = async (candidate: RecommendedChair) => {
    if (!selectedSessionId) {
      toast.error("Please select a session first.");
      return;
    }

    if (reasoningByUserId[candidate.user_id]) {
      setExpandedReasoningUserId((current) =>
        current === candidate.user_id ? null : candidate.user_id,
      );
      return;
    }

    try {
      setLoadingReasoningUserId(candidate.user_id);
      const response = await matchReviewMutation.mutateAsync({
        sessionId: Number(selectedSessionId),
        userId: candidate.user_id,
      });

      setReasoningByUserId((current) => ({
        ...current,
        [candidate.user_id]: response,
      }));
      setExpandedReasoningUserId(candidate.user_id);
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        "Failed to fetch match review.";
      toast.error(message);
    } finally {
      setLoadingReasoningUserId(null);
    }
  };

  const isLoading = isLoadingSessions || isLoadingInvitations;

  return (
    <DefaultLayout meta={{ title: "Chair Invitations" }}>
      <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Chair Invitations</h1>
              <p className="mt-2 text-muted-foreground">
                Send invitations and track invitation status for each session.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                navigate({
                  to: "/conferences/$conferenceId",
                  params: { conferenceId },
                })
              }
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Conference Detail
            </Button>
          </div>

          <div className="mb-6">
            <Select
              value={selectedSessionId}
              onValueChange={(value) => setSelectedSessionId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select session" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.session_id} value={String(s.session_id)}>
                    {s.session_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-6 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Create Invitation</h2>
            <div className="mt-4 space-y-4">
              <div className="flex items-end gap-3">
                <div className="min-w-0 flex-1">
                  <ChairCandidateSearch
                    sessionTempId={selectedSessionId || "invite"}
                    selectedChairId={selectedChair?.user_id}
                    selectedChairName={selectedChair?.full_name}
                    onSelectChair={handleSelectChair}
                    onClearChair={handleClearChair}
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRecommendChair}
                  disabled={recommendChairMutation.isPending}
                >
                  {recommendChairMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Recommend Chair
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Search and select an existing chair, or enter any email below to
                invite someone not registered yet.
              </p>

              <div className="flex gap-3">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);

                    if (
                      selectedChair &&
                      e.target.value.trim().toLowerCase() !==
                        selectedChair.email.trim().toLowerCase()
                    ) {
                      setSelectedChair(null);
                    }
                  }}
                  placeholder="Invitee email"
                />

                <Button
                  onClick={handleCreateInvitation}
                  disabled={createInvitationMutation.isPending}
                >
                  {createInvitationMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MailPlus className="mr-2 h-4 w-4" />
                  )}
                  Send Invite
                </Button>
              </div>
            </div>
          </div>

          {recommendedChairs.length > 0 && (
            <div className="mb-6 rounded-2xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Recommended Chairs</h2>
                <p className="text-sm text-muted-foreground">
                  {recommendedChairs.length} result
                  {recommendedChairs.length > 1 ? "s" : ""}
                </p>
              </div>

              <div className="space-y-3">
                {recommendedChairs.map((candidate) => {
                  const review = reasoningByUserId[candidate.user_id];
                  const isExpanded =
                    expandedReasoningUserId === candidate.user_id &&
                    Boolean(review);

                  return (
                    <div
                      key={candidate.user_id}
                      className="cursor-pointer rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary"
                      onClick={() => {
                        setInviteEmail(candidate.email);
                        setSelectedChair({
                          user_id: candidate.user_id,
                          full_name: candidate.full_name,
                          email: candidate.email,
                          organization: candidate.organization,
                        } as ChairCandidate);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold">
                              {candidate.full_name}
                            </h3>
                            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                              {(candidate.match_score * 100).toFixed(1)}% fit
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {candidate.email}
                            {candidate.organization
                              ? ` • ${candidate.organization}`
                              : ""}
                          </p>
                          {candidate.similarity && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Similarity: {candidate.similarity}
                            </p>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowReasoning(candidate);
                          }}
                          disabled={
                            loadingReasoningUserId === candidate.user_id
                          }
                        >
                          {loadingReasoningUserId === candidate.user_id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : isExpanded ? (
                            <ChevronUp className="mr-2 h-4 w-4" />
                          ) : (
                            <ChevronDown className="mr-2 h-4 w-4" />
                          )}
                          Hint
                        </Button>
                      </div>

                      {isExpanded && review && (
                        <div className="mt-4 rounded-xl bg-muted/40 p-4">
                          <p className="text-sm font-semibold">Match review</p>
                          <div className="mt-3 space-y-3">
                            {review.analysis.analyzed_papers.map((paper) => (
                              <div
                                key={paper.new_paper_title}
                                className="rounded-lg border border-border bg-card p-3"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <h4 className="font-medium">
                                    {paper.new_paper_title}
                                  </h4>
                                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                                    {paper.relevance_score}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  {paper.reasoning}
                                </p>

                                {paper.related_profile_papers &&
                                  paper.related_profile_papers.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Related profile papers
                                      </p>
                                      {paper.related_profile_papers.map(
                                        (item) => (
                                          <div
                                            key={`${paper.new_paper_title}-${item.title}`}
                                            className="rounded-md bg-background p-2"
                                          >
                                            <p className="text-sm font-medium">
                                              {item.title}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              {item.reasoning}
                                            </p>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">Invitations</h2>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
                Loading invitations...
              </div>
            ) : invitationRows.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No invitations found.
              </div>
            ) : (
              <AdminChairInvitationsTable invitations={invitationRows} />
            )}
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default ChairInvitationsPage;
