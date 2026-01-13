import React, { useState } from "react";
import { Filter, Eye, Loader, AlertCircle, TrendingUp } from "lucide-react";
import Button from "../../../../ui/Button";

/* ===== STATUS BADGE ===== */
const StatusBadge = ({ status }) => {
  const config = {
    Accepted: { bg: "bg-[#d1fae5]", text: "text-[#059669]" },
    "Minor Revision": { bg: "bg-[#fef3c7]", text: "text-[#d97706]" },
    "Major Revision": { bg: "bg-[#fde68a]", text: "text-[#d97706]" },
    Rejected: { bg: "bg-[#fee2e2]", text: "text-[#dc2626]" },
  };

  const style = config[status] || config.Accepted;

  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${style.bg} ${style.text}`}>
      {status}
    </span>
  );
};

/* ===== LOADING STATE ===== */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-[#2563eb]" size={40} />
    <div className="text-[14px] text-[#64748b] mt-4">Loading review decisions...</div>
  </div>
);

/* ===== ERROR STATE ===== */
const ErrorState = ({ error, onRetry }) => (
  <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-xl p-6">
    <div className="flex items-center gap-2 text-[#991b1b] mb-2">
      <AlertCircle size={20} />
      <strong className="text-[16px] font-semibold">Error loading decisions</strong>
    </div>
    <p className="text-[14px] text-[#dc2626] mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>Try Again</Button>
  </div>
);

/* ===== EMPTY STATE ===== */
const EmptyState = () => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-12 text-center">
    <TrendingUp size={48} className="text-[#cbd5e1] mx-auto mb-4" />
    <h3 className="text-[16px] font-semibold text-[#475569] mb-2">No review data yet</h3>
    <p className="text-[14px] text-[#94a3b8]">Review decisions will appear here once available</p>
  </div>
);

/* ===== STAT CARD ===== */
const StatCard = ({ label, value, color }) => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 text-center">
    <div className="text-[13px] text-[#64748b] mb-1 uppercase tracking-wide font-medium">{label}</div>
    <div className="text-[24px] font-bold" style={{ color }}>{value}</div>
  </div>
);

/* ===== DETAIL MODAL ===== */
const DetailModal = ({ paper, onClose }) => {
  if (!paper) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-lg w-full m-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[18px] font-semibold text-[#1e293b] mb-4">Review Summary</h3>
        
        <div className="space-y-3 text-[14px]">
          <div>
            <label className="text-[13px] font-medium text-[#64748b]">Paper ID</label>
            <p className="text-[#1e293b] font-semibold">{paper.id}</p>
          </div>

          <div>
            <label className="text-[13px] font-medium text-[#64748b]">Title</label>
            <p className="text-[#1e293b]">{paper.title}</p>
          </div>

          <div>
            <label className="text-[13px] font-medium text-[#64748b]">Average Score</label>
            <p className="text-[20px] font-bold text-[#2563eb]">{paper.avg} / 5.0</p>
          </div>

          <div>
            <label className="text-[13px] font-medium text-[#64748b]">Number of Reviews</label>
            <p className="text-[#1e293b] font-semibold">{paper.count} reviewers</p>
          </div>

          <div>
            <label className="text-[13px] font-medium text-[#64748b]">Decision</label>
            <div className="mt-1">
              <StatusBadge status={paper.status} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

/* ===== MAIN COMPONENT ===== */
const ReviewDecisionsView = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const data = [
    { id: "P001", title: "Deep Learning for Medical Imaging", avg: 4.2, count: 3, status: "Accepted" },
    { id: "P002", title: "Blockchain Transparency Systems", avg: 3.8, count: 3, status: "Accepted" },
    { id: "P003", title: "Quantum Optimization Models", avg: 3.5, count: 2, status: "Minor Revision" },
    { id: "P004", title: "IoT Security Framework", avg: 2.8, count: 3, status: "Major Revision" },
  ];

  const stats = {
    total: data.length,
    accepted: data.filter((p) => p.status === "Accepted").length,
    revision: data.filter((p) => p.status.includes("Revision")).length,
    avgScore: (data.reduce((sum, p) => sum + p.avg, 0) / data.length).toFixed(2),
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => setError(null)} />;

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1e293b] leading-tight mb-2">
            Review Decisions 📊
          </h1>
          <p className="text-[14px] text-[#64748b] leading-relaxed">
            View reviewer scores and final recommendations
          </p>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Papers" value={stats.total} color="#64748b" />
        <StatCard label="Accepted" value={stats.accepted} color="#10b981" />
        <StatCard label="Need Revision" value={stats.revision} color="#f59e0b" />
        <StatCard label="Avg Score" value={stats.avgScore} color="#2563eb" />
      </div>

      {/* FILTERS */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-[#64748b]" />
          <span className="text-[14px] font-semibold text-[#1e293b]">Filters</span>
        </div>
      </div>

      {/* TABLE OR EMPTY */}
      {data.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                {["ID", "Title", "Avg Score", "Reviews", "Status", "Actions"].map((h) => (
                  <th key={h} className="p-4 text-left text-[13px] font-semibold text-[#64748b] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-b border-[#e2e8f0] hover:bg-[#f8fafc] transition-colors ${
                    i === data.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <td className="p-4 text-[14px] font-semibold text-[#2563eb]">{p.id}</td>
                  <td className="p-4 text-[14px] text-[#334155]">{p.title}</td>
                  <td className="p-4 text-[16px] font-bold text-[#1e293b]">{p.avg}</td>
                  <td className="p-4 text-[14px] text-[#64748b]">{p.count} reviewers</td>
                  <td className="p-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="p-4">
                    <button
                      className="p-2 border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors"
                      onClick={() => setSelected(p)}
                    >
                      <Eye size={16} className="text-[#64748b]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selected && <DetailModal paper={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default ReviewDecisionsView;