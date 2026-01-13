import React from "react";
import { Mail, Plus, Send, CheckCircle, X, Clock, Loader, AlertCircle } from "lucide-react";
import Button from "../../ui/Button";
import { useEmailStats } from "../../hooks/oc/useEmail";

/* ===== STAT CARD ===== */
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 flex-1 hover:shadow-md transition-all duration-200">
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
      style={{ backgroundColor: `${color}15` }}
    >
      <Icon size={24} color={color} />
    </div>
    <div className="text-[13px] text-[#64748b] mb-1.5 uppercase tracking-wide font-medium">
      {label}
    </div>
    <div className="text-[28px] font-bold text-[#1e293b]" style={{ color }}>
      {value || 0}
    </div>
  </div>
);

/* ===== LOADING STATE ===== */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-[#2563eb]" size={40} />
    <div className="text-[14px] text-[#64748b] mt-4">Loading email statistics...</div>
  </div>
);

/* ===== ERROR STATE ===== */
const ErrorState = ({ error, onRetry }) => (
  <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-xl p-6">
    <div className="flex items-center gap-2 text-[#991b1b] mb-2">
      <AlertCircle size={20} />
      <strong className="text-[16px] font-semibold">Error loading email data</strong>
    </div>
    <p className="text-[14px] text-[#dc2626] mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>
      Try Again
    </Button>
  </div>
);

/* ===== INFO CARD ===== */
const InfoCard = ({ title, description, icon: Icon }) => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-6">
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-[#eff6ff] flex items-center justify-center flex-shrink-0">
        <Icon size={24} className="text-[#2563eb]" />
      </div>
      <div>
        <h3 className="text-[16px] font-semibold text-[#1e293b] mb-2">{title}</h3>
        <p className="text-[14px] text-[#64748b] leading-relaxed">{description}</p>
      </div>
    </div>
  </div>
);

/* ===== MAIN COMPONENT ===== */
const EmailManagement = () => {
  const conferenceId = 1;
  const { stats, loading, error, refetch } = useEmailStats(conferenceId);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1e293b] leading-tight mb-2">
            Email Management 📧
          </h1>
          <p className="text-[14px] text-[#64748b] leading-relaxed">
            Manage invitations and track RSVP responses
          </p>
        </div>

        <div className="flex gap-2">
          <Button icon={Plus} variant="primary">
            Create Template
          </Button>
          <Button variant="secondary" icon={Mail}>
            View Logs
          </Button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <StatCard icon={Send} label="Sent" value={stats?.sent} color="#2563eb" />
        <StatCard icon={CheckCircle} label="Accepted" value={stats?.accepted} color="#10b981" />
        <StatCard icon={X} label="Declined" value={stats?.declined} color="#ef4444" />
        <StatCard icon={Clock} label="Pending" value={stats?.pending} color="#f59e0b" />
      </div>

      {/* SUMMARY CARD */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 mb-6">
        <h3 className="text-[18px] font-semibold text-[#1e293b] mb-4">Response Overview</h3>
        
        <div className="space-y-3">
          {/* Response Rate */}
          <div>
            <div className="flex justify-between mb-2 text-[14px]">
              <span className="text-[#64748b] font-medium">Response Rate</span>
              <strong className="text-[#1e293b] font-semibold">
                {stats?.sent > 0
                  ? (((stats.accepted + stats.declined) / stats.sent) * 100).toFixed(1)
                  : 0}
                %
              </strong>
            </div>
            <div className="h-2.5 bg-[#f1f5f9] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#2563eb] transition-all duration-300"
                style={{
                  width: `${
                    stats?.sent > 0
                      ? ((stats.accepted + stats.declined) / stats.sent) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Acceptance Rate */}
          <div>
            <div className="flex justify-between mb-2 text-[14px]">
              <span className="text-[#64748b] font-medium">Acceptance Rate</span>
              <strong className="text-[#1e293b] font-semibold">
                {stats?.sent > 0 ? ((stats.accepted / stats.sent) * 100).toFixed(1) : 0}%
              </strong>
            </div>
            <div className="h-2.5 bg-[#f1f5f9] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#10b981] transition-all duration-300"
                style={{
                  width: `${stats?.sent > 0 ? (stats.accepted / stats.sent) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Open Rate */}
          {stats?.openRate && (
            <div>
              <div className="flex justify-between mb-2 text-[14px]">
                <span className="text-[#64748b] font-medium">Open Rate</span>
                <strong className="text-[#1e293b] font-semibold">{stats.openRate}%</strong>
              </div>
              <div className="h-2.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#8b5cf6] transition-all duration-300"
                  style={{ width: `${stats.openRate}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* INFO CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoCard
          icon={Mail}
          title="Email Templates"
          description="Create and manage reusable email templates for invitations, reminders, and notifications to save time and maintain consistency."
        />
        <InfoCard
          icon={Send}
          title="Bulk Sending"
          description="Send personalized invitations to multiple recipients at once with automatic tracking and follow-up reminders."
        />
      </div>
    </div>
  );
};

export default EmailManagement;
