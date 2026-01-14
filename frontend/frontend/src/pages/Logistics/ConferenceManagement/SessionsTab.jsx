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
  allSessions,
  availableChairs,
  availableTechnicians,
  onUpdateSession,
  onSaveSession,
}) => {
  const [selectedChair, setSelectedChair] = useState(session.chair?.id || "");
  const [selectedTech, setSelectedTech] = useState(
    session.technician?.id || ""
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [originalChair] = useState(session.chair?.id || "");
  const [originalTech] = useState(session.technician?.id || "");

  // Helper function để detect conflicting staff
  const getConflictingStaff = (staffType) => {
    const conflictedIds = new Set();

    allSessions.forEach((s) => {
      // Skip current session
      if (s.id === session.id) return;

      // Check if same date and time
      if (s.date === session.date && s.time === session.time) {
        if (staffType === "chair" && s.chair) {
          conflictedIds.add(s.chair.id);
        }
        if (staffType === "technician" && s.technician) {
          conflictedIds.add(s.technician.id);
        }
      }
    });

    return conflictedIds;
  };

  const handleChairChange = (e) => {
    const chairId = e.target.value;
    setSelectedChair(chairId);
    const chair = availableChairs.find((c) => c.id === chairId);
    onUpdateSession(session.id, "chair", chair || null);

    // Check if has changes
    const techChanged = selectedTech !== originalTech;
    setHasChanges(chairId !== originalChair || techChanged);
  };

  const handleTechChange = (e) => {
    const techId = e.target.value;
    setSelectedTech(techId);
    const tech = availableTechnicians.find((t) => t.id === techId);
    onUpdateSession(session.id, "technician", tech || null);

    // Check if has changes
    const chairChanged = selectedChair !== originalChair;
    setHasChanges(techId !== originalTech || chairChanged);
  };

  const handleReset = () => {
    setSelectedChair(originalChair);
    setSelectedTech(originalTech);
    const chair = availableChairs.find((c) => c.id === originalChair);
    const tech = availableTechnicians.find((t) => t.id === originalTech);
    onUpdateSession(session.id, "chair", chair || null);
    onUpdateSession(session.id, "technician", tech || null);
    setHasChanges(false);
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

  // Get conflicted staff IDs
  const conflictingChairs = getConflictingStaff("chair");
  const conflictingTechs = getConflictingStaff("technician");

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
            {availableChairs.map((chair) => {
              const isConflicted = conflictingChairs.has(chair.id);
              return (
                <option
                  key={chair.id}
                  value={chair.id}
                  disabled={isConflicted}
                >
                  {chair.name} ({chair.expertise})
                  {isConflicted ? " (Đã bận)" : ""}
                </option>
              );
            })}
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
            {availableTechnicians.map((tech) => {
              const isConflicted = conflictingTechs.has(tech.id);
              return (
                <option key={tech.id} value={tech.id} disabled={isConflicted}>
                  {tech.name}
                  {isConflicted ? " (Đã bận)" : ""}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Action Buttons - chỉ hiện khi có thay đổi */}
      {hasChanges && (
        <div className="mt-3 flex gap-2 justify-end">
          <Button
            icon={RefreshCw}
            variant="ghost"
            onClick={handleReset}
            size="sm"
          >
            Hủy
          </Button>
          <Button
            icon={Save}
            variant="primary"
            onClick={() => onSaveSession(session.id)}
            size="sm"
          >
            Lưu
          </Button>
        </div>
      )}
    </div>
  );
};

/* ===== MAIN TAB COMPONENT ===== */
const SessionsTab = ({ sessions, availableChairs, availableTechnicians }) => {
  const [sessionData, setSessionData] = useState(sessions);

  const handleUpdateSession = (sessionId, field, value) => {
    setSessionData((prev) =>
      prev.map((session) => {
        if (session.id === sessionId) {
          const updated = { ...session, [field]: value };

          // Cập nhật status
          const chairAssigned = field === "chair" ? value : updated.chair;
          const techAssigned =
            field === "technician" ? value : updated.technician;

          updated.status =
            chairAssigned && techAssigned ? "assigned" : "pending";

          return updated;
        }
        return session;
      })
    );
  };

  const handleSaveSession = (sessionId) => {
    const session = sessionData.find((s) => s.id === sessionId);

    // TODO: Gọi API để lưu phân công cho session này
    console.log("Saving assignment for session:", sessionId, session);
    alert(`✅ Đã lưu phân công cho phiên "${session.title}"!`);
  };

  // Thống kê
  const stats = {
    total: sessionData.length,
    assigned: sessionData.filter((s) => s.status === "assigned").length,
    pending: sessionData.filter((s) => s.status === "pending").length,
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e2e8f0]">
      {/* Header với Stats */}
      <div className="mb-6">
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
        </div>
      </div>

      {/* Session List */}
      <div className="space-y-3">
        {sessionData.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            allSessions={sessionData}
            availableChairs={availableChairs}
            availableTechnicians={availableTechnicians}
            onUpdateSession={handleUpdateSession}
            onSaveSession={handleSaveSession}
          />
        ))}
      </div>

      {/* Footer Note */}
      <div className="mt-6 p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
        <p className="text-[13px] text-[#64748b] m-0">
          💡 <strong>Lưu ý:</strong> Hệ thống tự động phát hiện xung đột lịch
          trình và vô hiệu hóa nhân sự đã bận trong danh sách lựa chọn. Mỗi
          phiên có nút lưu riêng, chỉ xuất hiện khi có thay đổi. Sau khi lưu,
          email thông báo sẽ được gửi tự động đến Session Chair và Kỹ thuật
          viên.
        </p>
      </div>
    </div>
  );
};

export default SessionsTab;