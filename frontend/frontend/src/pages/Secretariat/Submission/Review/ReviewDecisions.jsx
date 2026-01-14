import React, { useState, useEffect } from "react";
import { Filter, Eye, Loader, AlertCircle, TrendingUp } from "lucide-react";
import Button from "../../../../ui/Button";
import Modal from "../../../../ui/Modal";
import { useReview } from "../../../../hooks/secretariat/useReview";

const StatusBadge = ({ status }) => {
  const config = {
    Accepted: { bg: "bg-green-50", text: "text-green-700" },
    "Minor Revision": { bg: "bg-amber-50", text: "text-amber-700" },
    "Major Revision": { bg: "bg-amber-50", text: "text-amber-700" },
    Rejected: { bg: "bg-red-50", text: "text-red-700" },
  };
  const style = config[status] || config.Accepted;
  return <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${style.bg} ${style.text}`}>{status}</span>;
};

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-blue-600" size={40} />
    <div className="text-sm text-slate-600 mt-4">Loading review decisions...</div>
  </div>
);

const ErrorState = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
    <div className="flex items-center gap-2 text-red-900 mb-2">
      <AlertCircle size={20} />
      <strong className="text-base font-semibold">Error loading decisions</strong>
    </div>
    <p className="text-sm text-red-700 mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>Try Again</Button>
  </div>
);

const EmptyState = () => (
  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
    <TrendingUp size={48} className="text-slate-300 mx-auto mb-4" />
    <h3 className="text-base font-semibold text-slate-700 mb-2">No review data yet</h3>
    <p className="text-sm text-slate-500">Review decisions will appear here once available</p>
  </div>
);

const StatCard = ({ label, value, color }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
    <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-medium">{label}</div>
    <div className="text-2xl font-bold" style={{ color }}>{value}</div>
  </div>
);

const DetailModal = ({ paper, onClose }) => {
  if (!paper) return null;

  return (
    <Modal isOpen={!!paper} onClose={onClose} title="Review Summary">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-600">Paper ID</label>
          <p className="text-slate-900 font-semibold">{paper.id}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Title</label>
          <p className="text-slate-900">{paper.title}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Average Score</label>
          <p className="text-xl font-bold text-blue-600">{paper.avg} / 5.0</p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Number of Reviews</label>
          <p className="text-slate-900 font-semibold">{paper.count} reviewers</p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Decision</label>
          <div className="mt-1"><StatusBadge status={paper.status} /></div>
        </div>
        {paper.reviews && paper.reviews.length > 0 && (
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-2">Individual Reviews</label>
            <div className="space-y-2">
              {paper.reviews.map((review, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-slate-700">{review.reviewerId}</span>
                    <span className="text-sm font-bold text-blue-600">{review.score}/5.0</span>
                  </div>
                  <p className="text-xs text-slate-600">{review.comments}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end mt-6">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
};

const ReviewDecisions = () => {
  const { reviews, stats, loading, error, fetchReviews, fetchStats } = useReview();
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ status: "", minScore: "" });

  useEffect(() => {
    fetchReviews(filters);
    fetchStats();
  }, [fetchReviews, fetchStats, filters]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => fetchReviews(filters)} />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Review Decisions 📊</h1>
          <p className="text-sm text-slate-600">View reviewer scores and final recommendations</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Papers" value={stats.total} color="#64748b" />
          <StatCard label="Accepted" value={stats.accepted} color="#10b981" />
          <StatCard label="Need Revision" value={stats.revision} color="#f59e0b" />
          <StatCard label="Avg Score" value={stats.avgScore} color="#2563eb" />
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-600" />
          <span className="text-sm font-semibold text-slate-900">Filters</span>
        </div>
      </div>

      {!reviews || reviews.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {["ID", "Title", "Avg Score", "Reviews", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reviews.map((p, i) => (
                <tr key={p.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${i === reviews.length - 1 ? "border-b-0" : ""}`}>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-600">{p.id}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{p.title}</td>
                  <td className="px-4 py-3 text-base font-bold text-slate-900">{p.avg}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{p.count} reviewers</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors" onClick={() => setSelected(p)}>
                      <Eye size={16} className="text-slate-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <DetailModal paper={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default ReviewDecisions;