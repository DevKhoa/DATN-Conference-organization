import React, { useState } from "react";
import { Star, Filter, Eye, Save, Brain, Loader, AlertCircle, Award } from "lucide-react";
import Button from "../../../../ui/Button";

/* ===== LOADING STATE ===== */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-[#2563eb]" size={40} />
    <div className="text-[14px] text-[#64748b] mt-4">Loading papers...</div>
  </div>
);

/* ===== ERROR STATE ===== */
const ErrorState = ({ error, onRetry }) => (
  <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-xl p-6">
    <div className="flex items-center gap-2 text-[#991b1b] mb-2">
      <AlertCircle size={20} />
      <strong className="text-[16px] font-semibold">Error loading papers</strong>
    </div>
    <p className="text-[14px] text-[#dc2626] mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>Try Again</Button>
  </div>
);

/* ===== EMPTY STATE ===== */
const EmptyState = () => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-12 text-center">
    <Award size={48} className="text-[#cbd5e1] mx-auto mb-4" />
    <h3 className="text-[16px] font-semibold text-[#475569] mb-2">No papers available</h3>
    <p className="text-[14px] text-[#94a3b8]">Papers will appear here once reviews are complete</p>
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

  const avgScore = ((paper.novelty + paper.impact + paper.clarity) / 3).toFixed(2);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-lg w-full m-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[18px] font-semibold text-[#1e293b] mb-4">Evaluation Details</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#64748b] mb-1">Title</label>
            <p className="text-[14px] text-[#1e293b]">{paper.title}</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#64748b] mb-1">Novelty</label>
              <p className="text-[20px] font-bold text-[#2563eb]">{paper.novelty}</p>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#64748b] mb-1">Impact</label>
              <p className="text-[20px] font-bold text-[#10b981]">{paper.impact}</p>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#64748b] mb-1">Clarity</label>
              <p className="text-[20px] font-bold text-[#f59e0b]">{paper.clarity}</p>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#64748b] mb-1">Average Score</label>
            <p className="text-[24px] font-bold text-[#1e293b]">{avgScore} / 5.0</p>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#64748b] mb-1">AI Depth Analysis</label>
            <p className="text-[20px] font-bold text-[#2563eb]">{paper.ai_depth} / 10</p>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#475569] mb-1.5">
              Override Final Score (Optional)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              placeholder="Leave empty to use AI score"
              className="w-full px-4 py-2.5 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={Save} onClick={onClose}>Save Evaluation</Button>
        </div>
      </div>
    </div>
  );
};

/* ===== MAIN COMPONENT ===== */
const BestPaperEvalView = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [papers, setPapers] = useState([
    { id: "P001", title: "Medical Imaging with Deep Learning", novelty: 4.5, impact: 4.2, clarity: 4.3, ai_depth: 8.9 },
    { id: "P002", title: "Blockchain Transparency Systems", novelty: 4.0, impact: 3.8, clarity: 4.1, ai_depth: 7.5 },
    { id: "P003", title: "Quantum Optimization Models", novelty: 3.8, impact: 4.0, clarity: 3.7, ai_depth: 8.1 },
    { id: "P004", title: "Federated Learning Framework", novelty: 4.3, impact: 4.5, clarity: 4.0, ai_depth: 9.2 },
  ]);
  const [selected, setSelected] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const avgScore = (p) => ((p.novelty + p.impact + p.clarity) / 3).toFixed(2);

  const runAI = () => {
    setLoadingAI(true);
    setTimeout(() => {
      setPapers((prev) =>
        prev.map((p) => ({
          ...p,
          ai_depth: +(Math.random() * (9.5 - 7) + 7).toFixed(1),
        }))
      );
      setLoadingAI(false);
    }, 2000);
  };

  const stats = {
    total: papers.length,
    avgScore: (papers.reduce((sum, p) => sum + parseFloat(avgScore(p)), 0) / papers.length).toFixed(2),
    avgAI: (papers.reduce((sum, p) => sum + p.ai_depth, 0) / papers.length).toFixed(1),
    topScore: Math.max(...papers.map(p => parseFloat(avgScore(p)))).toFixed(2),
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => setError(null)} />;

  return (
    <div>
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold text-[#1e293b] leading-tight mb-2">
          Best Paper Evaluation 🌟
        </h1>
        <p className="text-[14px] text-[#64748b] leading-relaxed">
          Evaluate top papers using reviewer scores and AI-assisted metrics
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Candidates" value={stats.total} color="#64748b" />
        <StatCard label="Avg Score" value={stats.avgScore} color="#2563eb" />
        <StatCard label="Avg AI Depth" value={stats.avgAI} color="#10b981" />
        <StatCard label="Top Score" value={stats.topScore} color="#f59e0b" />
      </div>

      {/* AI FILTER */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-[#2563eb]" />
            <span className="text-[14px] font-semibold text-[#1e293b]">
              AI Filter: Top Candidates
            </span>
          </div>

          <Button
            variant="secondary"
            icon={Brain}
            onClick={runAI}
            disabled={loadingAI}
          >
            {loadingAI ? "Running AI Analysis..." : "Run AI Deep Review"}
          </Button>
        </div>
      </div>

      {/* TABLE OR EMPTY */}
      {papers.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                {["ID", "Title", "Novelty", "Impact", "Clarity", "Avg", "AI Depth", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="p-4 text-left text-[13px] font-semibold text-[#64748b] uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {papers.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-b border-[#e2e8f0] hover:bg-[#f8fafc] transition-colors ${
                    i === papers.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <td className="p-4 text-[14px] font-semibold text-[#2563eb]">{p.id}</td>
                  <td className="p-4 text-[14px] text-[#334155]">{p.title}</td>
                  <td className="p-4 text-[14px] text-[#64748b]">{p.novelty}</td>
                  <td className="p-4 text-[14px] text-[#64748b]">{p.impact}</td>
                  <td className="p-4 text-[14px] text-[#64748b]">{p.clarity}</td>
                  <td className="p-4 text-[16px] font-bold text-[#10b981]">{avgScore(p)}</td>
                  <td className="p-4 text-[14px] font-semibold text-[#2563eb]">
                    {p.ai_depth} / 10
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

      {/* FINALIZE */}
      <div className="flex justify-end">
        <Button icon={Star}>Finalize Best Paper Selection</Button>
      </div>

      {/* DETAIL MODAL */}
      {selected && <DetailModal paper={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default BestPaperEvalView;