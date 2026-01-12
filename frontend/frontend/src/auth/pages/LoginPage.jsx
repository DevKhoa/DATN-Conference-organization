import React, { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import Input from "../components/Input";
import Button from "../components/Button";
import Toast from "../components/Toast";
import { Mail, Lock, ArrowRight, Shield } from "lucide-react";

const LoginPage = ({ onNavigate }) => {
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    rememberMe: false,
    showPassword: false
  });

  const showToast = (msg, type = "error") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = (e) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      showToast("Please enter email and password", "error");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast("Login successful!", "success");

      // tạm thời demo redirect đến giao diện thư ký
      window.location.href = "/app/secretariat";
    }, 1500);
  };

  return (
    <>
      <AuthLayout>
        {/* Title */}
        <div className="mb-6 text-left">
          <h2 className="m-0 text-2xl font-semibold">
            Welcome back
          </h2>
          <p className="text-sm opacity-70 mt-1">
            Sign in to access your account
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleLogin}>
          {/* Email */}
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            icon={Mail}
          />

          {/* Password */}
          <Input
            label="Password"
            placeholder="Enter your password"
            type="password"
            icon={Lock}
            showToggle
            showValue={form.showPassword}
            onToggle={() =>
              setForm({ ...form, showPassword: !form.showPassword })
            }
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          {/* Remember + Forgot */}
          <div className="flex justify-between items-center mb-5 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.rememberMe}
                onChange={(e) =>
                  setForm({ ...form, rememberMe: e.target.checked })
                }
                className="w-4 h-4"
              />
              Remember me
            </label>

            <button
              type="button"
              onClick={() => onNavigate("forgot")}
              className="bg-transparent border-none text-[#2563eb] font-medium cursor-pointer"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit btn */}
          <Button type="submit" fullWidth icon={ArrowRight} loading={loading}>
            Sign In
          </Button>
        </form>

        {/* Extra info + Signup link */}
        <div className="mt-6 p-4 bg-white border border-[#e2e8f0] rounded-lg text-center text-sm">
          <Shield size={14} className="inline mr-1.5" />
          Your information is encrypted
          <br />
          <br />
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => onNavigate("signup")}
            className="bg-transparent border-none font-semibold text-[#2563eb] cursor-pointer"
          >
            Create one
          </button>
        </div>
      </AuthLayout>

      <Toast toast={toast} close={() => setToast(null)} />
    </>
  );
};

export default LoginPage;