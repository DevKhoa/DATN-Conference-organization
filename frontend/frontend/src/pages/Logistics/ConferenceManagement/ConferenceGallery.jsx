import React from "react";
import {
  Calendar,
  MapPin,
  Users,
  UtensilsCrossed,
  Hotel,
  Plane,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../../../ui/Button";

/* ===== BADGE COMPONENT ===== */
const LogisticsBadge = ({ icon: Icon, label, value, status = "neutral" }) => {
  const statusColors = {
    success: "bg-[#10b98115] text-[#10b981] border-[#10b981]",
    warning: "bg-[#f59e0b15] text-[#f59e0b] border-[#f59e0b]",
    danger: "bg-[#ef444415] text-[#ef4444] border-[#ef4444]",
    neutral: "bg-[#2563eb15] text-[#2563eb] border-[#2563eb]",
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${statusColors[status]}`}>
      {Icon && <Icon size={14} />}
      <span className="text-[12px] font-medium">
        {label}: <strong>{value}</strong>
      </span>
    </div>
  );
};

/* ===== CONFERENCE CARD ===== */
const ConferenceCard = ({ conference, onClick }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] overflow-hidden hover:shadow-lg transition-all duration-200 hover:border-[#2563eb]">
      {/* Header Image */}
      <div
        className="h-40 bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] flex items-center justify-center relative"
        style={{
          backgroundImage: conference.image ? `url(${conference.image})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-30" />
        <div className="relative z-10 text-center text-white px-4">
          <h3 className="m-0 text-xl font-bold mb-2">{conference.name}</h3>
          <div className="flex items-center justify-center gap-2 text-[13px]">
            <Calendar size={14} />
            <span>{conference.date}</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          {conference.status === "live" && (
            <div className="flex items-center gap-1 bg-[#ef4444] text-white px-2 py-1 rounded text-[11px] font-semibold">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              ĐANG DIỄN RA
            </div>
          )}
          {conference.status === "upcoming" && (
            <div className="bg-[#10b981] text-white px-2 py-1 rounded text-[11px] font-semibold">
              SẮP DIỄN RA
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Location */}
        <div className="flex items-center gap-2 text-[13px] text-[#64748b] mb-4">
          <MapPin size={14} />
          <span>{conference.location}</span>
        </div>

        {/* Logistics Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <LogisticsBadge
            icon={Users}
            label="Nhân sự"
            value={conference.staffing.value}
            status={conference.staffing.status}
          />
          <LogisticsBadge
            icon={UtensilsCrossed}
            label="Gala"
            value={`${conference.gala.attendees} khách`}
            status="neutral"
          />
          <LogisticsBadge
            icon={Hotel}
            label="Khách sạn"
            value={`${conference.hotels.count} KS`}
            status="neutral"
          />
          <LogisticsBadge
            icon={Plane}
            label="VIP"
            value={conference.vip.value}
            status={conference.vip.status}
          />
        </div>

        {/* Alerts */}
        {conference.alerts && conference.alerts.length > 0 && (
          <div className="mb-4 p-3 bg-[#fef2f2] border border-[#fee2e2] rounded-lg">
            {conference.alerts.map((alert, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[12px] text-[#ef4444]">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{alert}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
        <Button
          icon={ArrowRight}
          variant="primary"
          onClick={() => onClick(conference.id)}
          size="md"
          style={{ width: "100%" }}
        >
          Quản lý vận hành
        </Button>
      </div>
    </div>
  );
};

/* ===== STATS SUMMARY ===== */
const StatsSummary = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <div className="bg-white rounded-xl shadow-sm p-5 border border-[#e2e8f0]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] text-[#64748b]">Tổng Hội nghị</span>
        <Calendar size={18} className="text-[#2563eb]" />
      </div>
      <div className="text-[28px] font-bold text-[#2563eb]">{stats.totalConferences}</div>
      <div className="text-[12px] text-[#10b981] flex items-center gap-1 mt-1">
        <TrendingUp size={12} />
        <span>{stats.liveConferences} đang diễn ra</span>
      </div>
    </div>

    <div className="bg-white rounded-xl shadow-sm p-5 border border-[#e2e8f0]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] text-[#64748b]">Phân công Nhân sự</span>
        <Users size={18} className="text-[#10b981]" />
      </div>
      <div className="text-[28px] font-bold text-[#10b981]">{stats.staffingComplete}%</div>
      <div className="text-[12px] text-[#64748b] mt-1">
        {stats.staffAssigned}/{stats.staffTotal} phiên
      </div>
    </div>

    <div className="bg-white rounded-xl shadow-sm p-5 border border-[#e2e8f0]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] text-[#64748b]">Dịch vụ VIP</span>
        <Plane size={18} className="text-[#f59e0b]" />
      </div>
      <div className="text-[28px] font-bold text-[#f59e0b]">{stats.vipPending}</div>
      <div className="text-[12px] text-[#64748b] mt-1">yêu cầu chưa xử lý</div>
    </div>

    <div className="bg-white rounded-xl shadow-sm p-5 border border-[#e2e8f0]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] text-[#64748b]">Khách sạn Đề xuất</span>
        <Hotel size={18} className="text-[#8b5cf6]" />
      </div>
      <div className="text-[28px] font-bold text-[#8b5cf6]">{stats.hotelsPublished}</div>
      <div className="text-[12px] text-[#64748b] mt-1">
        {stats.hotelsDraft} đang soạn thảo
      </div>
    </div>
  </div>
);

/* ===== MAIN COMPONENT ===== */
const ConferenceGallery = () => {
  const navigate = useNavigate();

  /* ===== MOCK DATA ===== */
  const stats = {
    totalConferences: 8,
    liveConferences: 3,
    staffingComplete: 87,
    staffAssigned: 42,
    staffTotal: 48,
    vipPending: 5,
    hotelsPublished: 12,
    hotelsDraft: 3,
  };

  const conferences = [
    {
      id: "conf-1",
      name: "International AI Summit 2024",
      date: "15-17 Jan 2024",
      location: "Grand Convention Center, Hanoi",
      image: null,
      status: "live",
      staffing: { value: "12/15 phiên", status: "warning" },
      gala: { attendees: 150 },
      hotels: { count: 5 },
      vip: { value: "3/5 đã chốt xe", status: "warning" },
      alerts: ["2 phiên chưa có Session Chair", "Thiếu 3 Kỹ thuật viên"],
    },
    {
      id: "conf-2",
      name: "Medical Research Conference",
      date: "20-22 Jan 2024",
      location: "University Medical Center, HCMC",
      image: null,
      status: "live",
      staffing: { value: "8/10 phiên", status: "success" },
      gala: { attendees: 120 },
      hotels: { count: 3 },
      vip: { value: "2/2 hoàn tất", status: "success" },
      alerts: [],
    },
    {
      id: "conf-3",
      name: "Education Technology Forum",
      date: "25-26 Jan 2024",
      location: "Innovation Hub, Da Nang",
      image: null,
      status: "upcoming",
      staffing: { value: "6/8 phiên", status: "success" },
      gala: { attendees: 80 },
      hotels: { count: 2 },
      vip: { value: "1/1 hoàn tất", status: "success" },
      alerts: [],
    },
    {
      id: "conf-4",
      name: "Blockchain & Fintech Summit",
      date: "1-3 Feb 2024",
      location: "Tech Park Convention Center, Hanoi",
      image: null,
      status: "upcoming",
      staffing: { value: "4/12 phiên", status: "danger" },
      gala: { attendees: 200 },
      hotels: { count: 4 },
      vip: { value: "0/3 chưa xử lý", status: "danger" },
      alerts: ["8 phiên chưa có nhân sự", "Chưa xác nhận địa điểm Gala"],
    },
  ];

  const handleConferenceClick = (conferenceId) => {
    navigate(`/app/logistics/conference/${conferenceId}`);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="m-0 mb-2 text-[28px] font-semibold text-[#1e293b]">
          Quản lý Hội nghị 🎯
        </h2>
        <p className="text-[#64748b] text-sm">
          Tổng quan và điều phối vận hành cho tất cả hội nghị
        </p>
      </div>

      {/* Stats Summary */}
      <StatsSummary stats={stats} />

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button className="px-4 py-2 bg-[#2563eb] text-white rounded-lg text-[14px] font-medium">
          Tất cả ({conferences.length})
        </button>
        <button className="px-4 py-2 bg-white text-[#64748b] border border-[#e2e8f0] rounded-lg text-[14px] font-medium hover:bg-[#f8fafc]">
          Đang diễn ra ({conferences.filter(c => c.status === "live").length})
        </button>
        <button className="px-4 py-2 bg-white text-[#64748b] border border-[#e2e8f0] rounded-lg text-[14px] font-medium hover:bg-[#f8fafc]">
          Sắp diễn ra ({conferences.filter(c => c.status === "upcoming").length})
        </button>
        <button className="px-4 py-2 bg-white text-[#64748b] border border-[#e2e8f0] rounded-lg text-[14px] font-medium hover:bg-[#f8fafc]">
          Cần xử lý ({conferences.filter(c => c.alerts.length > 0).length})
        </button>
      </div>

      {/* Conference Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {conferences.map((conference) => (
          <ConferenceCard
            key={conference.id}
            conference={conference}
            onClick={handleConferenceClick}
          />
        ))}
      </div>
    </div>
  );
};

export default ConferenceGallery;