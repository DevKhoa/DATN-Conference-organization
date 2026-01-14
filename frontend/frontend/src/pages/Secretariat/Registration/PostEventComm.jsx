import React, { useState, useEffect } from "react";
import {
  Send,
  FileText,
  ExternalLink,
  Loader,
  AlertCircle,
  Users,
  Clock,
} from "lucide-react";
import { useCMS } from "../../../hooks/secretariat/useCMS";
import Button from "../../../ui/Button"

/* ===== LOADING STATE ===== */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-blue-600" size={40} />
    <div className="text-[14px] text-slate-600 mt-4">
      Loading communication settings...
    </div>
  </div>
);

/* ===== ERROR STATE ===== */
const ErrorState = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-[#fca5a5] rounded-xl p-6">
    <div className="flex items-center gap-2 text-[#991b1b] mb-2">
      <AlertCircle size={20} />
      <strong className="text-[16px] font-semibold">
        Error loading settings
      </strong>
    </div>
    <p className="text-[14px] text-red-700 mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>
      Try Again
    </Button>
  </div>
);

/* ===== INFO BOX ===== */
const InfoBox = ({ children }) => (
  <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-lg p-4">
    <p className="text-[13px] text-[#1e40af] leading-relaxed">{children}</p>
  </div>
);

/* ===== STAT CARD ===== */
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-4">
    <div className="flex items-center gap-3 mb-2">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon size={20} color={color} />
      </div>
      <div>
        <div className="text-[13px] text-slate-600 font-medium">{label}</div>
        <div className="text-[20px] font-bold text-slate-900">{value}</div>
      </div>
    </div>
  </div>
);

/* ===== MAIN COMPONENT ===== */
const PostEventComm = () => {
  const {
    postEventStats,
    loading,
    error,
    fetchPostEventStats,
    sendPostEventEmail,
  } = useCMS();

  const [subject, setSubject] = useState(
    "Thank You for Attending ICAI 2026!"
  );
  const [content, setContent] = useState(
    `Dear [Name],\n\nThank you for participating in ICAI 2026.\n\nBest regards,\nOrganizing Committee`
  );
  const [schedule, setSchedule] = useState("immediate");
  const [sending, setSending] = useState(false);

  /* ===== FETCH STATS ON MOUNT ===== */
  useEffect(() => {
    fetchPostEventStats();
  }, [fetchPostEventStats]);

  const handleSend = async () => {
    setSending(true);

    const result = await sendPostEventEmail({
      subject,
      content,
      schedule,
    });

    setSending(false);

    if (result.success) {
      alert("✅ Emails scheduled successfully!");
      fetchPostEventStats();
    } else {
      alert(`❌ Failed to send email: ${result.error}`);
    }
  };

  if (loading && !postEventStats) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchPostEventStats} />;

  return (
    <div>
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold text-slate-900 mb-2">
          Post-Event Communication 📢
        </h1>
        <p className="text-[14px] text-slate-600">
          Send thank-you emails, proceedings links, and feedback forms
        </p>
      </div>

      {/* STATS */}
      {postEventStats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={Users}
            label="Attendees"
            value={postEventStats.attendees}
            color="#2563eb"
          />
          <StatCard
            icon={Users}
            label="Speakers"
            value={postEventStats.speakers}
            color="#10b981"
          />
          <StatCard
            icon={Users}
            label="Sponsors"
            value={postEventStats.sponsors}
            color="#f59e0b"
          />
        </div>
      )}

      {/* EMAIL COMPOSER */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 mb-6">
        <h3 className="text-[18px] font-semibold text-slate-900 mb-4">
          Compose Thank You Email
        </h3>

        <div className="mb-4">
          <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
            Subject
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-2.5 border border-[#e2e8f0] rounded-lg text-[14px]"
          />
        </div>

        <div className="flex gap-3 mb-4">
          <Button icon={FileText} variant="secondary" size="sm">
            Attach Proceedings
          </Button>
          <Button icon={ExternalLink} variant="secondary" size="sm">
            Add Feedback Form
          </Button>
        </div>

        <div className="mb-4">
          <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
            Email Content
          </label>
          <textarea
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 border border-[#e2e8f0] rounded-lg text-[14px]"
          />
        </div>

        <div className="border-t border-[#e2e8f0] pt-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-slate-600" />
            <select
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px]"
            >
              <option value="immediate">Send Immediately</option>
              <option value="tomorrow">Schedule for Tomorrow 9:00 AM</option>
              <option value="next_week">Schedule for Next Week</option>
            </select>
          </div>

          <Button icon={Send} onClick={handleSend} disabled={sending}>
            {sending ? "Sending..." : "Send Email"}
          </Button>
        </div>
      </div>

      <InfoBox>
        💡 <strong>Tip:</strong> Emails are personalized automatically using
        merge tags like [Name].
      </InfoBox>
    </div>
  );
};

export default PostEventComm;