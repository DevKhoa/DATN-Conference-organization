import React, { useEffect, useState } from "react";
import { Save, Send, Loader, AlertCircle, Calendar, MapPin, Clock } from "lucide-react";
import Button from "../../ui/Button";
import { useConference } from "../../hooks/oc/useConference";

/* ===== INPUT FIELD ===== */
const InputField = ({ label, icon: Icon, error, ...props }) => (
  <div>
    <label className="block text-[13px] font-medium text-[#475569] mb-1.5">
      {label}
    </label>
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <Icon size={18} className="text-[#94a3b8]" />
        </div>
      )}
      <input
        className={`w-full ${
          Icon ? "pl-10" : "pl-4"
        } pr-4 py-2.5 border ${
          error ? "border-[#fca5a5]" : "border-[#e2e8f0]"
        } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent text-[14px] text-[#334155] transition-all`}
        {...props}
      />
    </div>
    {error && <p className="text-[12px] text-[#dc2626] mt-1">{error}</p>}
  </div>
);

/* ===== LOADING STATE ===== */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-[#2563eb]" size={40} />
    <div className="text-[14px] text-[#64748b] mt-4">Loading conference data...</div>
  </div>
);

/* ===== ERROR STATE ===== */
const ErrorState = ({ error, onRetry }) => (
  <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-xl p-6">
    <div className="flex items-center gap-2 text-[#991b1b] mb-2">
      <AlertCircle size={20} />
      <strong className="text-[16px] font-semibold">Error loading conference</strong>
    </div>
    <p className="text-[14px] text-[#dc2626] mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>
      Try Again
    </Button>
  </div>
);

/* ===== STATUS BADGE ===== */
const StatusBadge = ({ status }) => {
  const config = {
    DRAFT: { bg: "bg-[#fef3c7]", text: "text-[#d97706]", label: "Draft" },
    PUBLISHED: { bg: "bg-[#d1fae5]", text: "text-[#059669]", label: "Published" },
    CLOSED: { bg: "bg-[#fee2e2]", text: "text-[#dc2626]", label: "Closed" },
  };

  const style = config[status] || config.DRAFT;

  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
};

/* ===== INFO BOX ===== */
const InfoBox = ({ title, children }) => (
  <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-lg p-4">
    <h4 className="text-[14px] font-semibold text-[#1e40af] mb-2">{title}</h4>
    <p className="text-[13px] text-[#64748b] leading-relaxed">{children}</p>
  </div>
);

/* ===== MAIN COMPONENT ===== */
const ConferenceSetup = () => {
  const conferenceId = 1;
  const { conference, update, loading, error, refetch } = useConference(conferenceId);

  const [form, setForm] = useState({
    name: "",
    venue: "",
    startDate: "",
    duration: "",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (conference) {
      setForm({
        name: conference.name || "",
        venue: conference.venue || "",
        startDate: conference.startDate || "",
        duration: conference.duration || "",
      });
    }
  }, [conference]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await update({
      name: form.name,
      venue: form.venue,
      startDate: form.startDate,
      duration: form.duration,
    });

    if (result?.success) {
      alert("✅ Conference details saved successfully!");
    } else {
      alert("❌ Failed to save changes");
    }
    setSaving(false);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-[28px] font-semibold text-[#1e293b] leading-tight">
              Conference Setup 🎪
            </h1>
            {conference?.status && <StatusBadge status={conference.status} />}
          </div>
          <p className="text-[14px] text-[#64748b] leading-relaxed">
            Configure conference details and schedule
          </p>
        </div>
      </div>

      {/* BASIC INFORMATION */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 mb-6">
        <h3 className="text-[18px] font-semibold text-[#1e293b] mb-4">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Conference Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g., ICAI 2026"
            icon={Calendar}
          />

          <InputField
            label="Venue"
            name="venue"
            value={form.venue}
            onChange={handleChange}
            placeholder="e.g., Grand Convention Center"
            icon={MapPin}
          />

          <InputField
            label="Start Date"
            name="startDate"
            type="date"
            value={form.startDate}
            onChange={handleChange}
            icon={Calendar}
          />

          <InputField
            label="Duration (days)"
            name="duration"
            type="number"
            value={form.duration}
            onChange={handleChange}
            placeholder="e.g., 3"
            icon={Clock}
            min="1"
          />
        </div>

        <div className="mt-6 pt-6 border-t border-[#e2e8f0] flex justify-between items-center">
          <InfoBox title="💡 Quick Tip">
            Save your changes as draft to continue editing later. Submit for approval when ready.
          </InfoBox>

          <Button icon={Save} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Draft"}
          </Button>
        </div>
      </div>

      {/* TIMELINE EDITOR */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-6">
        <h3 className="text-[18px] font-semibold text-[#1e293b] mb-4">Timeline & Schedule</h3>

        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-8 text-center">
          <Calendar size={48} className="text-[#cbd5e1] mx-auto mb-4" />
          <h4 className="text-[16px] font-semibold text-[#475569] mb-2">
            Timeline Editor Coming Soon
          </h4>
          <p className="text-[14px] text-[#94a3b8] mb-4 max-w-md mx-auto">
            Schedule editor with conflict detection and automatic suggestions will be available here.
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <Button icon={Send} variant="primary" disabled>
            Submit for Approval
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConferenceSetup;
