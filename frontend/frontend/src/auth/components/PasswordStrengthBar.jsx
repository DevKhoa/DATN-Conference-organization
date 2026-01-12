// src/auth/components/PasswordStrengthBar.jsx

import React from "react";

const strengthColors = [
  "#ef4444", // Very weak
  "#f59e0b", // Weak
  "#fbbf24", // Fair
  "#10b981", // Good
  "#059669"  // Strong
];

const PasswordStrengthBar = ({ score, label }) => {
  const width = (score / 5) * 100;
  const barColor = strengthColors[score - 1] || "#e2e8f0";
  const textColor = strengthColors[score - 1] || "#64748b";

  return (
    <div className="mb-4">
      <div className="h-1.5 bg-[#e2e8f0] rounded overflow-hidden">
        <div
          className="h-full transition-[width] duration-300 ease-in-out"
          style={{
            width: `${width}%`,
            backgroundColor: barColor
          }}
        ></div>
      </div>

      <div
        className="mt-1.5 text-[13px] font-medium"
        style={{ color: textColor }}
      >
        {label}
      </div>
    </div>
  );
};

export default PasswordStrengthBar;
