import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  UtensilsCrossed,
  Hotel,
  Plane,
  Calendar,
  MapPin,
  Clock,
} from "lucide-react";
import Button from "../../../ui/Button";

/* ===== TAB NAVIGATION ===== */
const TabNav = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "sessions", label: "Phiên & Nhân sự", icon: Users },
    { id: "events", label: "Dịch vụ & Tiệc", icon: UtensilsCrossed },
    { id: "hotels", label: "Khách sạn", icon: Hotel },
    { id: "vip", label: "Dịch vụ VIP", icon: Plane },
  ];

  return (
    <div className="flex gap-2 border-b border-[#e2e8f0] mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-[14px] font-medium border-b-2 transition-colors ${
              isActive
                ? "border-[#2563eb] text-[#2563eb]"
                : "border-transparent text-[#64748b] hover:text-[#1e293b]"
            }`}
          >
            <Icon size={18} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

/* ===== CONFERENCE HEADER ===== */
const ConferenceHeader = ({ conference, onBack }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#e2e8f0]">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <Button
          icon={ArrowLeft}
          variant="ghost"
          onClick={onBack}
          size="sm"
          style={{ marginBottom: "12px" }}
        >
          Quay lại danh sách
        </Button>

        <h2 className="m-0 mb-3 text-[28px] font-semibold text-[#1e293b]">
          {conference.name}
        </h2>

        <div className="flex flex-wrap gap-4 text-[14px] text-[#64748b]">
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            <span>{conference.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={16} />
            <span>{conference.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} />
            <span>Còn {conference.daysUntil} ngày</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="bg-[#10b98115] text-[#10b981] px-3 py-1.5 rounded-lg text-[13px] font-semibold">
          ✓ ĐANG DIỄN RA
        </div>
      </div>
    </div>
  </div>
);

/* ===== TAB CONTENT PLACEHOLDERS ===== */
const SessionsTab = () => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e2e8f0]">
    <h3 className="m-0 mb-4 text-lg font-semibold text-[#1e293b]">
      Quản lý Phiên & Nhân sự
    </h3>
    <p className="text-[#64748b] text-[14px]">
      📋 Bảng Master Schedule với dropdown phân công Chair & Kỹ thuật viên
      <br />
      🚨 Logic gray-out nhân sự bận, cảnh báo xung đột lịch trình
      <br />
      💾 Nút "Lưu phân công" → Tự động gửi thông báo
    </p>
    <div className="mt-4 p-4 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
      <p className="text-[13px] text-[#64748b] m-0">Coming soon...</p>
    </div>
  </div>
);

const EventsTab = () => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e2e8f0]">
    <h3 className="m-0 mb-4 text-lg font-semibold text-[#1e293b]">
      Quản lý Dịch vụ & Tiệc (Gala Dinner, Networking...)
    </h3>
    <p className="text-[#64748b] text-[14px]">
      🍽️ Card/Tabs chuyển đổi giữa các phiên phụ
      <br />
      📊 Dashboard: Tổng khách, suất ăn chay, dị ứng
      <br />
      👥 Attendee Table với ghi chú đặc biệt & trạng thái Check-in
    </p>
    <div className="mt-4 p-4 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
      <p className="text-[13px] text-[#64748b] m-0">Coming soon...</p>
    </div>
  </div>
);

const HotelsTab = () => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e2e8f0]">
    <h3 className="m-0 mb-4 text-lg font-semibold text-[#1e293b]">
      Quản lý Danh sách Khách sạn (CMS & Maps)
    </h3>
    <p className="text-[#64748b] text-[14px]">
      🏨 Gallery khách sạn đề xuất (Công bố / Nháp)
      <br />
      ✏️ Form nhập: Tên, website, mã giảm giá, room blocks
      <br />
      🗺️ Tích hợp Google Maps tự động ghim vị trí
    </p>
    <div className="mt-4 p-4 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
      <p className="text-[13px] text-[#64748b] m-0">Coming soon...</p>
    </div>
  </div>
);

const VIPTab = () => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e2e8f0]">
    <h3 className="m-0 mb-4 text-lg font-semibold text-[#1e293b]">
      Dịch vụ Đưa đón & Lưu trú VIP
    </h3>
    <p className="text-[#64748b] text-[14px]">
      ✈️ Tracking Board cho từng khách VIP
      <br />
      📝 Chi tiết: Số hiệu chuyến bay, giờ đến/đi, xe đưa đón
      <br />
      🔄 Quản lý trạng thái: Mới → Đã liên hệ → Đã xác nhận
      <br />
      ⚡ Xử lý thay đổi lịch trình bay đột xuất
    </p>
    <div className="mt-4 p-4 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
      <p className="text-[13px] text-[#64748b] m-0">Coming soon...</p>
    </div>
  </div>
);

/* ===== MAIN COMPONENT ===== */
const ConferenceHub = () => {
  const { conferenceId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("sessions");

  /* ===== MOCK DATA ===== */
  const conference = {
    id: conferenceId,
    name: "International AI Summit 2024",
    date: "15-17 Jan 2024",
    location: "Grand Convention Center, Hanoi",
    daysUntil: 3,
    status: "live",
  };

  const handleBack = () => {
    navigate("/app/logistics/conference");
  };

  return (
    <div>
      {/* Conference Header */}
      <ConferenceHeader conference={conference} onBack={handleBack} />

      {/* Tab Navigation */}
      <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Tab Content */}
      {activeTab === "sessions" && <SessionsTab />}
      {activeTab === "events" && <EventsTab />}
      {activeTab === "hotels" && <HotelsTab />}
      {activeTab === "vip" && <VIPTab />}
    </div>
  );
};

export default ConferenceHub;