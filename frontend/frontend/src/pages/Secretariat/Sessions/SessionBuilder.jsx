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
  X,
} from "lucide-react";
import Button from "../../../ui/Button";
import Modal from "../../../ui/Modal";
import { useSession } from "../../../hooks/secretariat/useSession";

/* ===== LOADING STATE ===== */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-blue-600" size={40} />
    <div className="text-sm text-slate-600 mt-4">Loading sessions...</div>
  </div>
);

/* ===== ERROR STATE ===== */
const ErrorState = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
    <div className="flex items-center gap-2 text-red-900 mb-2">
      <AlertCircle size={20} />
      <strong className="text-base font-semibold">Error loading sessions</strong>
    </div>
    <p className="text-sm text-red-700 mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>
      Try Again
    </Button>
  </div>
);

/* ===== STAT CARD ===== */
const StatCard = ({ label, value, color }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
    <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-medium">
      {label}
    </div>
    <div className="text-2xl font-bold" style={{ color }}>
      {value}
    </div>
  </div>
);

/* ===== SESSION CARD ===== */
const SessionCard = ({ session, onEdit, onToggleLock }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-sm transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className="flex-1">
        <h3 className="text-base font-semibold text-slate-900 mb-2">
          {session.title}
        </h3>
        <div className="space-y-1 text-xs text-slate-600">
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
          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"
          onClick={() => onEdit(session)}
        >
          <Edit size={16} className="text-slate-600" />
        </button>
        <button
          className={`p-2 border rounded-lg ${
            session.locked
              ? "border-amber-600 bg-amber-50"
              : "border-slate-200 hover:bg-slate-50"
          }`}
          onClick={() => onToggleLock(session.id)}
        >
          {session.locked ? (
            <Lock size={16} className="text-amber-700" />
          ) : (
            <Unlock size={16} className="text-slate-600" />
          )}
        </button>
      </div>
    </div>
    <div className="border-t border-slate-200 pt-4 flex justify-between">
      <span className="text-xs text-slate-600">
        <strong className="text-slate-900">{session.papers.length}</strong> papers
        assigned
      </span>
      {session.locked && (
        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700">
          LOCKED
        </span>
      )}
    </div>
  </div>
);

/* ===== EDIT MODAL ===== */
const EditModal = ({ session, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: session?.title || "",
    time: session?.time || "",
    room: session?.room || "",
    chair: session?.chair || "",
    duration: session?.duration || 120,
  });

  const handleSubmit = () => {
    onSave(session.id, formData);
    onClose();
  };

  if (!session) return null;

  return (
    <Modal isOpen={!!session} onClose={onClose} title="Edit Session">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Session Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Date & Time
          </label>
          <input
            type="datetime-local"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Room
          </label>
          <input
            type="text"
            value={formData.room}
            onChange={(e) => setFormData({ ...formData, room: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Session Chair
          </label>
          <input
            type="text"
            value={formData.chair}
            onChange={(e) => setFormData({ ...formData, chair: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Duration (minutes)
          </label>
          <input
            type="number"
            value={formData.duration}
            onChange={(e) =>
              setFormData({ ...formData, duration: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Save Changes</Button>
      </div>
    </Modal>
  );
};

/* ===== CONFIG PANEL ===== */
const ConfigPanel = ({ onCreateSession }) => {
  const [numSessions, setNumSessions] = useState(5);
  const [duration, setDuration] = useState(120);
  const [maxPapers, setMaxPapers] = useState(6);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <h3 className="text-base font-semibold text-slate-900 mb-4">
        Configuration
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Number of Sessions
          </label>
          <input
            type="number"
            value={numSessions}
            onChange={(e) => setNumSessions(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Duration (minutes)
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Max Papers per Session
          </label>
          <input
            type="number"
            value={maxPapers}
            onChange={(e) => setMaxPapers(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <Button className="w-full" onClick={onCreateSession}>
          Create New Session
        </Button>
      </div>
    </div>
  );
};

/* ===== MAIN COMPONENT ===== */
const SessionBuilder = () => {
  const {
    sessions,
    stats,
    loading,
    error,
    fetchSessions,
    fetchStats,
    createSession,
    updateSession,
    toggleSessionLock,
  } = useSession();

  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    fetchSessions();
    fetchStats();
  }, [fetchSessions, fetchStats]);

  const handleCreateSession = async () => {
    const newSession = {
      title: `Session ${sessions.length + 1}`,
      time: new Date().toISOString(),
      room: `Hall ${String.fromCharCode(65 + sessions.length)}`,
      chair: "TBD",
      duration: 120,
    };

    const result = await createSession(newSession);
    if (result.success) {
      alert("✅ Session created successfully!");
    }
  };

  const handleSaveEdit = async (id, updates) => {
    const result = await updateSession(id, updates);
    if (result.success) {
      alert("✅ Session updated successfully!");
    }
  };

  const handleToggleLock = async (id) => {
    const result = await toggleSessionLock(id);
    if (result.success) {
      alert(result.message);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => fetchSessions()} />;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Session Builder 🗓️
          </h1>
          <p className="text-sm text-slate-600">
            Organize conference sessions and assign papers
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
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Sessions" value={stats.total} color="#64748b" />
          <StatCard label="Locked" value={stats.locked} color="#f59e0b" />
          <StatCard label="Papers Assigned" value={stats.papers} color="#2563eb" />
        </div>
      )}

      {/* CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* CONFIG PANEL */}
        <ConfigPanel onCreateSession={handleCreateSession} />

        {/* SESSIONS LIST */}
        <div className="space-y-4">
          {sessions && sessions.length > 0 ? (
            sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onEdit={setSelectedSession}
                onToggleLock={handleToggleLock}
              />
            ))
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <Calendar size={48} className="text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No Sessions Yet
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Create your first session to get started
              </p>
              <Button onClick={handleCreateSession}>Create Session</Button>
            </div>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {selectedSession && (
        <EditModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

export default SessionBuilder;