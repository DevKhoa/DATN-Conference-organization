import React, { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import Input from "../components/Input";
import Button from "../components/Button";
import Toast from "../components/Toast";
import { Mail, CheckCircle } from "lucide-react";

const ForgotPasswordPage = ({ onNavigate }) => {
  const [form, setForm] = useState({ email: "" });
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const showToast = (msg, type = "error") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.email) return showToast("Please enter your email");

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setCountdown(60);
      showToast("Reset link sent!", "success");
    }, 1500);
  };

  return (
    <>
      <AuthLayout>
        <div className="mb-6">
          <h2 className="m-0 text-2xl font-semibold">
            Reset your password
          </h2>
          <p className="opacity-70">Enter your email to receive a reset link</p>
        </div>

        <form onSubmit={submit}>
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            icon={Mail}
            value={form.email}
            onChange={(e) => setForm({ email: e.target.value })}
          />

          <Button type="submit" fullWidth loading={loading} icon={Mail}>
            Send Reset Link
          </Button>

          {countdown > 0 && (
            <div className="mt-4 flex gap-2 items-center p-3 bg-[#10b981]/[0.15] rounded-lg">
              <CheckCircle size={16} className="text-[#10b981]" />
              Reset link sent — you can resend in {countdown}s
            </div>
          )}

          <div className="mt-5 text-center">
            <button
              className="bg-transparent border-none text-[#2563eb] cursor-pointer font-semibold"
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

export default ForgotPasswordPage;
