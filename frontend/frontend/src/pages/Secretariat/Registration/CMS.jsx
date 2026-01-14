import React, { useEffect } from "react";
import { Plus, Globe, Edit, Loader, AlertCircle, Calendar, Eye } from "lucide-react";
import { useCMS } from "../../../hooks/secretariat/useCMS";
import Button from "../../../ui/Button"

/* ===== STATUS BADGE ===== */
const StatusBadge = ({ status }) => {
  const config = {
    Published: { bg: "bg-green-50", text: "text-green-700" },
    Draft: { bg: "bg-red-50", text: "text-red-700" },
    Scheduled: { bg: "bg-amber-50", text: "text-amber-700" },
  };

  const statusType = status?.startsWith("Scheduled") ? "Scheduled" : status;
  const style = config[statusType] || config.Draft;

  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${style.bg} ${style.text}`}>
      {status}
    </span>
  );
};

/* ===== LOADING STATE ===== */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-blue-600" size={40} />
    <div className="text-[14px] text-slate-600 mt-4">Loading content...</div>
  </div>
);

/* ===== ERROR STATE ===== */
const ErrorState = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-[#fca5a5] rounded-xl p-6">
    <div className="flex items-center gap-2 text-[#991b1b] mb-2">
      <AlertCircle size={20} />
      <strong className="text-[16px] font-semibold">Error loading content</strong>
    </div>
    <p className="text-[14px] text-red-700 mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>
      Try Again
    </Button>
  </div>
);

/* ===== EMPTY STATE ===== */
const EmptyState = () => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-12 text-center">
    <Globe size={48} className="text-slate-300 mx-auto mb-4" />
    <h3 className="text-[16px] font-semibold text-slate-700 mb-2">
      No content published yet
    </h3>
    <p className="text-[14px] text-slate-400 mb-4">
      Start by creating your first post
    </p>
    <Button icon={Plus}>Create First Post</Button>
  </div>
);

/* ===== STAT CARD ===== */
const StatCard = ({ label, value, color }) => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 text-center">
    <div className="text-[13px] text-slate-600 mb-1 uppercase tracking-wide font-medium">
      {label}
    </div>
    <div className="text-[24px] font-bold" style={{ color }}>
      {value}
    </div>
  </div>
);

/* ===== MAIN COMPONENT ===== */
const CMS = () => {
  const {
    content,
    stats,
    loading,
    error,
    fetchContent,
    fetchStats,
  } = useCMS();

  /* ===== FETCH DATA ON MOUNT ===== */
  useEffect(() => {
    fetchContent();
    fetchStats();
  }, [fetchContent, fetchStats]);

  if (loading && content.length === 0) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchContent} />;

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-[28px] font-semibold text-slate-900 mb-2">
            Content Management 🌐
          </h1>
          <p className="text-[14px] text-slate-600">
            Manage and schedule publication of website content
          </p>
        </div>

        <div className="flex gap-2">
          <Button icon={Globe} variant="secondary">
            View Website
          </Button>
          <Button icon={Plus}>
            Create Post
          </Button>
        </div>
      </div>

      {/* STATS */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Total" value={stats.total} color="#64748b" />
          <StatCard label="Published" value={stats.published} color="#10b981" />
          <StatCard label="Draft" value={stats.draft} color="#ef4444" />
          <StatCard label="Scheduled" value={stats.scheduled} color="#f59e0b" />
        </div>
      )}

      {/* CONTENT LIST */}
      {content.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-6">
          <h3 className="text-[18px] font-semibold text-slate-900 mb-4">
            Published Content
          </h3>

          <div className="space-y-3">
            {content.map((c) => (
              <div
                key={c.id}
                className="bg-slate-50 border border-[#e2e8f0] rounded-lg p-4 hover:shadow-sm transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="text-[14px] font-semibold text-slate-900 mb-1">
                      {c.title}
                    </h4>
                    <div className="flex items-center gap-4 text-[13px] text-slate-600">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        Last edit: {c.updatedAt}
                      </span>
                      {c.views > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye size={14} />
                          {c.views.toLocaleString()} views
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={c.status} />
                    <Button size="sm" icon={Edit} variant="secondary">
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CMS;