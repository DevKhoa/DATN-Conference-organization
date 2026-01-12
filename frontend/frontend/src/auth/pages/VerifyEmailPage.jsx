import React, { useState, useEffect } from "react";
import AuthLayout from "../components/AuthLayout";
import Button from "../components/Button";
import Toast from "../components/Toast";
import { Mail, ArrowRight, RefreshCw } from "lucide-react";

const VerifyEmailPage = ({ onNavigate }) => {
  const [toast, setToast] = useState(null);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);

  const showToast = (msg, type = "error") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleChange = (val, index) => {
    if (!/^[0-9]?$/.test(val)) return;

    const newCode = [...code];
    newCode[index] = val;
    setCode(newCode);

    // Auto move to next box
    if (val && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const submit = (e) => {
    e.preventDefault();

    if (code.join("").length !== 6) {
      showToast("Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast("Email verified!", "success");
      setTimeout(() => onNavigate("login"), 1500);
    }, 1500);
  };

  return (
    <>
      <AuthLayout>
        <h2 className="m-0 text-2xl font-semibold">
          Verify your email
        </h2>
        <p className="opacity-70 mb-6">
          Enter the 6-digit code sent to your email
        </p>

        <form onSubmit={submit}>
          <div className="flex gap-3 justify-center mb-6">
            {code.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                value={digit}
                onChange={(e) => handleChange(e.target.value, idx)}
                maxLength={1}
                className="w-12 h-14 text-[22px] text-center rounded-lg border border-[#e2e8f0]"
              />
            ))}
          </div>

          <Button
            icon={ArrowRight}
            type="submit"
            loading={loading}
            fullWidth
          >
            Verify Email
          </Button>

          <div className="mt-5 text-center">
            {resendTimer > 0 ? (
              <p className="opacity-70">
                Resend code in {resendTimer}s
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setResendTimer(30)}
                className="bg-transparent border-none text-[#2563eb] cursor-pointer font-semibold"
              >
                <RefreshCw size={16} className="inline" /> Resend Code
              </button>
            )}
          </div>

          <div className="mt-5 text-center">
            <button
              className="bg-transparent border-none text-[#2563eb] cursor-pointer"
              onClick={() => onNavigate("login")}
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

export default VerifyEmailPage;
