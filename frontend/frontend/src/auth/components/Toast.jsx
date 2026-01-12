import React from "react";
import { CheckCircle, AlertCircle, X } from "lucide-react";

const Toast = ({ toast, close }) => {
  if (!toast) return null;

  const bgColors = {
    success: "bg-[#10b981]",
    error: "bg-[#ef4444]",
    warning: "bg-[#f59e0b]"
  };

  return (
    <div className={`fixed top-5 right-5 ${bgColors[toast.type]} text-white px-5 py-4 rounded-lg flex gap-3`}>
      {toast.type === "success" ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
      <span>{toast.message}</span>

      <button onClick={close} className="bg-transparent border-none text-white cursor-pointer">
        <X size={20}/>
      </button>
    </div>
  );
};

export default Toast;
