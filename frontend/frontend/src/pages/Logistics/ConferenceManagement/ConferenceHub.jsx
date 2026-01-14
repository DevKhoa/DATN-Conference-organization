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
import { getConferenceOverview } from "@/services/logistics";
import SessionsTab from "./SessionsTab";
import EventsTab from "./EventsTab";
import HotelsTab from "./HotelsTab";
import VIPTab from "./VIPTab";

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

/* ===== MAIN COMPONENT ===== */
const ConferenceHub = () => {
  const { conferenceId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("sessions");

  /* ===== LOAD CONFERENCE DATA ===== */
  const conferenceData = getConferenceOverview(conferenceId);

  // Nếu không tìm thấy hội nghị
  if (!conferenceData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <h3 className="text-[20px] font-semibold text-[#64748b] mb-2">
          Không tìm thấy hội nghị
        </h3>
        <Button
          icon={ArrowLeft}
          variant="primary"
          onClick={() => navigate("/app/logistics/conference")}
        >
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  const handleBack = () => {
    navigate("/app/logistics/conference");
  };

  return (
    <div>
      {/* Conference Header */}
      <ConferenceHeader conference={conferenceData} onBack={handleBack} />

      {/* Tab Navigation */}
      <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Tab Content */}
      {activeTab === "sessions" && (
        <SessionsTab
          sessions={conferenceData.sessions}
          availableChairs={conferenceData.availableChairs}
          availableTechnicians={conferenceData.availableTechnicians}
        />
      )}
      {activeTab === "events" && <EventsTab events={conferenceData.events} />}
      {activeTab === "hotels" && (
        <HotelsTab hotels={conferenceData.hotels} />
      )}
      {activeTab === "vip" && (
        <VIPTab vipServices={conferenceData.vipServices} />
      )}
    </div>
  );
};

export default ConferenceHub;