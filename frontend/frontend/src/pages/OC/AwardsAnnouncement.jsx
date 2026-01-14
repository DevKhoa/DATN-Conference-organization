import React, { useState } from "react";
import { Award, Eye, Send, Loader, AlertCircle, Trophy, Star } from "lucide-react";
import Button from "../../ui/Button";
import { useAwards } from "../../hooks/oc/useAwards";

/* ===== STATUS BADGE ===== */
const StatusBadge = ({ status }) => {
  const config = {
    PROPOSED: { bg: "bg-[#fef3c7]", text: "text-[#d97706]", label: "Proposed" },
    UNDER_REVIEW: { bg: "bg-[#dbeafe]", text: "text-[#1e40af]", label: "Under Review" },
    FINALIZED: { bg: "bg-[#d1fae5]", text: "text-[#059669]", label: "Finalized" },
    ANNOUNCED: { bg: "bg-[#e0e7ff]", text: "text-[#4f46e5]", label: "Announced" },
  };

  const style = config[status] || config.PROPOSED;

  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
};

/* ===== TYPE BADGE ===== */
const TypeBadge = ({ type }) => {
  const config = {
    BEST_PAPER: { icon: Trophy, label: "Best Paper", color: "#f59e0b" },
    BEST_STUDENT_PAPER: { icon: Star, label: "Best Student Paper", color: "#8b5cf6" },
    LIFETIME_ACHIEVEMENT: { icon: Award, label: "Lifetime Achievement", color: "#2563eb" },
  };

  const style = config[type] || config.BEST_PAPER;
  const Icon = style.icon;

  return (
    <div className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: style.color }}>
      <Icon size={14} />
      <span>{style.label}</span>
    </div>
  );
};

/* ===== LOADING STATE ===== */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-[#2563eb]" size={40} />
    <div className="text-[14px] text-[#64748b] mt-4">Loading award candidates...</div>
  </div>
);

/* ===== ERROR STATE ===== */
const ErrorState = ({ error, onRetry }) => (
  <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-xl p-6">
    <div className="flex items-center gap-2 text-[#991b1b] mb-2">
      <AlertCircle size={20} />
      <strong className="text-[16px] font-semibold">Error loading awards</strong>
    </div>
    <p className="text-[14px] text-[#dc2626] mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>
      Try Again
    </Button>
  </div>
);

/* ===== EMPTY STATE ===== */
const EmptyState = () => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-12 text-center">
    <Trophy size={48} className="text-[#cbd5e1] mx-auto mb-4" />
    <h3 className="text-[16px] font-semibold text-[#475569] mb-2">No award candidates yet</h3>
    <p className="text-[14px] text-[#94a3b8]">Award nominations will appear here once submitted</p>
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

/* ===== MAIN COMPONENT ===== */
const AwardsAnnouncement = () => {
  const conferenceId = 1;
  const { candidates, finalize, announce, loading, error, refetch } = useAwards(conferenceId);
  const [announcing, setAnnouncing] = useState(false);

  const stats = {
    total: candidates.length,
    proposed: candidates.filter((c) => c.status === "PROPOSED").length,
    finalized: candidates.filter((c) => c.status === "FINALIZED").length,
    announced: candidates.filter((c) => c.status === "ANNOUNCED").length,
  };

  const handleAnnounce = async () => {
    const finalizedIds = candidates.filter((c) => c.status === "FINALIZED").map((c) => c.id);

    if (finalizedIds.length === 0) {
      alert("⚠️ No finalized awards to announce");
      return;
    }

    if (!confirm(`Announce ${finalizedIds.length} awards?`)) return;

    setAnnouncing(true);
    const result = await announce(finalizedIds);

    if (result.success) {
      alert(`✅ Successfully announced ${finalizedIds.length} awards!`);
    } else {
      alert(`❌ Failed: ${result.error}`);
    }
    setAnnouncing(false);
  };

  const handleNotify = () => {
    alert("Internal notification feature - Coming soon!");
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1e293b] leading-tight mb-2">
            Awards & Results 🏆
          </h1>
          <p className="text-[14px] text-[#64748b] leading-relaxed">
            Review, finalize, and announce conference awards
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            icon={Send}
            variant="secondary"
            onClick={handleNotify}
          >
            Send Notification
          </Button>
          <Button
            icon={Award}
            variant="success"
            onClick={handleAnnounce}
            disabled={announcing || stats.finalized === 0}
          >
            {announcing ? "Announcing..." : `Announce Awards (${stats.finalized})`}
          </Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={stats.total} color="#64748b" />
        <StatCard label="Proposed" value={stats.proposed} color="#f59e0b" />
        <StatCard label="Finalized" value={stats.finalized} color="#10b981" />
        <StatCard label="Announced" value={stats.announced} color="#2563eb" />
      </div>

      {/* TABLE OR EMPTY */}
      {candidates.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
          <div className="p-6 border-b border-[#e2e8f0]">
            <h3 className="text-[18px] font-semibold text-[#1e293b]">Award Candidates</h3>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                {["ID", "Title", "Type", "Score", "Status", "Actions"].map((h) => (
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
              {candidates.map((award, i) => (
                <tr
                  key={award.id}
                  className={`border-b border-[#e2e8f0] hover:bg-[#f8fafc] transition-colors ${
                    i === candidates.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <td className="p-4 text-[14px] font-semibold text-[#2563eb]">{award.id}</td>
                  <td className="p-4 text-[14px] text-[#334155] max-w-xs">
                    <div className="font-medium">{award.title}</div>
                    {award.authors && (
                      <div className="text-[13px] text-[#64748b] mt-0.5">
                        {Array.isArray(award.authors) ? award.authors.join(", ") : award.authors}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <TypeBadge type={award.type} />
                  </td>
                  <td className="p-4 text-[14px] font-semibold text-[#1e293b]">
                    {award.score?.toFixed(1) || "N/A"}
                  </td>
                  <td className="p-4">
                    <StatusBadge status={award.status} />
                  </td>
                  <td className="p-4">
                    <Button size="sm" variant="secondary" icon={Eye}>
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AwardsAnnouncement;
