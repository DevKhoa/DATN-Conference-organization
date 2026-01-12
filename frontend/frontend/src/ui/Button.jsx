import React from "react";

const Button = ({ children, variant = "primary", icon: Icon, onClick, size = "md" }) => {
  const baseClasses = "rounded-lg font-medium cursor-pointer flex items-center gap-2 whitespace-nowrap transition-all duration-200";

  const variantClasses = {
    primary: "bg-[#2563eb] text-white border-none hover:bg-[#1d4ed8]",
    secondary: "bg-[#f8fafc] text-[#1e293b] border border-[#e2e8f0] hover:bg-[#e2e8f0]",
    success: "bg-[#10b981] text-white border-none hover:bg-[#059669]",
    danger: "bg-[#ef4444] text-white border-none hover:bg-[#dc2626]",
    ghost: "bg-transparent text-[#1e293b] border border-[#e2e8f0] hover:bg-[#f8fafc]"
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-[13px]",
    md: "px-4 py-2.5 text-[14px]",
    lg: "px-5 py-3 text-[15px]",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {Icon && <Icon size={size === "sm" ? 16 : 18} />}
      {children}
    </button>
  );
};

export default Button;
