import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  CreditCard,
  Loader2,
  Ticket,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useAuth from "@/features/auth/hooks/useAuth";
import { useConferenceTicketsQuery } from "@/features/conferences/services/queries";
import { useCreateRegistrationMutation } from "@/features/registrations/services/mutations";
import { request } from "@/lib/axios";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type ConferenceRegistrationPanelProps = {
  conferenceId: number;
  conferenceName: string;
  conferenceStartDate: string | null;
};

const formatTicketPrice = (price: number | null, currency = "VND") => {
  if (!price) return "Free";
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};

const formatTimeOnly = (isoString: string | null) => {
  if (!isoString) return "N/A";

  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const ConferenceRegistrationPanel = ({
  conferenceId,
  conferenceName,
  conferenceStartDate,
}: ConferenceRegistrationPanelProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  const createRegistrationMutation = useCreateRegistrationMutation();

  const userEmail = authSession?.user?.email ?? "";
  const currentUserId = authSession?.user?.user_metadata?.["user_id"] as
    | number
    | undefined;

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerStep, setRegisterStep] = useState<"tickets" | "checkout">(
    "tickets",
  );
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [registerError, setRegisterError] = useState("");

  const ticketStorageKey = useMemo(
    () => `conference-registration-ticket-${conferenceId}`,
    [conferenceId],
  );

  const { data: hasRegistration = false } = useQuery({
    queryKey: [
      "conference-detail-user-registration",
      conferenceId,
      currentUserId,
    ],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select(
          `registration_id, ticket_configs!inner ( ticket_session!inner ( sessions!inner ( conf_id ) ) ), transactions!inner ( status )`,
        )
        .eq("user_id", currentUserId!)
        .eq("ticket_configs.ticket_session.sessions.conf_id", conferenceId)
        .eq("transactions.status", "COMPLETED");

      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
    enabled: !!currentUserId && !!conferenceId,
  });

  const { data: conferenceTickets = [], isLoading: ticketsLoading } =
    useConferenceTicketsQuery(conferenceId, isRegisterModalOpen);

  const selectedTicket = conferenceTickets.find(
    (ticket) => ticket.ticket_id === selectedTicketId,
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const orderCode = params.get("orderCode");
    const cancel = params.get("cancel");

    const handleSuccess = async () => {
      toast.success("Payment successful", {
        description: "Your registration is confirmed. Please check your email.",
      });
      localStorage.removeItem(ticketStorageKey);
      
      // Invalidate queries to update Agenda real-time
      queryClient.invalidateQueries({ queryKey: ["conference-detail-user-registration"] });
      queryClient.invalidateQueries({ queryKey: ["sessions/myAgenda"] });

      // Fallback: trigger QR email in case webhook didn't reach server
      try {
        await request.post(`/payments/payos/complete-registration?order_code=${orderCode}`);
      } catch (err) {
        // Silently ignore — webhook may have already handled it
      }

      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
    };

    if (status === "PAID" && cancel !== "true" && orderCode) {
      handleSuccess();
    } else if (cancel === "true") {
      toast.error("Payment canceled", {
        description: "Your registration was not completed.",
      });

      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
    }
  }, [ticketStorageKey]);

  const handleOpenRegisterModal = () => {
    setIsRegisterModalOpen(true);
    setRegisterStep("tickets");
    setSelectedTicketId(null);
    setRegisterError("");
  };

  const handleProceedToCheckout = async () => {
    if (!selectedTicketId) return;

    setRegisterError("");

    try {
      localStorage.setItem(ticketStorageKey, String(selectedTicketId));

      const result = await createRegistrationMutation.mutateAsync({
        ticketId: selectedTicketId,
        returnUrl: window.location.href,
      });

      // Free ticket — no PayOS redirect needed
      if (result.provider === "FREE") {
        localStorage.removeItem(ticketStorageKey);
        
        // Invalidate queries to update Agenda real-time
        queryClient.invalidateQueries({ queryKey: ["conference-detail-user-registration"] });
        queryClient.invalidateQueries({ queryKey: ["sessions/myAgenda"] });
        
        setIsRegisterModalOpen(false);
        toast.success("Registration confirmed!", {
          description:
            "You are now registered. Your QR check-in code has been sent to your email.",
        });
        return;
      }

      // Paid ticket — redirect to PayOS checkout
      window.location.href = result.checkout_url;
    } catch (err) {
      localStorage.removeItem(ticketStorageKey);
      // Extract FastAPI `detail` message if available, otherwise fall back to generic message
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = (err as any)?.response?.data?.detail;
      setRegisterError(
        typeof detail === "string"
          ? detail
          : (err as Error).message || "An error occurred.",
      );
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
        <h3 className="mb-2 text-xl font-bold">Registration Open</h3>

        {hasRegistration && (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle className="h-3.5 w-3.5" />
            You already have a ticket
          </div>
        )}

        <p className="mb-6 text-sm text-muted-foreground">
          {hasRegistration
            ? "You can still register for additional tickets below."
            : `Secure your spot before ${conferenceStartDate ? new Date(conferenceStartDate).toLocaleDateString() : "the event starts"}.`}
        </p>

        <Button
          onClick={handleOpenRegisterModal}
          className="w-full justify-center"
        >
          Register Now
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>

        {hasRegistration && (
          <button
            onClick={() => navigate({ to: "/agenda/me" })}
            className="mt-3 w-full text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5"
          >
            <Calendar className="h-3.5 w-3.5" />
            View My Agenda
          </button>
        )}
      </div>

      <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
        <DialogContent className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-xl [&>button]:hidden">
          <DialogHeader className="shrink-0 border-b border-border p-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Ticket className="h-5 w-5 text-primary" />
              {registerStep === "tickets"
                ? "Choose Your Ticket"
                : "Confirm & Pay"}
            </DialogTitle>
          </DialogHeader>

          <div className="grow overflow-y-auto p-6">
            {!userEmail ? (
              <div className="py-10 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-400" />
                <p className="mb-1 text-lg font-bold text-foreground">
                  Login Required
                </p>
                <p className="text-sm text-muted-foreground">
                  Please log in to register for {conferenceName}.
                </p>
              </div>
            ) : ticketsLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Loading available tickets...
                </p>
              </div>
            ) : registerStep === "tickets" ? (
              <>
                {conferenceTickets.length === 0 ? (
                  <div className="py-10 text-center">
                    <Ticket className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="mb-1 font-semibold text-foreground">
                      No tickets available
                    </p>
                    <p className="text-sm text-muted-foreground">
                      There are no active tickets for this conference yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="mb-2 text-sm text-muted-foreground">
                      Select the ticket you would like to purchase.
                    </p>

                    {conferenceTickets.map((ticket) => {
                      const soldOut =
                        ticket.quantity_limit !== null &&
                        (ticket.sold_quantity || 0) >= ticket.quantity_limit;
                      const isSelected = selectedTicketId === ticket.ticket_id;
                      const remaining =
                        ticket.quantity_limit !== null
                          ? ticket.quantity_limit - (ticket.sold_quantity || 0)
                          : null;

                      return (
                        <div
                          key={ticket.ticket_id}
                          onClick={() =>
                            !soldOut && setSelectedTicketId(ticket.ticket_id)
                          }
                          className={`rounded-xl border-2 p-4 transition-all ${soldOut
                              ? "cursor-not-allowed border-border bg-muted/40 opacity-60"
                              : isSelected
                                ? "cursor-pointer border-primary bg-primary/10 shadow-md"
                                : "cursor-pointer border-border hover:border-primary/30 hover:bg-accent"
                            }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 grow items-start gap-3">
                              <div
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${isSelected
                                    ? "border-primary bg-primary"
                                    : "border-border"
                                  }`}
                              >
                                {isSelected && (
                                  <CheckCircle className="h-3 w-3 text-primary-foreground" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="font-bold text-foreground">
                                  {ticket.ticket_name}
                                </p>
                                {ticket.description && (
                                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                                    {ticket.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-lg font-extrabold text-primary">
                                {formatTicketPrice(
                                  ticket.price,
                                  ticket.currency ?? "VND",
                                )}
                              </p>
                              {soldOut ? (
                                <span className="text-xs font-semibold text-destructive">
                                  Sold Out
                                </span>
                              ) : remaining !== null ? (
                                <span className="text-xs text-muted-foreground">
                                  {remaining} left
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {ticket.sessions.length > 0 && (
                            <div className="mt-3 border-t border-border pt-3">
                              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                Included Sessions
                              </p>

                              <div className="space-y-1.5">
                                {ticket.sessions.map((session) => (
                                  <div
                                    key={session.session_id}
                                    className="flex items-center gap-2 text-xs text-muted-foreground"
                                  >
                                    <Clock className="h-3 w-3 shrink-0 text-primary/70" />
                                    <span className="truncate font-medium">
                                      {session.session_name}
                                    </span>
                                    <span className="text-muted-foreground">
                                      .
                                    </span>
                                    <span className="whitespace-nowrap text-muted-foreground">
                                      {formatTimeOnly(session.start_time)}
                                    </span>
                                    {session.room_location && (
                                      <>
                                        <span className="text-muted-foreground">
                                          .
                                        </span>
                                        <span className="truncate text-muted-foreground">
                                          {session.room_location}
                                        </span>
                                      </>
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
                )}
              </>
            ) : (
              <>
                {selectedTicket ? (
                  <div className="space-y-5">
                    <div className="rounded-xl border border-border bg-muted/40 p-4">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Order Summary
                      </p>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-foreground">
                            {selectedTicket.ticket_name}
                          </p>
                          {selectedTicket.description && (
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {selectedTicket.description}
                            </p>
                          )}
                        </div>
                        <p className="ml-4 text-xl font-extrabold text-primary">
                          {formatTicketPrice(
                            selectedTicket.price,
                            selectedTicket.currency ?? "VND",
                          )}
                        </p>
                      </div>

                      {selectedTicket.sessions.length > 0 && (
                        <div className="mt-3 space-y-1 border-t border-border pt-3">
                          {selectedTicket.sessions.map((session) => (
                            <div
                              key={session.session_id}
                              className="flex items-center gap-2 text-xs text-muted-foreground"
                            >
                              <Calendar className="h-3 w-3 shrink-0 text-primary/70" />
                              <span>{session.session_name}</span>
                              <span className="text-muted-foreground">.</span>
                              <span>{formatTimeOnly(session.start_time)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedTicket && (selectedTicket.price ?? 0) <= 0 ? (
                      <div className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">
                            Free Registration
                          </p>
                          <p className="text-xs text-muted-foreground">
                            No payment required. Your QR code will be sent by email.
                          </p>
                        </div>
                      </div>
                    ) : (

                      <div className="flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/10 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
                          <CreditCard className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">
                            Pay via PayOS
                          </p>
                          <p className="text-xs text-muted-foreground">
                            You will be redirected to PayOS secure checkout.
                          </p>
                        </div>
                      </div>
                    )}

                    <p className="text-center text-xs text-muted-foreground">
                      A confirmation email with your QR code will be sent to{" "}
                      <span className="font-medium text-foreground">
                        {userEmail}
                      </span>
                      .
                    </p>
                  </div>
                ) : null}
              </>
            )}

            {registerError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {registerError}
              </div>
            )}
          </div>

          <div className="flex shrink-0 gap-3 border-t border-border p-5">
            {!userEmail ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="flex-1 justify-center"
                >
                  Close
                </Button>
                <Button
                  onClick={() => navigate({ to: "/login" })}
                  className="flex-1 justify-center"
                >
                  Go to Login
                </Button>
              </>
            ) : registerStep === "checkout" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setRegisterStep("tickets")}
                  className="flex-1 justify-center"
                  disabled={createRegistrationMutation.isPending}
                >
                  Back
                </Button>
                <Button
                  onClick={handleProceedToCheckout}
                  className="flex-1 justify-center"
                  disabled={createRegistrationMutation.isPending}
                >
                  {createRegistrationMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : selectedTicket && (selectedTicket.price ?? 0) <= 0 ? (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
                  )}
                  {selectedTicket && (selectedTicket.price ?? 0) <= 0
                    ? "Confirm Registration"
                    : "Pay with PayOS"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="flex-1 justify-center"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setRegisterStep("checkout")}
                  className="flex-1 justify-center"
                  disabled={!selectedTicketId || conferenceTickets.length === 0}
                >
                  Continue
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
