import React from "react";
import { Menu, Search, Bell, User, ChevronDown } from "lucide-react";

const TopBar = ({ sidebarOpen, setSidebarOpen }) => {
  return (
    <div className="h-16 bg-white border-b border-[#e2e8f0] flex items-center justify-between px-6 sticky top-0 z-[100]">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-transparent border-none p-2 cursor-pointer text-[#1e293b]"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2563eb] rounded-lg flex items-center justify-center text-white font-bold text-base">
            CM
          </div>
          <span className="text-lg font-semibold text-[#1e293b]">
            Conference Manager 2025
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-2.5 text-[#64748b]" />
          <input
            placeholder="Search papers, sessions..."
            className="py-2 pl-10 pr-3 border border-[#e2e8f0] rounded-lg w-[280px] text-sm"
          />
        </div>

        <div className="relative cursor-pointer">
          <Bell size={20} className="text-[#1e293b]" />
          <span className="absolute -top-1 -right-1 bg-[#ef4444] text-white rounded-xl px-1.5 py-0.5 text-[11px] font-semibold">
            5
          </span>
        </div>

        <div className="flex items-center gap-2 cursor-pointer py-2 px-3 rounded-lg border border-[#e2e8f0]">
          <div className="w-8 h-8 bg-[#10b981] rounded-full flex items-center justify-center text-white">
            <User size={18} />
          </div>
          <span className="text-sm font-medium text-[#1e293b]">Secretariat</span>
          <ChevronDown size={16} className="text-[#64748b]" />
        </div>
      </div>
    </div>
  );
};

export default TopBar;
