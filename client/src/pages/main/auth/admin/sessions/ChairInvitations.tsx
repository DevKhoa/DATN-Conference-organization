import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, MailPlus } from "lucide-react";
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
import { Route } from "@/routes/(app)/sessions/chair-invitations";
import {
  fetchSessionChairInvitations,
  useSessionsByConferenceQuery,
} from "@/features/sessions/services/queries";
import { SessionKeys } from "@/features/sessions/services/queries/keys";
import { useCreateChairInvitationMutation } from "@/features/sessions/services/mutations";
import { ChairInvitationsTable } from "@/features/sessions/components/chair-invitations-table";
import type { ChairInvitationTableItem } from "@/features/sessions/components/chair-invitations-columns";
import useAuth from "@/features/auth/hooks/useAuth";

const ChairInvitationsPage = () => {
  const navigate = useNavigate();
  const { conferenceId, sessionId } = Route.useSearch();
  const { session: authSession } = useAuth();

  const invitedBy = authSession?.user?.user_metadata?.user_id as
    | number
    | undefined;

  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    sessionId ? String(sessionId) : "",
  );
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: sessions = [], isLoading: isLoadingSessions } =
    useSessionsByConferenceQuery(conferenceId);

  const createInvitationMutation = useCreateChairInvitationMutation();

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
              session_id: inv.session_id,
              session_name: inv.session_name || res.session_name,
              email: inv.email,
              status: inv.status,
              created_at: inv.created_at,
              responded_at: inv.responded_at,
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
                  to: "/sessions",
                  search: { conferenceId, sessionId: undefined },
                })
              }
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Session Manager
            </Button>
          </div>

          <div className="mb-6 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Create Invitation</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_2fr_auto]">
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

              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
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

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">Invitations</h2>
              <Select
                value={selectedSessionId || "ALL"}
                onValueChange={(value) =>
                  setSelectedSessionId(value === "ALL" ? "" : value)
                }
              >
                <SelectTrigger className="w-full sm:w-65">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All sessions</SelectItem>
                  {sessions.map((s) => (
                    <SelectItem key={s.session_id} value={String(s.session_id)}>
                      {s.session_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <ChairInvitationsTable invitations={invitationRows} />
            )}
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default ChairInvitationsPage;
