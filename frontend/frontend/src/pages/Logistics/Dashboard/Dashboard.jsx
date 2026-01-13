import React, { useState } from "react";
import {
  Users,
  CheckCircle,
  AlertTriangle,
  UtensilsCrossed,
  Plane,
  RefreshCw,
  Clock,
  MapPin,
  UserCheck,
  Bell,
} from "lucide-react";
import Button from "../../../ui/Button";

/* ===== STAT CARD ===== */
const StatCard = ({ icon: Icon, label, value, subtext, color, trend, note }) => (
  <div className="bg-white rounded-xl shadow-sm p-6">
    <div className="flex justify-between items-start mb-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon size={24} color={color} />
      </div>
      {trend && (
        <div
          className={`text-[13px] font-semibold px-2 py-1 rounded ${
            trend === "good" ? "bg-[#10b98115] text-[#10b981]" : "bg-[#ef444415] text-[#ef4444]"
          }`}
        >
          {trend === "good" ? "✓ On Track" : "⚠ Alert"}
        </div>
      )}
    </div>

    <div className="text-[13px] text-[#64748b] mb-1">{label}</div>

    <div className="text-[28px] font-bold text-[#1e293b] mb-1" style={{ color }}>
      {value}
    </div>

    {subtext && <div className="text-[13px] text-[#64748b]">{subtext}</div>}
    {note && (
      <div className="text-[13px] text-[#2563eb] font-medium mt-2">
        {note}
      </div>
    )}
  </div>
);

