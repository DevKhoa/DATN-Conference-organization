import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  AlertTriangle,
  Settings,
  Mail,
  Award,
} from "lucide-react";

const OC_MODULES = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/app/oc/dashboard",
  },
  {
    label: "Budget Approval",
    icon: AlertTriangle,
    path: "/app/oc/budget-approval",
  },
  {
    label: "Conference Setup",
    icon: Settings,
    path: "/app/oc/conference-setup",
  },
  {
    label: "Email Management",
    icon: Mail,
    path: "/app/oc/email-management",
  },
  {
    label: "Awards & Results",
    icon: Award,
    path: "/app/oc/awards",
  },
];

const OCSidebar = ({ sidebarOpen }) => {
  return (
    <div
      className={`${
        sidebarOpen ? "w-[240px]" : "w-0"
      } bg-white border-r border-slate-200 transition-all duration-300 overflow-hidden`}
    >
      <div className="p-4 space-y-1">
        {OC_MODULES.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.path} to={item.path}>
              {({ isActive }) => (
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                    ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                >
                  <Icon size={18} />
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default OCSidebar;
