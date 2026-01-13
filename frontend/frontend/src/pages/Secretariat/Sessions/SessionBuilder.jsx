import React, { useEffect, useState } from "react";
import {
  Edit,
  Lock,
  Unlock,
  Play,
  Save,
  Loader,
  AlertCircle,
  Calendar,
  MapPin,
  User,
} from "lucide-react";
import Button from "../../../ui/Button";
import { useSession } from "../../../hooks/secretariat/useSession";

/* ===== LOADING STATE ===== */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-[#2563eb]" size={40} />
    <div className="text-[14px] text-[#64748b] mt-4">Loading sessions...</div>
  </div>
);

/* ===== ERROR STATE ===== */
const ErrorState = ({ error, onRetry }) => (
  <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-xl p-6">
    <div className="flex items-center gap-2 text-[#991b1b] mb-2">
      <AlertCircle size={20} />
      <strong className="text-[16px] font-semibold">Error loading sessions</strong>
    </div>
    <p className="text-[14px] text-[#dc2626] mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>
      Try Again
    </Button>
  </div>
);

/* ===== STAT CARD ===== */
const StatCard = ({ label, value, color }) => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 text-center">
    <div className="text-[13px] text-[#64748b] mb-1 uppercase tracking-wide font-medium">
      {label}
    </div>
    <div className="text-[24px] font-bold" style={{ color }}>
      {value}
    </div>
  </div>
);

/* ===== SESSION CARD ===== */
const SessionCard = ({ session, onEdit, onToggleLock }) => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 hover:shadow-sm transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className="flex-1">
        <h3 className="text-[16px] font-semibold text-[#1e293b] mb-2">
          {session.title}
        </h3>

        <div className="space-y-1 text-[13px] text-[#64748b]">
          <div className="flex items-center gap-2">
            <Calendar size={14} />
            <span>{session.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} />
            <span>{session.room}</span>
          </div>
          <div className="flex items-center gap-2">
            <User size={14} />
            <span>Chair: {session.chair}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="p-2 border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc]"
          onClick={() => onEdit(session)}
        >
          <Edit size={16} className="text-[#64748b]" />
        </button>

        <button
          className={`p-2 border rounded-lg ${
            session.locked
              ? "border-[#f59e0b] bg-[#fef3c7]"
              : "border-[#e2e8f0] hover:bg-[#f8fafc]"
          }`}
          onClick={() => onToggleLock(session.id)}
        >
          {session.locked ? (
            <Lock size={16} className="text-[#d97706]" />
          ) : (
            <Unlock size={16} className="text-[#64748b]" />
          )}
        </button>
      </div>
    </div>

    <div className="border-t border-[#e2e8f0] pt-4 flex justify-between">
      <span className="text-[13px] text-[#64748b]">
        <strong className="text-[#1e293b]">{session.papers.length}</strong>{" "}
        papers assigned
      </span>

      {session.locked && (
        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#fef3c7] text-[#d97706]">
          LOCKED
        </span>
      )}
    </div>
  </div>
);

/* ===== MAIN COMPONENT ===== */
const SessionBuilderView = () => {
  const {
    sessions,
    stats,
    loading,
    error,
    fetchSessions,
    fetchStats,
    toggleSessionLock,
  } = useSession();

  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    fetchSessions();
    fetchStats();
  }, [fetchSessions, fetchStats]);

  if (loading) return <LoadingState />;
  if (error)
    return <ErrorState error={error} onRetry={() => fetchSessions()} />;

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1e293b] mb-2">
            Session Builder 🗓️
          </h1>
          <p className="text-[14px] text-[#64748b]">
            AI-assisted scheduling for the conference
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary">Manual Builder</Button>
          <Button icon={Play}>Run AI Suggestion</Button>
          <Button icon={Save} variant="success">
            Save Schedule
          </Button>
        </div>
      </div>

      {/* STATS */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Sessions" value={stats.total} color="#64748b" />
          <StatCard label="Locked" value={stats.locked} color="#f59e0b" />
          <StatCard
            label="Papers Assigned"
            value={stats.papers}
            color="#2563eb"
          />
        </div>
      )}

      {/* CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* CONFIG PANEL – giữ nguyên */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-6">
          <h3 className="text-[16px] font-semibold text-[#1e293b] mb-4">
            Configuration
          </h3>
          {/* inputs giữ nguyên */}
        </div>

        {/* SESSIONS LIST */}
        <div className="space-y-4">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onEdit={setSelectedSession}
              onToggleLock={toggleSessionLock}
            />
          ))}
        </div>
      </div>

      {/* EDIT MODAL */}
      {selectedSession && (
        <EditModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
};

export default SessionBuilderView;
