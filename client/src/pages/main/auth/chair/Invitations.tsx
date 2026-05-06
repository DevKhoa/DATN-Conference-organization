import { useNavigate } from "@tanstack/react-router";
import { Loader2, MailOpen, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import useAuth from "@/features/auth/hooks/useAuth";
import { ChairInvitationsTable } from "@/features/sessions/components/chair-invitations-table";
import { useMyChairInvitationsQuery } from "@/features/sessions/services/queries";

const InvitationsManagerPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  const inviteeEmail = session?.user?.email?.trim().toLowerCase();
  const {
    data: invitations = [],
    isLoading,
    isError,
    error,
  } = useMyChairInvitationsQuery(inviteeEmail);

  return (
    <DefaultLayout meta={{ title: "Chair Invitations" }}>
      <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-3xl border border-border bg-card p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border border-border bg-primary/10 p-3 text-primary">
                <MailOpen className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Chair Invitation Manager
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight">
                  Track all of your chair invitations.
                </h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  This page tracks your past and current invitations so you can
                  quickly review statuses and reopen invitation links when
                  needed.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/30 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Invitation flow
              </div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• New requests appear here with status PENDING.</li>
                <li>• Open link to review and respond to each invitation.</li>
                <li>• Accepted/rejected/expired requests remain in history.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Invitation History</h2>

            {isLoading ? (
              <div className="rounded-2xl border border-border bg-card py-14 text-center text-muted-foreground">
                <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
                Loading invitation history...
              </div>
            ) : isError ? (
              <div className="rounded-2xl border border-border bg-card py-14 text-center text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "Unable to load invitation history."}
              </div>
            ) : invitations.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card py-14 text-center text-muted-foreground">
                No invitations found for your account.
              </div>
            ) : (
              <ChairInvitationsTable invitations={invitations} />
            )}
          </section>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default InvitationsManagerPage;
