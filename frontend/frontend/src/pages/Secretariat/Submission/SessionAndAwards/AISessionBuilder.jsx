import React, { useState } from "react";
import { Zap, CheckCircle, Loader, AlertCircle, TrendingUp } from "lucide-react";
import Button from "../../../../ui/Button";

/* ===== LOADING STATE ===== */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-[#2563eb]" size={40} />
    <div className="text-[14px] text-[#64748b] mt-4">Running AI optimization...</div>
  </div>
);

/* ===== ERROR STATE ===== */
const ErrorState = ({ error, onRetry }) => (
  <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-xl p-6">
    <div className="flex items-center gap-2 text-[#991b1b] mb-2">
      <AlertCircle size={20} />
      <strong className="text-[16px] font-semibold">AI optimization failed</strong>
    </div>
    <p className="text-[14px] text-[#dc2626] mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>Try Again</Button>
  </div>
);

/* ===== CONFIDENCE BADGE ===== */
const ConfidenceBadge = ({ confidence }) => {
  const getColor = () => {
    if (confidence >= 90) return { bg: "bg-[#d1fae5]", text: "text-[#059669]" };
    if (confidence >= 70) return { bg: "bg-[#fef3c7]", text: "text-[#d97706]" };
    return { bg: "bg-[#fee2e2]", text: "text-[#dc2626]" };
  };

  const style = getColor();

  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${style.bg} ${style.text}`}>
      {confidence}%
    </span>
  );
};

/* ===== STAT CARD ===== */
const StatCard = ({ label, value, color }) => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 text-center">
    <div className="text-[13px] text-[#64748b] mb-1 uppercase tracking-wide font-medium">{label}</div>
    <div className="text-[24px] font-bold" style={{ color }}>{value}</div>
  </div>
);

/* ===== INFO BOX ===== */
const InfoBox = ({ children }) => (
  <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-lg p-4">
    <p className="text-[13px] text-[#1e40af] leading-relaxed">{children}</p>
  </div>
);

/* ===== MAIN COMPONENT ===== */
const AISessionBuilder = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasResults, setHasResults] = useState(true);

  const aiSessions = [
    { id: "AI-S1", title: "Deep Learning & Neural Networks", papers: 5, confidence: 92 },
    { id: "AI-S2", title: "Natural Language Processing", papers: 4, confidence: 88 },
    { id: "AI-S3", title: "Computer Vision Applications", papers: 6, confidence: 95 },
    { id: "AI-S4", title: "Reinforcement Learning", papers: 3, confidence: 75 },
  ];

  const stats = {
    sessions: aiSessions.length,
    papers: aiSessions.reduce((sum, s) => sum + s.papers, 0),
    avgConfidence: Math.round(
      aiSessions.reduce((sum, s) => sum + s.confidence, 0) / aiSessions.length
    ),
  };

  const handleRunAI = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setHasResults(true);
    }, 2000);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => setError(null)} />;

  return (
    <div>
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold text-[#1e293b] leading-tight mb-2">
          AI Session Builder 🧠
        </h1>
        <p className="text-[14px] text-[#64748b] leading-relaxed">
          AI analyzes accepted papers and proposes optimal session structures
        </p>
      </div>

      {hasResults && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="AI Sessions" value={stats.sessions} color="#2563eb" />
          <StatCard label="Papers Grouped" value={stats.papers} color="#10b981" />
          <StatCard label="Avg Confidence" value={`${stats.avgConfidence}%`} color="#f59e0b" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
        {/* CONFIG PANEL */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-6">
          <h3 className="text-[16px] font-semibold text-[#1e293b] mb-4">
            AI Configuration
          </h3>
          <p className="text-[13px] text-[#64748b] mb-4">
            Configure AI constraints such as session size and duration
          </p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-[13px] font-medium text-[#475569] mb-1.5">
                Min Papers per Session
              </label>
              <input
                type="number"
                defaultValue={3}
                className="w-full px-4 py-2.5 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#475569] mb-1.5">
                Max Papers per Session
              </label>
              <input
                type="number"
                defaultValue={6}
                className="w-full px-4 py-2.5 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#475569] mb-1.5">
                Similarity Threshold
              </label>
              <input
                type="range"
                min="50"
                max="100"
                defaultValue="75"
                className="w-full"
              />
              <div className="flex justify-between text-[12px] text-[#64748b] mt-1">
                <span>Loose</span>
                <span>75%</span>
                <span>Strict</span>
              </div>
            </div>
          </div>

          <Button icon={Zap} onClick={handleRunAI} className="w-full">
            Run AI Optimization
          </Button>

          <div className="mt-4">
            <InfoBox>
              💡 <strong>Tip:</strong> Higher similarity thresholds create more focused sessions but may result in more sessions overall.
            </InfoBox>
          </div>
        </div>

        {/* RESULTS PANEL */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[16px] font-semibold text-[#1e293b]">
              AI Proposal Results
            </h3>
            <div className="flex items-center gap-2 text-[13px] text-[#64748b]">
              <TrendingUp size={14} />
              <span>Optimized for topic clustering</span>
            </div>
          </div>

          {hasResults ? (
            <>
              <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden mb-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                      {["ID", "Title", "Papers", "Confidence"].map((h) => (
                        <th
                          key={h}
                          className="p-3 text-left text-[13px] font-semibold text-[#64748b] uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {aiSessions.map((s, i) => (
                      <tr
                        key={s.id}
                        className={`border-b border-[#e2e8f0] hover:bg-[#f8fafc] transition-colors ${
                          i === aiSessions.length - 1 ? "border-b-0" : ""
                        }`}
                      >
                        <td className="p-3 text-[14px] font-semibold text-[#2563eb]">
                          {s.id}
                        </td>
                        <td className="p-3 text-[14px] text-[#334155]">{s.title}</td>
                        <td className="p-3 text-[14px] text-[#64748b]">
                          {s.papers} papers
                        </td>
                        <td className="p-3">
                          <ConfidenceBadge confidence={s.confidence} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <Button variant="success" icon={CheckCircle}>
                  Accept All Proposals
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Zap size={48} className="text-[#cbd5e1] mx-auto mb-4" />
              <p className="text-[14px] text-[#64748b]">
                Click "Run AI Optimization" to generate session proposals
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AISessionBuilder;