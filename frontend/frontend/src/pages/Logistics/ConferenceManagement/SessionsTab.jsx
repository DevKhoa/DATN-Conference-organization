import React, { useState } from "react";
import {
  User,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Calendar,
  Save,
  RefreshCw,
} from "lucide-react";
import Button from "../../../ui/Button";

/* ===== SESSION ROW COMPONENT ===== */
const SessionRow = ({
  session,
  availableChairs,
  availableTechnicians,
  onUpdateSession,
}) => {
  const [selectedChair, setSelectedChair] = useState(session.chair?.id || "");
  const [selectedTech, setSelectedTech] = useState(
    session.technician?.id || ""
  );

  const handleChairChange = (e) => {
    const chairId = e.target.value;
    setSelectedChair(chairId);
    const chair = availableChairs.find((c) => c.id === chairId);
    onUpdateSession(session.id, "chair", chair || null);
  };

  const handleTechChange = (e) => {
    const techId = e.target.value;
    setSelectedTech(techId);
    const tech = availableTechnicians.find((t) => t.id === techId);
    onUpdateSession(session.id, "technician", tech || null);
  };

  // Styling dựa trên trạng thái
  const getStatusStyle = () => {
    if (session.status === "assigned") return "bg-[#10b98115] border-[#10b981]";
    if (session.status === "conflict") return "bg-[#ef444415] border-[#ef4444]";
    return "bg-[#f59e0b15] border-[#f59e0b]";
  };

  const getStatusIcon = () => {
    if (session.status === "assigned")
      return <CheckCircle size={16} className="text-[#10b981]" />;
    if (session.status === "conflict")
      return <AlertTriangle size={16} className="text-[#ef4444]" />;
    return <Clock size={16} className="text-[#f59e0b]" />;
  };

  return (
    <div
      className={`p-4 border rounded-lg ${getStatusStyle()} hover:shadow-md transition-all`}
    >
      {/* Header: Session Info */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {getStatusIcon()}
            <h4 className="m-0 text-[16px] font-semibold text-[#1e293b]">
              {session.title}
            </h4>
          </div>
          <div className="flex flex-wrap gap-3 text-[13px] text-[#64748b]">
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>{session.date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{session.time}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={14} />
              <span>{session.room}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Session Chair */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-medium text-[#64748b] mb-2">
            <User size={14} />
            Session Chair
          </label>
          <select
            value={selectedChair}
            onChange={handleChairChange}
            className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
          >
            <option value="">-- Chưa phân công --</option>
            {availableChairs.map((chair) => (
              <option key={chair.id} value={chair.id}>
                {chair.name} ({chair.expertise})
              </option>
            ))}
          </select>
        </div>

        {/* Technician */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-medium text-[#64748b] mb-2">
            <Wrench size={14} />
            Kỹ thuật viên
          </label>
          <select
            value={selectedTech}
            onChange={handleTechChange}
            className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
          >
            <option value="">-- Chưa phân công --</option>
            {availableTechnicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Conflict Warning */}
      {session.status === "conflict" && (
        <div className="mt-3 p-2 bg-[#fef2f2] border border-[#fee2e2] rounded text-[12px] text-[#ef4444] flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            ⚠️ Nhân sự này đã được phân công vào phiên khác cùng thời gian!
          </span>
        </div>
      )}
    </div>
  );
};

/* ===== MAIN TAB COMPONENT ===== */
const SessionsTab = ({ sessions, availableChairs, availableTechnicians }) => {
  const [sessionData, setSessionData] = useState(sessions);
  const [hasChanges, setHasChanges] = useState(false);

  const handleUpdateSession = (sessionId, field, value) => {
    setSessionData((prev) =>
      prev.map((session) => {
        if (session.id === sessionId) {
          const updated = { ...session, [field]: value };

          // Kiểm tra xung đột lịch trình
          const hasConflict = sessionData.some(
            (s) =>
              s.id !== sessionId &&
              s.date === updated.date &&
              s.time === updated.time &&
              ((field === "chair" &&
                value &&
                s.chair?.id === value.id) ||
                (field === "technician" &&
                  value &&
                  s.technician?.id === value.id))
          );

          // Cập nhật status
          const chairAssigned = field === "chair" ? value : updated.chair;
          const techAssigned =
            field === "technician" ? value : updated.technician;

          updated.status = hasConflict
            ? "conflict"
            : chairAssigned && techAssigned
            ? "assigned"
            : "pending";

          return updated;
        }
        return session;
      })
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    // TODO: Gọi API để lưu phân công
    console.log("Saving assignments:", sessionData);
    alert("✅ Đã lưu phân công! Hệ thống sẽ gửi email thông báo tự động.");
    setHasChanges(false);
  };

  const handleReset = () => {
    setSessionData(sessions);
    setHasChanges(false);
  };

  // Thống kê
  const stats = {
    total: sessionData.length,
    assigned: sessionData.filter((s) => s.status === "assigned").length,
    pending: sessionData.filter((s) => s.status === "pending").length,
    conflict: sessionData.filter((s) => s.status === "conflict").length,
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e2e8f0]">
      {/* Header với Stats */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="m-0 mb-2 text-[20px] font-semibold text-[#1e293b]">
            📋 Quản lý Phiên & Phân công Nhân sự
          </h3>
          <div className="flex gap-3 text-[13px]">
            <span className="text-[#10b981] font-medium">
              ✓ {stats.assigned} hoàn tất
            </span>
            <span className="text-[#f59e0b] font-medium">
              ⏳ {stats.pending} chưa phân công
            </span>
            <span className="text-[#ef4444] font-medium">
              ⚠️ {stats.conflict} xung đột
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {hasChanges && (
            <Button
              icon={RefreshCw}
              variant="ghost"
              onClick={handleReset}
              size="sm"
            >
              Hủy thay đổi
            </Button>
          )}
          <Button
            icon={Save}
            variant="primary"
            onClick={handleSave}
            size="sm"
            disabled={!hasChanges}
          >
            Lưu phân công
          </Button>
        </div>
      </div>

      {/* Session List */}
      <div className="space-y-3">
        {sessionData.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            availableChairs={availableChairs}
            availableTechnicians={availableTechnicians}
            onUpdateSession={handleUpdateSession}
          />
        ))}
      </div>

      {/* Footer Note */}
      <div className="mt-6 p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
        <p className="text-[13px] text-[#64748b] m-0">
          💡 <strong>Lưu ý:</strong> Hệ thống tự động kiểm tra xung đột lịch
          trình và gray-out nhân sự đã bận. Sau khi lưu, email thông báo sẽ
          được gửi tự động đến Session Chair và Kỹ thuật viên.
        </p>
      </div>
    </div>
  );
};

export default SessionsTab;