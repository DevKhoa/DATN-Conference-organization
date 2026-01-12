import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const Input = ({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  icon: Icon,
  error,
  showToggle,
  onToggle,
  showValue
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className="mb-[18px]">
      {label && (
        <label className="block mb-1.5 text-sm font-medium text-[#1e293b]">
          {label}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <Icon
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]"
          />
        )}

        <input
          type={showToggle ? (showValue ? "text" : "password") : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`
            w-full ${Icon ? "px-10 py-3" : "px-3.5 py-3"}
            border ${error ? "border-[#ef4444]" : focused ? "border-[#2563eb]" : "border-[#e2e8f0]"}
            rounded-lg text-[15px] outline-none transition-[border] duration-200
          `}
        />

        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 cursor-pointer"
          >
            {showValue ? (
              <EyeOff size={18} className="text-[#64748b]" />
            ) : (
              <Eye size={18} className="text-[#64748b]" />
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="m-0 mt-1.5 text-[13px] text-[#ef4444]">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
