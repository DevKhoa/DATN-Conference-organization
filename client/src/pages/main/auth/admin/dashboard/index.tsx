import { AdminLayout } from "@/layouts/AdminLayout";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Shield,
  Users,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  X,
  UserCircle,
  Building2,
  Mail,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const BASE_API_URL = (
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8080"
).replace(/\/$/, "");

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_ROLES = [
  { id: 1, name: "ADMIN", label: "Admin", color: "bg-rose-100 text-rose-700 border-rose-200" },
  { id: 2, name: "SECRETARIAT", label: "Secretariat", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: 3, name: "AUTHOR", label: "Author", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: 4, name: "REVIEWER", label: "Reviewer", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: 5, name: "ATTENDEE", label: "Attendee", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { id: 6, name: "CHAIR", label: "Chair", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
] as const;

const ATTENDEE_ROLE_ID = 5;
const PAGE_SIZE = 15;

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRole {
  role_id: number;
  roles: { role_name: string } | null;
}

interface UserRecord {
  user_id: number;
  id: string; // UUID from auth.users
  full_name: string | null;
  email: string | null;
  organization: string | null;
  avatar_url: string | null;
  created_at: string | null;
  user_roles: UserRole[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getRoleMeta = (roleId: number) =>
  ALL_ROLES.find((r) => r.id === roleId);

const getInitials = (name: string | null) => {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

// ─── Role Badge ───────────────────────────────────────────────────────────────

const RoleBadge = ({ roleId }: { roleId: number }) => {
  const meta = getRoleMeta(roleId);
  if (!meta) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${meta.color}`}
    >
      {meta.label}
    </span>
  );
};

// ─── Role Confirmation Modal ──────────────────────────────────────────────────

interface ConfirmModalProps {
  user: UserRecord;
  newRoleIds: number[];
  isAttendeeMigration: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

const ConfirmModal = ({
  user,
  newRoleIds,
  isAttendeeMigration,
  onConfirm,
  onCancel,
  isSaving,
}: ConfirmModalProps) => {
  const oldRoleIds = user.user_roles.map((ur) => ur.role_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Panel */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-background rounded-2xl border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-3 mb-5">
            <div
              className={`p-2 rounded-xl ${isAttendeeMigration ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"}`}
            >
              {isAttendeeMigration ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base leading-tight">
                Confirm Role Update
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {user.full_name || user.email}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="ml-auto p-1 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Change summary */}
          <div className="bg-muted/50 rounded-xl p-4 mb-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Current Roles
              </p>
              <div className="flex flex-wrap gap-1.5">
                {oldRoleIds.length === 0 ? (
                  <span className="text-sm text-muted-foreground italic">No roles</span>
                ) : (
                  oldRoleIds.map((id) => <RoleBadge key={id} roleId={id} />)
                )}
              </div>
            </div>
            <div className="border-t border-border" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                New Roles
              </p>
              <div className="flex flex-wrap gap-1.5">
                {newRoleIds.length === 0 ? (
                  <span className="text-sm text-muted-foreground italic">No roles</span>
                ) : (
                  newRoleIds.map((id) => <RoleBadge key={id} roleId={id} />)
                )}
              </div>
            </div>
          </div>

          {/* Warning */}
          {!isAttendeeMigration && (
            <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 space-y-1">
                <p className="font-semibold">High-impact role change detected</p>
                <p>
                  This user has roles that control active system permissions
                  (e.g., submitting papers, reviewing, chairing sessions).
                  Removing these roles will immediately restrict their
                  corresponding access.
                </p>
                <p className="font-medium mt-1">
                  💡 Consider using a dedicated account for each role to avoid
                  disrupting existing workflows.
                </p>
              </div>
            </div>
          )}

          {isAttendeeMigration && (
            <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl mb-4">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Expanding access from Attendee to additional roles. Existing
                check-ins and registrations will remain intact.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isSaving}
              className={
                isAttendeeMigration
                  ? ""
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Update
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Role Editor (inline row expand) ─────────────────────────────────────────

interface RoleEditorProps {
  user: UserRecord;
  onSaveRequest: (user: UserRecord, newRoleIds: number[]) => void;
  onCancel: () => void;
}

const RoleEditor = ({ user, onSaveRequest, onCancel }: RoleEditorProps) => {
  const currentIds = user.user_roles.map((ur) => ur.role_id);
  // Single-select: initialize with the first current role (or null if none)
  const [selected, setSelected] = useState<number | null>(currentIds[0] ?? null);

  const hasChanged = selected !== (currentIds[0] ?? null) || currentIds.length !== (selected === null ? 0 : 1);

  return (
    <div className="mt-3 pt-3 border-t border-border/60">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Assign Role <span className="font-normal normal-case">(chọn 1 role để ghi đè)</span>
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {ALL_ROLES.map((role) => {
          const active = selected === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelected(role.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                active
                  ? `${role.color} shadow-sm ring-2 ring-offset-1 ring-current`
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              <span className={`w-2 h-2 rounded-full border-2 shrink-0 ${active ? "bg-current border-current" : "border-muted-foreground"}`} />
              {role.label}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!hasChanged || selected === null}
          onClick={() => onSaveRequest(user, selected !== null ? [selected] : [])}
        >
          Save Changes
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

// ─── User Row ─────────────────────────────────────────────────────────────────

interface UserRowProps {
  user: UserRecord;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSaveRequest: (user: UserRecord, newRoleIds: number[]) => void;
}

const UserRow = ({
  user,
  isExpanded,
  onToggleExpand,
  onSaveRequest,
}: UserRowProps) => {
  const roleIds = user.user_roles.map((ur) => ur.role_id);
  const navigate = useNavigate();

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user.email) {
      navigate({ to: "/profile", search: { email: user.email } } as any);
    }
  };

  return (
    <div
      className={`bg-card border rounded-xl transition-all duration-200 overflow-hidden ${
        isExpanded ? "border-primary/40 shadow-md" : "border-border hover:border-border/80 hover:shadow-sm"
      }`}
    >
      <div className="p-4 flex items-center gap-4">
        {/* Avatar & Info Wrapper */}
        <div 
          className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleProfileClick}
          title="Click to view profile"
        >
          {/* Avatar */}
          <div className="shrink-0">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name || ""}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-primary font-bold text-sm ring-2 ring-border">
                {getInitials(user.full_name)}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground truncate">
              {user.full_name || <span className="italic text-muted-foreground">No name</span>}
            </p>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              {user.email && (
                <span className="flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3 shrink-0" />
                  {user.email}
                </span>
              )}
              {user.organization && (
                <span className="hidden sm:flex items-center gap-1 truncate">
                  <Building2 className="w-3 h-3 shrink-0" />
                  {user.organization}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Roles */}
        <div className="hidden md:flex flex-wrap gap-1.5 max-w-[220px] justify-end">
          {roleIds.length === 0 ? (
            <span className="text-xs text-muted-foreground italic">No roles</span>
          ) : (
            roleIds.map((id) => <RoleBadge key={id} roleId={id} />)
          )}
        </div>

        {/* Expand button */}
        <button
          onClick={onToggleExpand}
          className={`shrink-0 ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            isExpanded
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground border-border hover:border-primary/50 hover:text-primary"
          }`}
        >
          {isExpanded ? "Close" : "Edit Roles"}
        </button>
      </div>

      {/* Mobile roles */}
      <div className="md:hidden px-4 pb-3 flex flex-wrap gap-1.5">
        {roleIds.map((id) => (
          <RoleBadge key={id} roleId={id} />
        ))}
      </div>

      {/* Expanded role editor */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <RoleEditor
            user={user}
            onSaveRequest={onSaveRequest}
            onCancel={onToggleExpand}
          />
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const AdminDashboardPage = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterRoleId, setFilterRoleId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

  // Confirm modal state
  const [confirmState, setConfirmState] = useState<{
    user: UserRecord;
    newRoleIds: number[];
    isAttendeeMigration: boolean;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filterRoleId !== null) params.set("role_id", String(filterRoleId));

      const res = await fetch(`${BASE_API_URL}/admin/users?${params}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      setUsers(json.data || []);
      setTotal(json.total || 0);
    } catch (e: any) {
      setError(e.message || "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, filterRoleId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ─── Save handler ─────────────────────────────────────────────────────────

  const handleSaveRequest = (user: UserRecord, newRoleIds: number[]) => {
    const currentIds = user.user_roles.map((ur) => ur.role_id);
    // "Safe" = only current roles are ATTENDEE (or no roles) upgrading to any roles
    const onlyAttendeeOrNone = currentIds.every((id) => id === ATTENDEE_ROLE_ID);
    setConfirmState({
      user,
      newRoleIds,
      isAttendeeMigration: onlyAttendeeOrNone,
    });
  };

  const handleConfirmUpdate = async () => {
    if (!confirmState) return;
    setIsSaving(true);
    try {
      const res = await fetch(
        `${BASE_API_URL}/admin/users/${confirmState.user.id}/roles`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role_ids: confirmState.newRoleIds }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to update roles.");
      }
      toast.success("Roles updated successfully.");
      setConfirmState(null);
      setExpandedUserId(null);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || "Failed to update roles.");
    } finally {
      setIsSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminLayout meta={{ title: "User Manager" }}>
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 lg:px-6">
        {/* ── Header ── */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">User Manager</h2>
          </div>
          <p className="text-sm text-muted-foreground ml-9">
            View and manage role assignments for all registered users.
          </p>
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, organization…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Role filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setFilterRoleId(null); setPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                filterRoleId === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:border-primary/50"
              }`}
            >
              All
            </button>
            {ALL_ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => { setFilterRoleId(role.id); setPage(1); }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  filterRoleId === role.id
                    ? `${role.color} shadow-sm`
                    : "bg-background text-foreground border-border hover:border-primary/50"
                }`}
              >
                {role.label}
              </button>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={fetchUsers}
              disabled={isLoading}
              className="rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>
            {isLoading ? "Loading…" : `${total} user${total !== 1 ? "s" : ""} found`}
          </span>
        </div>

        {/* ── Content ── */}
        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
            {error}
          </div>
        ) : isLoading && users.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 bg-muted/50 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border">
            <UserCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold text-foreground">No users found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your search or filter.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <UserRow
                key={user.user_id}
                user={user}
                isExpanded={expandedUserId === user.user_id}
                onToggleExpand={() =>
                  setExpandedUserId((prev) =>
                    prev === user.user_id ? null : user.user_id
                  )
                }
                onSaveRequest={handleSaveRequest}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-xl"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Confirm Modal ── */}
      {confirmState && (
        <ConfirmModal
          user={confirmState.user}
          newRoleIds={confirmState.newRoleIds}
          isAttendeeMigration={confirmState.isAttendeeMigration}
          onConfirm={handleConfirmUpdate}
          onCancel={() => setConfirmState(null)}
          isSaving={isSaving}
        />
      )}
    </AdminLayout>
  );
};

export default AdminDashboardPage;
