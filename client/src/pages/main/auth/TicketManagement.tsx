import { useState } from "react";
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
};




const formatPrice = (price: number | null) => {
  if (price === null || price === undefined) return "Free";
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

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const loading = ticketsLoading || sessionsLoading;
  const error = ticketsError ? (ticketsError as Error).message.replace(/^\d+:\s*/, "") : "";

  // --- Modal Handlers ---

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
    });
    setFormError("");
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
    });

    setFormError("");
    setIsModalOpen(true);
  };

  // --- CRUD ---

  const handleSave = async () => {
    if (!form.ticket_name.trim()) {
      setFormError("Ticket name is required.");
      return;
    }
    if (!form.open_time) {
      setFormError("Open time is required.");
      return;
    }
    if (!form.close_time) {
      setFormError("Close time is required.");
      return;
    }
    if (new Date(form.open_time) >= new Date(form.close_time)) {
      setFormError("Close time must be after open time.");
      return;
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
      price: form.price !== "" ? parseFloat(form.price) : null,
      session_ids: form.session_ids,
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
        err instanceof Error ? err.message.replace(/^\d+:\s*/, "") : "Failed to save ticket.";
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
            No sessions found for this conference. Create sessions first before managing tickets.
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
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="font-bold text-foreground">
                              {formatPrice(ticket.price)}
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

              {/* Ticket Name */}
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
                  placeholder="e.g. Early Bird, Regular, VIP"
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
                />
              </div>

              {/* Price + Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, price: e.target.value }))
                    }
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
                  />
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
                    <option value="EUR">EUR</option>
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
                    onChange={(val) => setForm((p) => ({ ...p, open_time: val }))}
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

              {/* Sessions Multi-select */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Included Sessions
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({form.session_ids.length} selected)
                  </span>
                </label>
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No sessions available for this conference.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto border border-border rounded-xl p-2">
                    {sessions.map((s) => (
                      <label
                        key={s.session_id}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={form.session_ids.includes(s.session_id)}
                          onChange={() => toggleSession(s.session_id)}
                          className="w-4 h-4 text-primary rounded border-input focus:ring-ring cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {s.session_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatShortDatetime(s.start_time)}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
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
