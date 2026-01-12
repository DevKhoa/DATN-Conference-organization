import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import TopBar from "./LogisticsTopBar";
import Sidebar from "./LogisticsSidebar";

/* ===== DASHBOARD ===== */
import FinancialDashboard from "../pages/Secretariat/OC/FinancialDashboard";

/* ===== REGISTRATION ===== */
import RegistrationLayout from "../layout/RegistrationLayout";
import RegistrationList from "../pages/Secretariat/Registration/RegistrationList";
import RegistrationSettings from "../pages/Secretariat/Registration/RegistrationSettings";
import CMS from "../pages/Secretariat/Registration/CMS";
import PostEventComm from "../pages/Secretariat/Registration/PostEventComm";

/* ===== SUBMISSION ===== */
import SubmissionLayout from "../layout/SubmissionLayout";

// Review
import PapersList from "../pages/Secretariat/Submission/Review/PapersList";
import ReviewDecisions from "../pages/Secretariat/Submission/Review/ReviewDecisions";

// Finalization
import FinalSubmission from "../pages/Secretariat/Submission/Finalization/FinalSubmission";
import AIProofread from "../pages/Secretariat/Submission/Finalization/AiProofread";
import PrePublishCheck from "../pages/Secretariat/Submission/Finalization/PrePublishCheck";

// Sessions & Awards (academic)
import BestPaperEval from "../pages/Secretariat/Submission/SessionAndAwards/BestPaperEval";

/* ===== SESSIONS ===== */
import SessionsLayout from "./SessionLayout";
import SessionBuilder from "../pages/Secretariat/Sessions/SessionBuilder";

/* ===== SIDEBAR MODULES ===== */
const SIDEBAR_MODULES = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    path: "/app/secretariat/dashboard",
  },
  {
    key: "registration",
    label: "Registration",
    icon: "Users",
    path: "/app/secretariat/registration",
  },
  {
    key: "submission",
    label: "Submission",
    icon: "FileText",
    path: "/app/secretariat/submission",
  },
  {
    key: "sessions",
    label: "Sessions",
    icon: "Calendar",
    path: "/app/secretariat/sessions",
  },
  {
    key: "admin",
    label: "Administration",
    icon: "Settings",
    path: "/app/secretariat/admin",
  },
];

const SecretariatLayout = () => {
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
            <Route path="dashboard" element={<FinancialDashboard />} />

            {/* ================= REGISTRATION ================= */}
            <Route path="registration" element={<RegistrationLayout />}>
              <Route index element={<Navigate to="list" replace />} />
              <Route path="list" element={<RegistrationList />} />
              <Route path="settings" element={<RegistrationSettings />} />
              <Route path="cms" element={<CMS />} />
              <Route path="post-comm" element={<PostEventComm />} />
            </Route>

            {/* ================= SUBMISSION ================= */}
            <Route path="submission" element={<SubmissionLayout />}>
              <Route index element={<Navigate to="review" replace />} />

              {/* Review */}
              <Route path="review">
                <Route index element={<PapersList />} />
                <Route path="papers-list" element={<PapersList />} />
                <Route path="review-decisions" element={<ReviewDecisions />} />
              </Route>

              {/* Finalization */}
              <Route path="finalization">
                <Route index element={<FinalSubmission />} />
                <Route path="final-submission" element={<FinalSubmission />} />
                <Route path="proofread" element={<AIProofread />} />
                <Route path="pre-publish" element={<PrePublishCheck />} />
              </Route>

              {/* Sessions & Awards (Academic) */}
              <Route path="sessions-awards">
                <Route index element={<BestPaperEval />} />
                <Route path="best-paper" element={<BestPaperEval />} />
              </Route>
            </Route>

            {/* ================= SESSIONS ================= */}
            <Route path="sessions" element={<SessionsLayout />}>
              <Route index element={<Navigate to="builder" replace />} />
              <Route path="builder" element={<SessionBuilder />} />
            </Route>

            {/* ================= DEFAULT ================= */}
            <Route path="" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default SecretariatLayout;