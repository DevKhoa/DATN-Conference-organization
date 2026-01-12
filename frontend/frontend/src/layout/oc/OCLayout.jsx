import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import OCTopbar from "./OCTopbar";
import OCSidebar from "./OCSidebar";

/* OC pages */
import FinancialDashboard from "../../pages/OC/FinancialDashboard";
import BudgetApproval from "../../pages/OC/BudgetApproval";
import ConferenceSetup from "../../pages/OC/ConferenceSetup";
import EmailManagement from "../../pages/OC/EmailManagement";
import AwardsAnnouncement from "../../pages/OC/AwardsAnnouncement";

const OCLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <OCTopbar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        <OCSidebar sidebarOpen={sidebarOpen} />

        <main className="flex-1 px-8 py-6 overflow-y-auto">
          <Routes>
            <Route path="" element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<FinancialDashboard />} />
            <Route path="budget-approval" element={<BudgetApproval />} />
            <Route path="conference-setup" element={<ConferenceSetup />} />
            <Route path="email-management" element={<EmailManagement />} />
            <Route path="awards" element={<AwardsAnnouncement />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default OCLayout;
