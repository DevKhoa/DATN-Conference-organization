import React, { useState, useEffect } from "react";
import { Zap, CheckCircle, Loader, AlertCircle, TrendingUp } from "lucide-react";
import Button from "../../../../ui/Button";
import { useSession } from "../../../../hooks/secretariat/useSession";

/* ===== LOADING STATE ===== */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-blue-600" size={40} />
    <div className="text-sm text-slate-600 mt-4">Running AI optimization...</div>
  </div>
);

/* ===== ERROR STATE ===== */
const ErrorState = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
    <div className="flex items-center gap-2 text-red-900 mb-2">
      <AlertCircle size={20} />
      <strong className="text-base font-semibold">AI optimization failed</strong>
    </div>
    <p className="text-sm text-red-700 mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>
      Try Again
    </Button>
  </div>
);

/* ===== CONFIDENCE BADGE ===== */
const ConfidenceBadge = ({ confidence }) => {
  const getStyle = () => {
    if (confidence >= 90) return "bg-green-50 text-green-700";
    if (confidence >= 70) return "bg-amber-50 text-amber-700";
    return "bg-red-50 text-red-700";
  };

  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${getStyle()}`}>
      {confidence}%
    </span>
  );
};

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

/* ===== INFO BOX ===== */
const InfoBox = ({ children }) => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <p className="text-xs text-blue-900 leading-relaxed">{children}</p>
  </div>
);

/* ===== MAIN COMPONENT ===== */
const AISessionBuilder = () => {
  const {
    aiSessions,
    aiStats,
    loading,
    error,
    fetchAISessions,
    fetchAIStats,
    runAIOptimization,
    acceptAIProposals,
  } = useSession();

  const [optimizing, setOptimizing] = useState(false);
  const [config, setConfig] = useState({
    minPapers: 3,
    maxPapers: 6,
    similarityThreshold: 75,
  });

  useEffect(() => {
    fetchAISessions();
    fetchAIStats();
  }, [fetchAISessions, fetchAIStats]);

  const handleRunAI = async () => {
    setOptimizing(true);
    const result = await runAIOptimization(config);
    setOptimizing(false);

    if (result.success) {
      alert("✅ AI optimization completed!");
      fetchAISessions();
      fetchAIStats();
    } else {
      alert(`❌ Optimization failed: ${result.error}`);
    }
  };

  const handleAcceptAll = async () => {
    const result = await acceptAIProposals();
    if (result.success) {
      alert(`✅ ${result.message}`);
    }
  };

  if (loading && !aiSessions) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchAISessions} />;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          AI Session Builder 🧠
        </h1>
        <p className="text-sm text-slate-600">
          AI analyzes accepted papers and proposes optimal session structures
        </p>
      </div>

      {/* STATS */}
      {aiStats && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="AI Sessions"
            value={aiStats.sessions}
            color="#2563eb"
          />
          <StatCard
            label="Papers Grouped"
            value={aiStats.papers}
            color="#10b981"
          />
          <StatCard
            label="Avg Confidence"
            value={`${aiStats.avgConfidence}%`}
            color="#f59e0b"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
        {/* CONFIG PANEL */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-2">
              AI Configuration
            </h3>
            <p className="text-xs text-slate-600">
              Configure AI constraints such as session size and duration
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Min Papers per Session
              </label>
              <input
                type="number"
                value={config.minPapers}
                onChange={(e) =>
                  setConfig({ ...config, minPapers: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Max Papers per Session
              </label>
              <input
                type="number"
                value={config.maxPapers}
                onChange={(e) =>
                  setConfig({ ...config, maxPapers: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Similarity Threshold
              </label>
              <input
                type="range"
                min="50"
                max="100"
                value={config.similarityThreshold}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    similarityThreshold: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>Loose</span>
                <span>{config.similarityThreshold}%</span>
                <span>Strict</span>
              </div>
            </div>
          </div>

          <Button
            icon={Zap}
            onClick={handleRunAI}
            disabled={optimizing}
            className="w-full"
          >
            {optimizing ? "Optimizing..." : "Run AI Optimization"}
          </Button>

          <InfoBox>
            💡 <strong>Tip:</strong> Higher similarity thresholds create more
            focused sessions but may result in more sessions overall.
          </InfoBox>
        </div>

        {/* RESULTS PANEL */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-slate-900">
              AI Proposal Results
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <TrendingUp size={14} />
              <span>Optimized for topic clustering</span>
            </div>
          </div>

          {!aiSessions || aiSessions.length === 0 ? (
            <div className="text-center py-12">
              <Zap size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-sm text-slate-600 mb-4">
                Click "Run AI Optimization" to generate session proposals
              </p>
              <Button icon={Zap} onClick={handleRunAI} disabled={optimizing}>
                {optimizing ? "Optimizing..." : "Run AI Optimization"}
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Papers
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Confidence
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiSessions.map((session, i) => (
                      <tr
                        key={session.id}
                        className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                          i === aiSessions.length - 1 ? "border-b-0" : ""
                        }`}
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                          {session.id}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {session.title}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {session.papers} papers
                        </td>
                        <td className="px-4 py-3">
                          <ConfidenceBadge confidence={session.confidence} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="success"
                  icon={CheckCircle}
                  onClick={handleAcceptAll}
                >
                  Accept All Proposals
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AISessionBuilder;