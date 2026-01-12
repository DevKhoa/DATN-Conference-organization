import React, { useState, useRef, useEffect } from "react";
import { User, ChevronDown, Users, Package, Settings, Shield } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const ROLES = [
  {
    id: "secretariat",
    name: "Secretariat",
    icon: Shield,
    color: "#10b981",
    defaultPath: "/app/secretariat/dashboard",
  },
  {
    id: "logistics",
    name: "Logistics",
    icon: Package,
    color: "#f59e0b",
    defaultPath: "/app/logistics/dashboard",
  },
  {
    id: "oc",
    name: "OC Member",
    icon: Users,
    color: "#2563eb",
    defaultPath: "/app/oc/dashboard",
  },
  {
    id: "admin",
    name: "Administrator",
    icon: Settings,
    color: "#8b5cf6",
    defaultPath: "/app/admin/dashboard",
  },
];

const RoleSelector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState(ROLES[0]); // Default: Secretariat
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-detect current role from URL
  useEffect(() => {
    const path = location.pathname;
    const detectedRole = ROLES.find((role) => path.includes(`/app/${role.id}`));
    if (detectedRole && detectedRole.id !== currentRole.id) {
      setCurrentRole(detectedRole);
    }
  }, [location.pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRoleChange = (role) => {
    setCurrentRole(role);
    setIsOpen(false);
    navigate(role.defaultPath);
  };

  const CurrentIcon = currentRole.icon;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current Role Button */}
      <div
        className="flex items-center gap-2 cursor-pointer py-2 px-3 rounded-lg border border-[#e2e8f0] hover:bg-[#f8fafc] transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white"
          style={{ backgroundColor: currentRole.color }}
        >
          <CurrentIcon size={18} />
        </div>
        <span className="text-sm font-medium text-[#1e293b]">
          {currentRole.name}
        </span>
        <ChevronDown
          size={16}
          className={`text-[#64748b] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-[#e2e8f0] py-2 z-50">
          <div className="px-3 py-2 border-b border-[#e2e8f0]">
            <p className="text-[11px] text-[#64748b] font-semibold uppercase tracking-wider">
              Switch Role
            </p>
          </div>

          {ROLES.map((role) => {
            const RoleIcon = role.icon;
            const isActive = role.id === currentRole.id;

            return (
              <div
                key={role.id}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                  isActive
                    ? "bg-[#f8fafc] border-l-3"
                    : "hover:bg-[#f8fafc]"
                }`}
                style={isActive ? { borderLeftColor: role.color, borderLeftWidth: "3px" } : {}}
                onClick={() => handleRoleChange(role)}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: role.color }}
                >
                  <RoleIcon size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-[#1e293b] m-0">
                    {role.name}
                  </p>
                </div>
                {isActive && (
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                )}
              </div>
            );
          })}

          <div className="border-t border-[#e2e8f0] mt-2 pt-2 px-3">
            <div className="flex items-center gap-2 text-[12px] text-[#64748b] py-1">
              <User size={14} />
              <span>admin@conference.com</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSelector;