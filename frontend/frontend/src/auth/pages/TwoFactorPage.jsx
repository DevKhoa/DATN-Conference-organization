import React, { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import Button from "../components/Button";
import Toast from "../components/Toast";
import { Shield, ArrowRight } from "lucide-react";

const TwoFactorPage = ({ onNavigate }) => {
  const [toast, setToast] = useState(null);
  const [code, setCode] = useState("");

  const showToast = (msg, type = "error") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const submit = (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      showToast("Please enter the 6-digit code");
      return;
    }
    showToast("2FA Verified!", "success");
    setTimeout(() => onNavigate("dashboard"), 1500);
  };

  return (
    <>
      <AuthLayout>
        <div className="text-center mb-6">
          <Shield size={48} className="text-[#2563eb]" />
        </div>

        <h2 className="m-0 text-2xl font-semibold">
          Two-Factor Authentication
        </h2>
        <p className="opacity-70 mb-6">
          Enter the verification code from your authenticator app
        </p>

        <form onSubmit={submit}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            placeholder="••••••"
            className="w-full p-3.5 text-xl tracking-[10px] text-center rounded-lg border border-[#e2e8f0] mb-5"
          />

          <Button icon={ArrowRight} fullWidth type="submit">
            Verify
          </Button>

          <div className="mt-5 text-center">
            <button
              onClick={() => onNavigate("login")}
              className="bg-transparent border-none text-[#2563eb] cursor-pointer font-semibold"
            >
              Back to login
            </button>
          </div>
        </form>
      </AuthLayout>

      <Toast toast={toast} close={() => setToast(null)} />
    </>
  );
};

export default TwoFactorPage;
