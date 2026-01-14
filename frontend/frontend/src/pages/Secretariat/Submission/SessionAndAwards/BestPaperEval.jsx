import React, { useState, useEffect } from "react";
import { Star, Filter, Eye, Save, Brain, Loader, AlertCircle, Award } from "lucide-react";
import Button from "../../../../ui/Button";
import Modal from "../../../../ui/Modal";
import { useReview } from "../../../../hooks/secretariat/useReview";

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-blue-600" size={40} />
    <div className="text-sm text-slate-600 mt-4">Loading papers...</div>
  </div>
);

const ErrorState = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
    <div className="flex items-center gap-2 text-red-900 mb-2">
      <AlertCircle size={20} />
      <strong className="text-base font-semibold">Error loading papers</strong>
    </div>
    <p className="text-sm text-red-700 mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>Try Again</Button>
  </div>
);

const EmptyState = () => (
  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
    <Award size={48} className="text-slate-300 mx-auto mb-4" />
    <h3 className="text-base font-semibold text-slate-700 mb-2">No papers available</h3>
    <p className="text-sm text-slate-500">Papers will appear here once reviews are complete</p>
  </div>
);

const StatCard = ({ label, value, color }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
    <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-medium">{label}</div>
    <div className="text-2xl font-bold" style={{ color }}>{value}</div>
  </div>
);

const DetailModal = ({ paper, onClose, onSave }) => {
  const [overrideScore, setOverrideScore] = useState("");

  if (!paper) return null;

  const avgScore = ((paper.novelty + paper.impact + paper.clarity) / 3).toFixed(2);

  const handleSave = async () => {
    const result = await onSave(paper.id, {
      overrideScore: overrideScore ? parseFloat(overrideScore) : null,
    });
    if (result.success) {
      alert("✅ Evaluation saved!");
      onClose();
    }
  };

  return (
    <Modal isOpen={!!paper} onClose={onClose} title="Evaluation Details">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
          <p className="text-sm text-slate-900">{paper.title}</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Novelty</label>
            <p className="text-xl font-bold text-blue-600">{paper.novelty}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Impact</label>
            <p className="text-xl font-bold text-green-600">{paper.impact}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Clarity</label>
            <p className="text-xl font-bold text-amber-600">{paper.clarity}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Average Score</label>
          <p className="text-2xl font-bold text-slate-900">{avgScore} / 5.0</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">AI Depth Analysis</label>
          <p className="text-xl font-bold text-blue-600">{paper.ai_depth} / 10</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Override Final Score (Optional)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={overrideScore}
            onChange={(e) => setOverrideScore(e.target.value)}
            placeholder="Leave empty to use AI score"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            Enter a manual score to override the AI evaluation
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button icon={Save} onClick={handleSave}>Save Evaluation</Button>
      </div>
    </Modal>
  );
};

const BestPaperEval = () => {
  const {
    bestPaperCandidates,
    bestPaperStats,
    loading,
    error,
    fetchBestPaperCandidates,
    fetchBestPaperStats,
    runAIDeepReview,
    saveBestPaperEvaluation,
    finalizeBestPaper,
  } = useReview();

  const [selected, setSelected] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [selectedPapers, setSelectedPapers] = useState([]);

  useEffect(() => {
    fetchBestPaperCandidates();
    fetchBestPaperStats();
  }, [fetchBestPaperCandidates, fetchBestPaperStats]);

  const avgScore = (p) => ((p.novelty + p.impact + p.clarity) / 3).toFixed(2);

  const handleRunAI = async () => {
    setLoadingAI(true);
    const result = await runAIDeepReview();
    setLoadingAI(false);

    if (result.success) {
      alert("✅ AI analysis completed!");
      fetchBestPaperCandidates();
    } else {
      alert(`❌ Analysis failed: ${result.error}`);
    }
  };

  const handleFinalize = async () => {
    if (selectedPapers.length === 0) {
      alert("⚠️ Please select at least one paper");
      return;
    }

    if (!confirm(`Finalize ${selectedPapers.length} paper(s) as best paper(s)?`)) {
      return;
    }

    const result = await finalizeBestPaper(selectedPapers);
    if (result.success) {
      alert(`✅ ${result.message}`);
      setSelectedPapers([]);
    }
  };

  const togglePaperSelection = (paperId) => {
    setSelectedPapers((prev) =>
      prev.includes(paperId)
        ? prev.filter((id) => id !== paperId)
        : [...prev, paperId]
    );
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchBestPaperCandidates} />;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Best Paper Evaluation 🌟
        </h1>
        <p className="text-sm text-slate-600">
          Evaluate top papers using reviewer scores and AI-assisted metrics
        </p>
      </div>

      {bestPaperStats && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Candidates" value={bestPaperStats.candidates} color="#64748b" />
          <StatCard label="Avg Score" value={bestPaperStats.avgScore} color="#2563eb" />
          <StatCard label="Avg AI Depth" value={bestPaperStats.avgAIDepth} color="#10b981" />
          <StatCard label="Top Score" value={bestPaperStats.topScore} color="#f59e0b" />
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-blue-600" />
            <span className="text-sm font-semibold text-slate-900">
              AI Filter: Top Candidates
            </span>
          </div>
          <Button
            variant="secondary"
            icon={Brain}
            onClick={handleRunAI}
            disabled={loadingAI}
          >
            {loadingAI ? "Running AI Analysis..." : "Run AI Deep Review"}
          </Button>
        </div>
      </div>

      {!bestPaperCandidates || bestPaperCandidates.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPapers(bestPaperCandidates.map((p) => p.id));
                        } else {
                          setSelectedPapers([]);
                        }
                      }}
                      checked={selectedPapers.length === bestPaperCandidates.length}
                      className="w-4 h-4"
                    />
                  </th>
                  {["ID", "Title", "Novelty", "Impact", "Clarity", "Avg", "AI Depth", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bestPaperCandidates.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                      i === bestPaperCandidates.length - 1 ? "border-b-0" : ""
                    } ${selectedPapers.includes(p.id) ? "bg-blue-50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedPapers.includes(p.id)}
                        onChange={() => togglePaperSelection(p.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-600">{p.id}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{p.title}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{p.novelty}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{p.impact}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{p.clarity}</td>
                    <td className="px-4 py-3 text-base font-bold text-green-600">{avgScore(p)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                      {p.ai_depth} / 10
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        onClick={() => setSelected(p)}
                      >
                        <Eye size={16} className="text-slate-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button
              icon={Star}
              onClick={handleFinalize}
              disabled={selectedPapers.length === 0}
            >
              Finalize Best Paper Selection ({selectedPapers.length})
            </Button>
          </div>
        </>
      )}

      {selected && (
        <DetailModal
          paper={selected}
          onClose={() => setSelected(null)}
          onSave={saveBestPaperEvaluation}
        />
      )}
    </div>
  );
};

export default BestPaperEval;