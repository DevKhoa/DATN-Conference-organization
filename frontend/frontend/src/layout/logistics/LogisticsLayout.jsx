import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import TopBar from "./LogisticsTopBar";
import Sidebar from "./LogisticsSidebar";

/* ===== DASHBOARD ===== */
import LogisticsDashboard from "../../pages/Logistics/Dashboard/Dashboard";

/* ===== CONFERENCE MANAGEMENT ===== */
import ConferenceGallery from "../../pages/Logistics/ConferenceManagement/ConferenceGallery";
import ConferenceHub from "../../pages/Logistics/ConferenceManagement/ConferenceHub";

/* ===== SIDEBAR MODULES ===== */
const SIDEBAR_MODULES = [
  {
    key: "dashboard",
    label: "Hôm nay",
    icon: "LayoutDashboard",
    path: "/app/logistics/dashboard",
  },
  {
    key: "conference",
    label: "Quản lý Hội nghị",
    icon: "Calendar",
    path: "/app/logistics/conference",
  },
];

const LogisticsLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc]">
      {/* ===== TOP BAR ===== */}
      <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex flex-1 overflow-hidden">
        {/* ===== SIDEBAR ===== */}
        <Sidebar sidebarOpen={sidebarOpen} modules={SIDEBAR_MODULES} />

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 px-8 py-6 overflow-y-auto">
          <Routes>
            {/* ================= DASHBOARD ================= */}
            <Route path="dashboard" element={<LogisticsDashboard />} />

            {/* ================= CONFERENCE MANAGEMENT ================= */}
            <Route path="conference" element={<ConferenceGallery />} />
            <Route path="conference/:conferenceId" element={<ConferenceHub />} />

            {/* ================= DEFAULT ================= */}
            <Route path="" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default LogisticsLayout;