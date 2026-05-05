import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  Ticket,
  Calendar,
  Users,
  X,
  Save,
  Clock,
  Tag,
  Info,
  Video,
} from "lucide-react";

import { useRouter } from "@tanstack/react-router";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import { Button } from "@/components/ui/button";
import {
  useTicketsByConferenceQuery,
  useSessionsForTicketsQuery,
} from "@/features/tickets/services/queries";
import {
  useCreateTicketMutation,
  useUpdateTicketMutation,
  useDeleteTicketMutation,
} from "@/features/tickets/services/mutations";
import type { TicketConfig, TicketFormData } from "@/features/tickets/types";
import { Route } from "@/routes/(app)/tickets";
import { SimpleDateTimePicker } from "@/components/ui/date-time-picker";
import { useConferenceDetailQuery } from "@/features/conferences/services/queries";

dayjs.extend(customParseFormat);

const EMPTY_FORM: TicketFormData = {
  ticket_name: "",
  currency: "VND",
  quantity_limit: "",
  open_time: "",
  close_time: "",
  is_active: true,
  description: "",
  price: "",
  session_ids: [],
  ticket_type: "Standard",
};

const formatPrice = (price: number | null, currency = "VND") => {
  if (price === null || price === undefined) return "Free";
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  }
  return new Intl.NumberFormat("vi-VN").format(price) + " VND";
};

const formatShortDatetime = (iso: string) => {
  if (!iso) return "—";
  return dayjs(iso).format("MMM D, HH:mm");
};

// --- MAIN COMPONENT ---

