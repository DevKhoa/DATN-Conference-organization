import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import * as Icons from "lucide-react";

/**
 * Sidebar module-based:
 * - Khi collapse: vẫn hiện icon, ẩn text
 * - Active module: dựa vào basePath (prefix URL)
 *
 * Props:
 * - sidebarOpen: boolean
 * - modules: [{ key, label, icon, path, basePath }]
 */
const Sidebar = ({ sidebarOpen, modules = [] }) => {
  const location = useLocation();

  const isActiveModule = (basePath) => {
    if (!basePath) return false;
    return location.pathname.startsWith(basePath);
  };

  return (
    <aside
      className={`${
        sidebarOpen ? "w-[260px]" : "w-[72px]"
      } bg-white border-r border-[#e2e8f0] h-[calc(100vh-64px)] transition-all duration-300 overflow-hidden sticky top-16`}
    >
      <div className="p-4 flex flex-col gap-2">
        {modules.map((m) => {
          const Icon = Icons[m.icon] || null;
          const active = isActiveModule(m.basePath);

          return (
            <NavLink
              key={m.key}
              to={m.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 transition-colors ${
                active
                  ? "bg-[#2563eb] text-white"
                  : "text-[#334155] hover:bg-[#f1f5f9]"
              }`}
              title={!sidebarOpen ? m.label : undefined}
            >
              {Icon && <Icon size={22} />}
              {sidebarOpen && (
                <span className="text-sm font-medium">{m.label}</span>
              )}
            </NavLink>
          );
        })}
      </div>
    </aside>
  );
};

export default Sidebar;