/* ===== CONFERENCE ROW ===== */
const ConferenceRow = ({ conference, onClick }) => {
  const hasWarning = conference.warnings.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 mb-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="m-0 text-lg font-semibold text-[#1e293b] mb-1">
            {conference.name}
          </h3>
          <div className="flex items-center gap-2 text-[13px] text-[#64748b]">
            <MapPin size={14} />
            <span>{conference.venue}</span>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-[#64748b] mt-1">
            <Clock size={14} />
            <span>{conference.dateRange} - Ngày {conference.currentDay}/{conference.totalDays}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[13px] text-[#64748b] mb-1">Check-in Progress</div>
          <div className="text-lg font-bold text-[#10b981]">
            {conference.checkedIn} / {conference.total}
          </div>
          {conference.checkinChange !== undefined && conference.currentDay > 1 && (
            <div className={`text-[12px] font-medium mt-1 ${
              conference.checkinChange >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'
            }`}>
              {conference.checkinChange >= 0 ? '+' : ''}{conference.checkinChange} so với hôm qua
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-[#f1f5f9] rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-[#10b981] rounded-full transition-all duration-300"
          style={{ width: `${(conference.checkedIn / conference.total) * 100}%` }}
        />
      </div>

      {/* Warnings */}
      {hasWarning && (
        <div className="space-y-2">
          {conference.warnings.map((warning, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-3 bg-[#fef2f2] border border-[#fee2e2] rounded-lg cursor-pointer hover:bg-[#fee2e2] transition-colors"
              onClick={() => onClick(conference.id, warning.type)}
            >
              <AlertTriangle size={16} className="text-[#ef4444] mt-0.5 shrink-0" />
              <span className="text-[13px] text-[#ef4444] font-medium">
                {warning.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ===== VIP ARRIVAL CARD ===== */
const VIPArrivalCard = ({ vip }) => (
  <div className="bg-white rounded-lg border border-[#e2e8f0] p-4 mb-3 hover:border-[#2563eb] transition-colors">
    <div className="flex justify-between items-start mb-2">
      <div>
        <h4 className="m-0 text-[15px] font-semibold text-[#1e293b] mb-1">
          {vip.name}
        </h4>
        <div className="flex items-center gap-2 text-[13px] text-[#64748b]">
          <Plane size={14} />
          <span>{vip.flightNumber}</span>
        </div>
      </div>
      <div
        className={`px-2 py-1 rounded text-[12px] font-medium ${
          vip.transportStatus === "ready"
            ? "bg-[#10b98115] text-[#10b981]"
            : vip.transportStatus === "pending"
            ? "bg-[#f59e0b15] text-[#f59e0b]"
            : "bg-[#ef444415] text-[#ef4444]"
        }`}
      >
        {vip.transportStatus === "ready"
          ? "✓ Ready"
          : vip.transportStatus === "pending"
          ? "⏳ Pending"
          : "❌ Missing"}
      </div>
    </div>

    <div className="flex items-center gap-2 text-[13px]">
      <Clock size={14} className="text-[#64748b]" />
      <span className="text-[#1e293b] font-medium">{vip.arrivalTime}</span>
      <span className="text-[#64748b]">• {vip.hoursUntil} giờ nữa</span>
    </div>
  </div>
);

/* ===== ISSUE LOG CARD ===== */
const IssueLogCard = ({ issue }) => {
  const getIconAndColor = (type) => {
    switch (type) {
      case "schedule":
        return { icon: Clock, color: "#f59e0b" };
      case "vip":
        return { icon: Plane, color: "#ef4444" };
      case "checkin":
        return { icon: UserCheck, color: "#8b5cf6" };
      default:
        return { icon: Bell, color: "#64748b" };
    }
  };

  const { icon: Icon, color } = getIconAndColor(issue.type);

  return (
    <div className="flex items-start gap-3 p-3 bg-[#f8fafc] rounded-lg mb-2 border-l-4" style={{ borderLeftColor: color }}>
      <Icon size={16} color={color} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="m-0 text-[13px] text-[#1e293b]">{issue.message}</p>
        <span className="text-[12px] text-[#64748b]">{issue.time}</span>
      </div>
    </div>
  );
};

/* ===== MAIN DASHBOARD ===== */
const LogisticsDashboard = () => {
  /* ===== MOCK DATA (SAU NÀY THAY API) ===== */
  const todayStats = {
    checkInProgress: { current: 876, total: 1024, percentage: 85.5, changeFromYesterday: 45 },
    staffCoverage: {
      total: { current: 42, total: 48 },
      today: { current: 15, total: 18 },
      percentage: 87.5
    },
    specialMeals: {
      total: { vegetarian: 28, allergies: 15, total: 43 },
      today: { vegetarian: 12, allergies: 6, total: 18 },
    },
  };

  const activeConferences = [
    {
      id: "conf-1",
      name: "International AI Summit 2024",
      venue: "Grand Hall A",
      dateRange: "12-14/01",
      currentDay: 2,
      totalDays: 3,
      checkedIn: 342,
      total: 400,
      checkinChange: 28, // so với ngày hôm qua
      warnings: [
        { type: "staff", message: "2/5 phiên chưa đủ nhân sự (thiếu 3 Kỹ thuật viên)" },
        { type: "chair", message: "Session Chair chưa có mặt cho phiên 14:00" },
      ],
    },
    {
      id: "conf-2",
      name: "Medical Research Conference",
      venue: "Conference Center B",
      dateRange: "13/01",
      currentDay: 1,
      totalDays: 1,
      checkedIn: 298,
      total: 328,
      checkinChange: undefined, // không có vì là ngày đầu tiên
      warnings: [
        { type: "staff", message: "1/4 phiên chưa có Session Chair" },
      ],
    },
    {
      id: "conf-3",
      name: "Education Technology Forum",
      venue: "Innovation Hub C",
      dateRange: "12-13/01",
      currentDay: 2,
      totalDays: 2,
      checkedIn: 236,
      total: 296,
      checkinChange: 17, // so với ngày hôm qua
      warnings: [],
    },
  ];

  const vipArrivals = [
    {
      name: "Prof. Nguyễn Văn A",
      flightNumber: "VN208",
      arrivalTime: "14:30",
      hoursUntil: "2.5",
      transportStatus: "ready",
    },
    {
      name: "Dr. Sarah Johnson",
      flightNumber: "QR975",
      arrivalTime: "16:45",
      hoursUntil: "4.75",
      transportStatus: "pending",
    },
    {
      name: "Prof. Michael Chen",
      flightNumber: "SQ656",
      arrivalTime: "18:20",
      hoursUntil: "6.3",
      transportStatus: "missing",
    },
  ];

  const issueLog = [
    {
      type: "schedule",
      message: "Xung đột lịch trình phát hiện tại International AI Summit - Phòng A1",
      time: "2 phút trước",
    },
    {
      type: "vip",
      message: "Prof. Nguyễn Văn A vừa thay đổi giờ bay từ 13:30 → 14:30",
      time: "15 phút trước",
    },
    {
      type: "checkin",
      message: "Check-in thành công tại quầy số 2 - Medical Research Conference",
      time: "23 phút trước",
    },
    {
      type: "schedule",
      message: "Cập nhật: Phòng họp B2 chuyển từ 100 → 120 chỗ ngồi",
      time: "1 giờ trước",
    },
  ];

  /* ===== HANDLERS ===== */
  const handleConferenceWarningClick = (conferenceId, warningType) => {
    alert(`Chuyển đến giao diện phân công nhân sự của hội nghị: ${conferenceId} (${warningType})`);
    // TODO: Implement navigation to staff assignment page
  };

  return (
    <div>
      {/* ===== HEADER ===== */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="m-0 mb-2 text-[28px] font-semibold text-[#1e293b]">
            Dashboard - Các hội nghị đang diễn ra 📋
          </h2>
          <p className="text-[#64748b] text-sm">
            Tổng quan thời gian thực về các hội nghị đang diễn ra
          </p>
        </div>

        <Button icon={RefreshCw} variant="secondary">
          Refresh Data
        </Button>
      </div>

      {/* ===== A. CHỈ SỐ TỔNG QUÁT (REAL-TIME METRICS) ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          icon={UserCheck}
          label="Tiến độ Check-in (Tổng hợp)"
          value={`${todayStats.checkInProgress.current} / ${todayStats.checkInProgress.total}`}
          subtext={`${todayStats.checkInProgress.percentage}% đã check-in`}
          color="#10b981"
          trend="good"
          note={`+${todayStats.checkInProgress.changeFromYesterday} so với hôm qua`}
        />

        <StatCard
          icon={Users}
          label="Độ phủ Nhân sự (Tất cả hội nghị)"
          value={`${todayStats.staffCoverage.total.current} / ${todayStats.staffCoverage.total.total}`}
          subtext={`${todayStats.staffCoverage.percentage}% phiên có đủ nhân sự`}
          color="#f59e0b"
          trend="alert"
          note={`${todayStats.staffCoverage.today.current}/${todayStats.staffCoverage.today.total} cho hôm nay`}
        />

        <StatCard
          icon={UtensilsCrossed}
          label="Yêu cầu Dịch vụ (Tất cả hội nghị)"
          value={todayStats.specialMeals.total.total}
          subtext={`${todayStats.specialMeals.total.vegetarian} chay • ${todayStats.specialMeals.total.allergies} dị ứng`}
          color="#2563eb"
          note={`${todayStats.specialMeals.today.total} cho hôm nay (${todayStats.specialMeals.today.vegetarian} chay, ${todayStats.specialMeals.today.allergies} dị ứng)`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN - 2/3 width */}
        <div className="lg:col-span-2">
          {/* ===== B. DANH SÁCH HỘI NGHỊ ĐANG DIỄN RA ===== */}
          <div className="mb-6">
            <h3 className="m-0 mb-4 text-lg font-semibold text-[#1e293b]">
              Hội nghị đang diễn ra ({activeConferences.length})
            </h3>

            {activeConferences.map((conference) => (
              <ConferenceRow
                key={conference.id}
                conference={conference}
                onClick={handleConferenceWarningClick}
              />
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN - 1/3 width */}
        <div>
          {/* Text spacer để VIP Arrivals ngang với card hội nghị đầu tiên */}
          <h3 className="m-0 mb-4 text-lg font-semibold text-transparent select-none">
            &nbsp;
          </h3>

          {/* ===== C. DÒNG THỜI GIAN VIP ===== */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="m-0 text-lg font-semibold text-[#1e293b]">
                VIP Arrivals (6h tới)
              </h3>
              <Plane size={20} className="text-[#2563eb]" />
            </div>

            <div>
              {vipArrivals.map((vip, idx) => (
                <VIPArrivalCard key={idx} vip={vip} />
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-[#e2e8f0]">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#64748b]">Tổng số VIP hôm nay:</span>
                <span className="font-semibold text-[#1e293b]">{vipArrivals.length} người</span>
              </div>
            </div>
          </div>

          {/* ===== E. NHẬT KÝ SỰ CỐ (ISSUE LOGS) ===== */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="m-0 text-lg font-semibold text-[#1e293b]">
                Nhật ký sự cố & Thông báo
              </h3>
              <span className="text-[13px] text-[#64748b]">
                {issueLog.length} thông báo mới
              </span>
            </div>

            <div className="max-h-100 overflow-y-auto">
              {issueLog.map((issue, idx) => (
                <IssueLogCard key={idx} issue={issue} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogisticsDashboard;