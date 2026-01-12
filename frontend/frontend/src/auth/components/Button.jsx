import React from "react";
import { Loader } from "lucide-react";

const Button = ({
  children,
  variant = "primary",
  icon: Icon,
  onClick,
  type = "button",
  disabled,
  fullWidth,
  loading
}) => {
  const variantClasses = {
    primary: "bg-[#2563eb] text-white border-none",
    secondary: "bg-white text-[#1e293b] border border-[#e2e8f0]",
    ghost: "bg-transparent text-[#2563eb] border-none",
    google: "bg-white text-[#1e293b] border border-[#e2e8f0]"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variantClasses[variant]}
        ${fullWidth ? "w-full" : "w-auto"}
        px-6 py-3 rounded-lg text-[15px] font-semibold
        ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
        flex items-center justify-center gap-2
      `}
    >
      {loading ? <Loader size={18} className="animate-spin" /> : Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

export default Button;
