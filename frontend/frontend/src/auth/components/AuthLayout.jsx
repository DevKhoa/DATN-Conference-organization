import React from "react";

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2563eb]/[0.15] to-[#f8fafc] p-6">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] px-9 py-[42px] w-full max-w-[420px] animate-[fadeIn_0.3s_ease-out]">
        {/* Logo */}
        <div className="text-center mb-7">
          <div className="w-[58px] h-[58px] rounded-[14px] bg-[#2563eb] mx-auto mb-3 flex items-center justify-center text-white font-bold text-[22px]">
            CM
          </div>

          <h1 className="m-0 text-2xl font-bold text-[#1e293b]">
            Conference Manager
          </h1>

          <p className="mt-1 text-sm text-[#64748b]">
            Professional event management platform
          </p>
        </div>

        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