const TicketManagementPage = () => {
  const router = useRouter();
  const { conferenceId } = Route.useSearch();

  const { data: conferenceData } = useConferenceDetailQuery(conferenceId);
  const conferenceType = conferenceData?.conference?.format_type || "hybrid";

  // Queries
  const {
    data: tickets = [],
    isLoading: ticketsLoading,
    error: ticketsError,
  } = useTicketsByConferenceQuery(conferenceId);
  const { data: sessions = [], isLoading: sessionsLoading } =
    useSessionsForTicketsQuery(conferenceId);

  // Mutations
  const createTicketMutation = useCreateTicketMutation();
  const updateTicketMutation = useUpdateTicketMutation();
  const deleteTicketMutation = useDeleteTicketMutation();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TicketFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const [ticketScope, setTicketScope] = useState<"FULL" | "SINGLE">("FULL");
  const [selectedDate, setSelectedDate] = useState<string>("");

  const MinPriceThreshold = 50000;

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, typeof sessions>();
    sessions.forEach((s) => {
      const date = new Date(s.start_time).toISOString().split("T")[0];
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(s);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [sessions]);

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const loading = ticketsLoading || sessionsLoading;
  const error = ticketsError
    ? (ticketsError as Error).message.replace(/^\d+:\s*/, "")
    : "";

  // --- Modal Handlers ---

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
    });
    setFormError("");
    setTicketScope("FULL");
    setSelectedDate("");
    setIsModalOpen(true);
  };

  const openEditModal = (ticket: TicketConfig) => {
    setEditingId(ticket.ticket_id);
    setForm({
      ticket_name: ticket.ticket_name,
      currency: ticket.currency || "VND",
      quantity_limit:
        ticket.quantity_limit !== null ? String(ticket.quantity_limit) : "",
      open_time: ticket.open_time
        ? dayjs(ticket.open_time).format("DD/MM/YYYY hh:mm A")
        : "",
      close_time: ticket.close_time
        ? dayjs(ticket.close_time).format("DD/MM/YYYY hh:mm A")
        : "",

      is_active: ticket.is_active,
      description: ticket.description || "",
      price: ticket.price !== null ? String(ticket.price) : "",
      session_ids: ticket.assigned_session_ids,
      ticket_type: ticket.ticket_type || "Standard",
    });

    setFormError("");

    // Deduce scope
    let scope: "FULL" | "SINGLE" = "FULL";
    let selDate = "";

    const assignedDates = new Set<string>();
    ticket.assigned_session_ids.forEach((sid) => {
      const session = sessions.find((s) => s.session_id === sid);
      if (session) {
        const date = new Date(session.start_time).toISOString().split("T")[0];
        assignedDates.add(date);
      }
    });

    if (
      ticket.assigned_session_ids.length === sessions.length &&
      sessions.length > 0
    ) {
      scope = "FULL";
    } else if (assignedDates.size === 1) {
      scope = "SINGLE";
      selDate = Array.from(assignedDates)[0];
    } else {
      scope = "FULL";
    }

    setTicketScope(scope);
    setSelectedDate(selDate);
    setIsModalOpen(true);
  };

  // --- CRUD ---

  const handleSave = async () => {
    if (!form.ticket_name.trim()) {
      setFormError("Ticket name is required.");
      return;
    }
    if (!form.open_time || !form.close_time) {
      setFormError("Open time and Close time are required.");
      return;
    }

    let finalSessionIds: number[] = [];
    if (ticketScope === "FULL") {
      finalSessionIds = sessions.map((s) => s.session_id);
      if (finalSessionIds.length === 0) {
        setFormError(
          "Cannot create Full Conference ticket because there are no sessions.",
        );
        return;
      }
    } else {
      if (!selectedDate) {
        setFormError("Please select a date for the single day ticket.");
        return;
      }
      finalSessionIds =
        sessionsByDate
          .find(([d]) => d === selectedDate)?.[1]
          .map((s) => s.session_id) || [];
    }

    const newOpen = dayjs(form.open_time, "DD/MM/YYYY hh:mm A").valueOf();
    const newClose = dayjs(form.close_time, "DD/MM/YYYY hh:mm A").valueOf();
    const newPrice = form.price !== "" ? parseFloat(form.price) : 0;

    if (newOpen >= newClose) {
      setFormError("Close time must be after open time.");
      return;
    }

    const today = dayjs().startOf('day').valueOf();
    const openDate = dayjs(form.open_time, "DD/MM/YYYY hh:mm A").startOf('day').valueOf();
    if (openDate < today && editingId === null) {
      setFormError("Sale start time must be from today onwards.");
      return;
    }

    // Filter existing tickets belonging to the same Ticket Class (case-insensitive)
    const currentTicketTypeLower = form.ticket_type.trim().toLowerCase();
    const sameClassTickets = tickets.filter(
      (t) =>
        t.ticket_id !== editingId &&
        (t.ticket_type || "Standard").toLowerCase() === currentTicketTypeLower,
    );

    // Overlap and escalation inside SAME ticket class and same scope
    for (const t of sameClassTickets) {
      const isSameCoverage =
        t.assigned_session_ids.length === finalSessionIds.length &&
        t.assigned_session_ids.every((id) => finalSessionIds.includes(id));

      if (isSameCoverage) {
        const eOpen = new Date(t.open_time).getTime();
        const eClose = new Date(t.close_time).getTime();
        const ePrice = t.price || 0;

        if (newOpen < eClose && newClose > eOpen) {
          setFormError(
            `Time Overlap Error: The sale period (${formatShortDatetime(form.open_time)} - ${formatShortDatetime(form.close_time)}) overlaps with existing ticket '${t.ticket_name}' (${formatShortDatetime(t.open_time)} - ${formatShortDatetime(t.close_time)}). You cannot have overlapping sale times for the SAME ticket class (${form.ticket_type}) on the exact same days.`,
          );
          return;
        }
        if (newOpen < eOpen && newPrice >= ePrice) {
          setFormError(
            `Pricing Escalation Error: This ticket opens on ${formatShortDatetime(form.open_time)}, which is BEFORE the existing '${t.ticket_name}' ticket (opens ${formatShortDatetime(t.open_time)}). Therefore, its price (${formatPrice(newPrice, form.currency)}) must be STRICTLY CHEAPER than ${formatPrice(ePrice, form.currency)}.`,
          );
          return;
        }
        if (newOpen > eOpen && newPrice <= ePrice) {
          setFormError(
            `Pricing Escalation Error: This ticket opens on ${formatShortDatetime(form.open_time)}, which is AFTER the existing '${t.ticket_name}' ticket (opens ${formatShortDatetime(t.open_time)}). Therefore, its price (${formatPrice(newPrice, form.currency)}) must be MORE EXPENSIVE than ${formatPrice(ePrice, form.currency)}.`,
          );
          return;
        }
      }
    }

    // Total vs Single sum validation (ONLY for the same ticket class)
    const fullTickets = sameClassTickets.filter(
      (t) =>
        t.assigned_session_ids.length > 0 &&
        t.assigned_session_ids.length === sessions.length,
    );

    // Calculate the cheapest Full Conference Ticket price
    let minFullTicketPriceVal = Infinity;
    let minFullTicketName = "";
    for (const t of fullTickets) {
      if ((t.price || 0) < minFullTicketPriceVal) {
        minFullTicketPriceVal = t.price || 0;
        minFullTicketName = t.ticket_name;
      }
    }

    let minFullPrice = minFullTicketPriceVal;
    if (ticketScope === "FULL") {
      minFullPrice = Math.min(minFullPrice, newPrice);
    }

    let sumSingle = 0;
    let allDatesCovered = true;
    const singleDayContext: string[] = [];

    for (const [date, s] of sessionsByDate) {
      const dateSids = s.map((x) => x.session_id);
      const singleTicketsForDate = sameClassTickets.filter(
        (t) =>
          t.assigned_session_ids.length === dateSids.length &&
          t.assigned_session_ids.every((id) => dateSids.includes(id)),
      );

      let minForDate = Infinity;
      if (singleTicketsForDate.length > 0) {
        minForDate = singleTicketsForDate.reduce(
          (m, t) => Math.min(m, t.price || 0),
          Infinity,
        );
      }
      if (ticketScope === "SINGLE" && date === selectedDate) {
        minForDate = Math.min(minForDate, newPrice);
      }

      if (minForDate === Infinity) {
        allDatesCovered = false;
      } else {
        sumSingle += minForDate;
        singleDayContext.push(
          `${date}: ${formatPrice(minForDate, form.currency)}`,
        );
      }
    }

    if (minFullPrice !== Infinity && allDatesCovered) {
      if (minFullPrice >= sumSingle) {
        const details = singleDayContext.join(" + ");
        if (ticketScope === "SINGLE") {
          const comboRef = minFullTicketName
            ? `'${minFullTicketName}'`
            : "the combo";
          setFormError(
            `Price Rule Violation: You are setting the single ticket for ${selectedDate} to ${formatPrice(newPrice, form.currency)}. The Full Conference combo ${comboRef} (Class: ${form.ticket_type}) is priced at ${formatPrice(minFullPrice, form.currency)}. The REQUIRED total sum of all single-day tickets of this class (${details} = ${formatPrice(sumSingle, form.currency)}) MUST BE STRICTLY GREATER than the Full Combo price (${formatPrice(minFullPrice, form.currency)}). Please increase this ticket's price.`,
          );
        } else {
          setFormError(
            `Price Rule Violation: You are setting the Full Conference ticket to ${formatPrice(newPrice, form.currency)}. However, the sum of configured cheapest single-day tickets (Class: ${form.ticket_type}) is ${formatPrice(sumSingle, form.currency)} (Breakdown: ${details}). The Full Conference ticket MUST BE CHEAPER than the sum of single-day options in the same class.`,
          );
        }
        return;
      }
    }

    setFormError("");

    const payload = {
      ticket_name: form.ticket_name.trim(),
      currency: form.currency || "VND",
      quantity_limit: form.quantity_limit
        ? parseInt(form.quantity_limit)
        : null,
      open_time: dayjs(form.open_time, "DD/MM/YYYY hh:mm A").toISOString(),
      close_time: dayjs(form.close_time, "DD/MM/YYYY hh:mm A").toISOString(),
      is_active: form.is_active,

      description: form.description.trim() || null,
      price: newPrice,
      session_ids: finalSessionIds,
      ticket_type: form.ticket_type.trim(),
    };

    try {
      if (editingId !== null) {
        await updateTicketMutation.mutateAsync({
          ...payload,
          ticket_id: editingId,
        });
      } else {
        await createTicketMutation.mutateAsync(payload);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message.replace(/^\d+:\s*/, "")
          : "Failed to save ticket.";
      setFormError(errorMessage);
    }
  };

  const handleDelete = async (ticketId: number) => {
    try {
      await deleteTicketMutation.mutateAsync({ ticket_id: ticketId });
      setConfirmDeleteId(null);
    } catch (err: unknown) {
      console.error("Failed to delete ticket:", err);
    }
  };

  const toggleSession = (sid: number) => {
    setForm((prev) => ({
      ...prev,
      session_ids: prev.session_ids.includes(sid)
        ? prev.session_ids.filter((id) => id !== sid)
        : [...prev.session_ids, sid],
    }));
  };

  const saving =
    createTicketMutation.isPending || updateTicketMutation.isPending;

  // --- Render ---

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.history.back()}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Ticket Management
              </h1>
            </div>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4" />
            New Ticket
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* No sessions warning */}
        {sessions.length === 0 && (
          <div className="flex items-center gap-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl px-4 py-3 text-sm">
            <Info className="w-4 h-4 shrink-0" />
            No sessions found for this conference. Create sessions first before
            managing tickets.
          </div>
        )}

        {/* Empty state */}
        {tickets.length === 0 ? (
          <div className="bg-card rounded-2xl border-2 border-dashed border-border p-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Ticket className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              No tickets yet
            </h3>
            <p className="text-muted-foreground mb-6 text-sm">
              Create your first ticket to allow attendees to register.
            </p>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4" />
              Create First Ticket
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket) => {
              const now = new Date();
              const isOpen =
                ticket.is_active &&
                new Date(ticket.open_time) <= now &&
                new Date(ticket.close_time) >= now;
              const isSoldOut =
                ticket.quantity_limit !== null &&
                ticket.sold_quantity >= ticket.quantity_limit;
              const isDeleting = deleteTicketMutation.isPending;
              const isConfirming = confirmDeleteId === ticket.ticket_id;

              return (
                <div
                  key={ticket.ticket_id}
                  className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Ticket Info */}
                      <div className="grow min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h3 className="text-lg font-bold text-foreground">
                            {ticket.ticket_name}
                          </h3>
                          {isSoldOut ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
                              Sold Out
                            </span>
                          ) : isOpen ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
                              Open
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                              {ticket.is_active ? "Scheduled" : "Inactive"}
                            </span>
                          )}
                          {ticket.ticket_type && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold border border-primary/20 text-primary capitalize bg-primary/5">
                              {ticket.ticket_type}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="font-bold text-foreground">
                              {formatPrice(
                                ticket.price,
                                ticket.currency ?? "VND",
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>
                              {ticket.sold_quantity}
                              {ticket.quantity_limit !== null
                                ? ` / ${ticket.quantity_limit}`
                                : " sold"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground col-span-2 sm:col-span-1">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>
                              {ticket.assigned_session_ids.length} session
                              {ticket.assigned_session_ids.length !== 1
                                ? "s"
                                : ""}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>
                            {formatShortDatetime(ticket.open_time)} —{" "}
                            {formatShortDatetime(ticket.close_time)}
                          </span>
                        </div>

                        {ticket.description && (
                          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                            {ticket.description}
                          </p>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isConfirming ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-red-600 font-medium whitespace-nowrap">
                              Delete?
                            </span>
                            <button
                              onClick={() => handleDelete(ticket.ticket_id)}
                              disabled={isDeleting}
                              className="px-3 py-1.5 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "Yes"
                              )}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1.5 text-sm font-medium bg-muted text-muted-foreground rounded-lg hover:bg-accent transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => openEditModal(ticket)}
                              className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setConfirmDeleteId(ticket.ticket_id)
                              }
                              className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-start justify-center p-4 py-8 overflow-y-auto">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-xl animate-in zoom-in-95 duration-200 my-auto border border-border">
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Ticket className="w-5 h-5 text-primary" />
                {editingId !== null ? "Edit Ticket" : "New Ticket"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              {/* Ticket Name & Class */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Ticket Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.ticket_name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, ticket_name: e.target.value }))
                    }
                    placeholder="e.g. Early Bird, Regular"
                    className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Ticket Class <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.ticket_type}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, ticket_type: e.target.value }))
                    }
                    placeholder="e.g. VIP, Standard"
                    className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition capitalize"
                  />
                </div>
              </div>

              {/* Price + Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Price
                  </label>
                  <input
                    type="text"
                    value={
                      form.currency === "VND" && form.price !== ""
                        ? new Intl.NumberFormat("vi-VN").format(
                            Number(form.price),
                          )
                        : form.price
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (form.currency === "VND") {
                        setForm((p) => ({
                          ...p,
                          price: val.replace(/\D/g, ""),
                        }));
                      } else {
                        setForm((p) => ({
                          ...p,
                          price: val.replace(/[^0-9.]/g, ""),
                        }));
                      }
                    }}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
                  />
                  {form.currency === "VND" &&
                    form.price !== "" &&
                    Number(form.price) > 0 &&
                    Number(form.price) < MinPriceThreshold && (
                      <p className="text-amber-600 text-[13px] mt-2 flex items-start gap-1.5 font-medium animate-in slide-in-from-top-1">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Warning: Ticket price is too low.
                      </p>
                    )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Currency
                  </label>
                  <select
                    value={form.currency}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, currency: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
                  >
                    <option value="VND">VND</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              {/* Quantity Limit */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Quantity Limit{" "}
                  <span className="text-muted-foreground font-normal">
                    (leave empty for unlimited)
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.quantity_limit}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, quantity_limit: e.target.value }))
                  }
                  placeholder="Unlimited"
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
                />
              </div>

              {/* Open Time + Close Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Open Time <span className="text-red-500">*</span>
                  </label>
                  <SimpleDateTimePicker
                    value={form.open_time}
                    onChange={(val) =>
                      setForm((p) => ({ ...p, open_time: val }))
                    }
                    placeholder="Select open time"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Close Time <span className="text-red-500">*</span>
                  </label>
                  <SimpleDateTimePicker
                    value={form.close_time}
                    onChange={(val) =>
                      setForm((p) => ({ ...p, close_time: val }))
                    }
                    placeholder="Select close time"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl border border-border">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Active
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Make this ticket available for registration
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((p) => ({ ...p, is_active: !p.is_active }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.is_active ? "bg-primary" : "bg-muted-foreground/40"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Describe what's included with this ticket..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition resize-none"
                />
              </div>

              {/* Scope Selection */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Ticket Coverage <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="FULL"
                      checked={ticketScope === "FULL"}
                      onChange={() => setTicketScope("FULL")}
                      className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                    />
                    <span className="text-sm font-medium">
                      Full Conference (All Days)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="SINGLE"
                      checked={ticketScope === "SINGLE"}
                      onChange={() => setTicketScope("SINGLE")}
                      className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                    />
                    <span className="text-sm font-medium">Single Day</span>
                  </label>
                </div>
              </div>

              {ticketScope === "SINGLE" && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Select Day <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                  >
                    <option value="">-- Choose Date --</option>
                    {sessionsByDate.map(([date, sList]) => (
                      <option key={date} value={date}>
                        {date} ({sList.length} sessions)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-border flex gap-3">
              <Button
                onClick={() => setIsModalOpen(false)}
                variant="outline"
                className="flex-1 justify-center"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 justify-center"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {editingId !== null ? "Save Changes" : "Create Ticket"}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketManagementPage;
