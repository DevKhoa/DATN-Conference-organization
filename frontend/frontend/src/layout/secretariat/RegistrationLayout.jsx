import React from "react";
import { NavLink, Outlet, Navigate } from "react-router-dom";
import { Users, Settings, Globe, Send } from "lucide-react";

const TABS = [
  { label: "Registrations", path: "list", icon: Users },
  { label: "Settings", path: "settings", icon: Settings },
  { label: "CMS", path: "cms", icon: Globe },
  { label: "Post-Event Comm", path: "post-comm", icon: Send },
];

const RegistrationLayout = () => {
  return (
    <div>
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">
          Registration Management
        </h1>
        <p className="text-sm text-slate-500">
          Manage participants, tickets, and communications
        </p>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-white border border-b-0 border-slate-200 text-blue-600"
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <Icon size={16} />
              {tab.label}
            </NavLink>
          );
        })}
      </div>

      {/* CONTENT */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <Outlet />
      </div>
    </div>
  );
};

export default RegistrationLayout;
