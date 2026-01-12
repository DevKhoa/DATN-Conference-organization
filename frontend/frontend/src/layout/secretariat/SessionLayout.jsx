import { NavLink, Outlet } from "react-router-dom";
import { Calendar, Zap } from "lucide-react";

const TABS = [
  {
    label: "Session Builder",
    path: "builder",
    icon: Zap,
  },
];

const SessionsLayout = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Conference Sessions
        </h1>
        <p className="text-slate-500">
          Build and manage conference sessions and schedule
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={`/app/sessions/${tab.path}`}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`
              }
            >
              <Icon size={16} />
              {tab.label}
            </NavLink>
          );
        })}
      </div>

      {/* Content */}
      <Outlet />
    </div>
  );
};

export default SessionsLayout;
