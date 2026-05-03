import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Loader2, Mail, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import useAuth from "@/features/auth/hooks/useAuth";
import {
  useAcceptChairInvitationMutation,
  useRejectChairInvitationMutation,
} from "@/features/sessions/services/mutations";
import { useChairInvitationQuery } from "@/features/sessions/services/queries";

type InvitationDetailPageProps = {
  token: string;
};

const InvitationDetailPage = ({ token }: InvitationDetailPageProps) => {
  const navigate = useNavigate();
  const { session: authSession } = useAuth();

  const invitedBy = authSession?.user?.user_metadata?.user_id as
    | number
    | undefined;
  const inviteeEmail = authSession?.user?.email || undefined;

  const {
    data: invitation,
    isLoading,
    isError,
    error,
  } = useChairInvitationQuery(token);
  const acceptMutation = useAcceptChairInvitationMutation();
  const rejectMutation = useRejectChairInvitationMutation();

  const handleAccept = async () => {
    if (!invitation) return;

    try {
      await acceptMutation.mutateAsync({
        token,
        userId: invitedBy,
        email: inviteeEmail,
      });
      toast.success("Invitation accepted successfully.");
    } catch (mutationError: any) {
      const message =
        mutationError?.response?.data?.detail ||
        mutationError?.message ||
        "Failed to accept the invitation.";
      toast.error(message);
    }
  };

  const handleReject = async () => {
    if (!invitation) return;

    try {
      await rejectMutation.mutateAsync({
        token,
        userId: invitedBy,
        email: inviteeEmail,
      });
      toast.success("Invitation rejected.");
    } catch (mutationError: any) {
      const message =
        mutationError?.response?.data?.detail ||
        mutationError?.message ||
        "Failed to reject the invitation.";
      toast.error(message);
    }
  };

  return (
    <DefaultLayout meta={{ title: "Chair Invitation" }}>
      <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Chair Invitation
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                Review and respond to the invitation.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Inspect the invitation details and choose to accept or reject
                the chair request.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate({ to: "/chair-invitations" })}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                Signed in as
              </div>
              <p className="mt-3 truncate text-lg font-semibold">
                {inviteeEmail || "Unknown user"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                User ID
              </div>
              <p className="mt-3 text-lg font-semibold">
                {invitedBy ? `#${invitedBy}` : "Unavailable"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Current status
              </div>
              <p className="mt-3 text-lg font-semibold">
                {invitation?.status || "Pending"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4" />
                Token
              </div>
              <p className="mt-3 truncate text-lg font-semibold">{token}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">
              <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
              Loading invitation...
            </div>
          ) : isError || !invitation ? (
            <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Invitation not found or unavailable."}
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">Invitation Details</h2>
                <div className="mt-4 grid gap-3 text-sm text-foreground sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Conference: </span>
                    {invitation.conf_name || invitation.conf_id}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Session: </span>
                    {invitation.session_name || invitation.session_id}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Invitee: </span>
                    {invitation.email}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status: </span>
                    {invitation.status}
                  </div>
                </div>

                {invitation.status === "PENDING" && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      onClick={handleAccept}
                      disabled={
                        acceptMutation.isPending || rejectMutation.isPending
                      }
                    >
                      {acceptMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Accept Invitation
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={
                        acceptMutation.isPending || rejectMutation.isPending
                      }
                    >
                      {rejectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Reject Invitation
                    </Button>
                  </div>
                )}
              </div>

              {invitation.status === "ACCEPTED" && (
                <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-emerald-800">
                  The invitation has been accepted. You can continue to your
                  agenda to view the assigned session.
                  <div className="mt-4">
                    <Button onClick={() => navigate({ to: "/agenda/me" })}>
                      Go to My Agenda
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DefaultLayout>
  );
};

export default InvitationDetailPage;
