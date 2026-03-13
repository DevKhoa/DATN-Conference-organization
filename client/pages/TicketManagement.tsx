import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import Button from "../components/ui/Button";
import { supabase } from "../lib/supabase";

// --- INTERFACES ---

interface TicketManagementProps {
  conferenceId: number;
  conferenceName?: string;
  userRoleId: number;
  onNavigateBack: () => void;
}

interface TicketConfig {
  ticket_id: number;
  ticket_name: string;
  currency: string;
  quantity_limit: number | null;
  sold_quantity: number;
  open_time: string;
  close_time: string;
  is_active: boolean;
  description: string | null;
  price: number | null;
  assigned_session_ids: number[];
}

interface SessionOption {
  session_id: number;
  session_name: string;
  start_time: string;
}

interface TicketFormData {
  ticket_name: string;
  currency: string;
  quantity_limit: string;
  open_time: string;
  close_time: string;
  is_active: boolean;
  description: string;
  price: string;
  session_ids: number[];
}

// --- HELPERS ---

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

const toLocalDatetime = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatPrice = (price: number | null) => {
  if (price === null || price === undefined) return "Free";
  return new Intl.NumberFormat("vi-VN").format(price) + " VND";
};

const formatShortDatetime = (iso: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// --- MAIN COMPONENT ---

const TicketManagement: React.FC<TicketManagementProps> = ({
  conferenceId,
  conferenceName,
  userRoleId,
  onNavigateBack,
}) => {
  const [tickets, setTickets] = useState<TicketConfig[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TicketFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Access guard
  if (userRoleId !== 1 && userRoleId !== 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Access Denied
          </h2>
          <p className="text-slate-500 mb-4">
            You don't have permission to manage tickets.
          </p>
          <Button onClick={onNavigateBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchData();
  }, [conferenceId]);

  // --- Data Fetching ---

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch all sessions for this conference
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .select("session_id, session_name, start_time")
        .eq("conf_id", conferenceId)
        .order("start_time", { ascending: true });

      if (sessionError) throw sessionError;
      setSessions(sessionData || []);

      const confSessionIds = (sessionData || []).map((s: any) => s.session_id);

      if (confSessionIds.length === 0) {
        setTickets([]);
        return;
      }

      // 2. Find ticket IDs linked to this conference's sessions
      const { data: tsData, error: tsError } = await supabase
        .from("ticket_session")
        .select("ticket_id")
        .in("session_id", confSessionIds);

      if (tsError) throw tsError;

      const ticketIds = [
        ...new Set((tsData || []).map((ts: any) => ts.ticket_id)),
      ];

      if (ticketIds.length === 0) {
        setTickets([]);
        return;
      }

      // 3. Fetch those ticket configs along with their session assignments
      const { data: ticketData, error: ticketError } = await supabase
        .from("ticket_configs")
        .select("*, ticket_session(session_id)")
        .in("ticket_id", ticketIds)
        .order("ticket_id", { ascending: true });

      if (ticketError) throw ticketError;

      setTickets(
        (ticketData || []).map((t: any) => ({
          ...t,
          assigned_session_ids: (t.ticket_session || []).map(
            (ts: any) => ts.session_id,
          ),
        })),
      );
    } catch (err: any) {
      setError(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  // --- Modal Handlers ---

  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
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
      open_time: toLocalDatetime(ticket.open_time),
      close_time: toLocalDatetime(ticket.close_time),
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

    setSaving(true);
    setFormError("");

    try {
      const payload = {
        ticket_name: form.ticket_name.trim(),
        currency: form.currency || "VND",
        quantity_limit: form.quantity_limit
          ? parseInt(form.quantity_limit)
          : null,
        open_time: new Date(form.open_time).toISOString(),
        close_time: new Date(form.close_time).toISOString(),
        is_active: form.is_active,
        description: form.description.trim() || null,
        price: form.price !== "" ? parseFloat(form.price) : null,
      };

      let ticketId: number;

      if (editingId !== null) {
        const { error } = await supabase
          .from("ticket_configs")
          .update(payload)
          .eq("ticket_id", editingId);
        if (error) throw error;
        ticketId = editingId;
      } else {
        const { data, error } = await supabase
          .from("ticket_configs")
          .insert(payload)
          .select("ticket_id")
          .single();
        if (error) throw error;
        ticketId = data.ticket_id;
      }

      // Sync ticket_session: delete old, insert new
      await supabase.from("ticket_session").delete().eq("ticket_id", ticketId);

      if (form.session_ids.length > 0) {
        const { error: tsError } = await supabase.from("ticket_session").insert(
          form.session_ids.map((sid) => ({
            ticket_id: ticketId,
            session_id: sid,
          })),
        );
        if (tsError) throw tsError;
      }

      await fetchData();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to save ticket.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ticketId: number) => {
    setDeletingId(ticketId);
    try {
      await supabase.from("ticket_session").delete().eq("ticket_id", ticketId);
      const { error } = await supabase
        .from("ticket_configs")
        .delete()
        .eq("ticket_id", ticketId);
      if (error) throw error;
      setTickets((prev) => prev.filter((t) => t.ticket_id !== ticketId));
    } catch (err: any) {
      setError(err.message || "Failed to delete ticket.");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
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

  // --- Render ---

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateBack}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Ticket Management
              </h1>
              {conferenceName && (
                <p className="text-sm text-slate-500 truncate max-w-xs">
                  {conferenceName}
                </p>
              )}
            </div>
          </div>
          <Button onClick={openCreateModal} icon={Plus}>
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
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
              <Ticket className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">
              No tickets yet
            </h3>
            <p className="text-slate-500 mb-6 text-sm">
              Create your first ticket to allow attendees to register.
            </p>
            <Button onClick={openCreateModal} icon={Plus}>
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
              const isDeleting = deletingId === ticket.ticket_id;
              const isConfirming = confirmDeleteId === ticket.ticket_id;

              return (
                <div
                  key={ticket.ticket_id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Ticket Info */}
                      <div className="flex-grow min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h3 className="text-lg font-bold text-slate-900">
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
                            <Tag className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                            <span className="font-bold text-slate-900">
                              {formatPrice(ticket.price)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {ticket.sold_quantity}
                              {ticket.quantity_limit !== null
                                ? ` / ${ticket.quantity_limit}`
                                : " sold"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-slate-600 col-span-2 sm:col-span-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {ticket.assigned_session_ids.length} session
                              {ticket.assigned_session_ids.length !== 1
                                ? "s"
                                : ""}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>
                            {formatShortDatetime(ticket.open_time)} —{" "}
                            {formatShortDatetime(ticket.close_time)}
                          </span>
                        </div>

                        {ticket.description && (
                          <p className="mt-3 text-sm text-slate-500 line-clamp-2">
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
                              className="px-3 py-1.5 text-sm font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => openEditModal(ticket)}
                              className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setConfirmDeleteId(ticket.ticket_id)
                              }
                              className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl animate-in zoom-in-95 duration-200 my-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-brand-600" />
                {editingId !== null ? "Edit Ticket" : "New Ticket"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
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
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Ticket Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.ticket_name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, ticket_name: e.target.value }))
                  }
                  placeholder="e.g. Early Bird, Regular, VIP"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                />
              </div>

              {/* Price + Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
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
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Currency
                  </label>
                  <select
                    value={form.currency}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, currency: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white transition"
                  >
                    <option value="VND">VND</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              {/* Quantity Limit */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Quantity Limit{" "}
                  <span className="text-slate-400 font-normal">
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
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                />
              </div>

              {/* Open Time + Close Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Open Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.open_time}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, open_time: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Close Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.close_time}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, close_time: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Active</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Make this ticket available for registration
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((p) => ({ ...p, is_active: !p.is_active }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.is_active ? "bg-brand-600" : "bg-slate-300"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Describe what's included with this ticket..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition resize-none"
                />
              </div>

              {/* Sessions Multi-select */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Included Sessions
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    ({form.session_ids.length} selected)
                  </span>
                </label>
                {sessions.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">
                    No sessions available for this conference.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto border border-slate-200 rounded-xl p-2">
                    {sessions.map((s) => (
                      <label
                        key={s.session_id}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={form.session_ids.includes(s.session_id)}
                          onChange={() => toggleSession(s.session_id)}
                          className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {s.session_name}
                          </p>
                          <p className="text-xs text-slate-400">
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
            <div className="p-6 border-t border-slate-100 flex gap-3">
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

export default TicketManagement;
