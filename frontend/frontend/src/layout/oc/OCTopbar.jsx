import React from "react";
import { Menu } from "lucide-react";
import RoleSelector from "../../components/RoleSelector";

const OCTopBar = ({ sidebarOpen, setSidebarOpen }) => {
  return (
    <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-md hover:bg-slate-100"
        >
          <Menu size={22} />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            OC
          </div>
          <span className="text-lg font-semibold">
            Organizing Committee
          </span>
        </div>
      </div>

      <RoleSelector />
    </div>
  );
};

export default OCTopBar;
