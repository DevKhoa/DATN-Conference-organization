import React, { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import Input from "../components/Input";
import Button from "../components/Button";
import Toast from "../components/Toast";
import { Lock, ArrowRight } from "lucide-react";

const ResetPasswordPage = ({ onNavigate }) => {
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
    showPass: false,
    showConfirm: false
  });

  const showToast = (msg, type = "error") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (form.password.length < 8) {
      showToast("Password must be at least 8 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      showToast("Passwords do not match");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast("Password updated successfully!", "success");

      setTimeout(() => onNavigate("login"), 1500);
    }, 1500);
  };

  return (
    <>
      <AuthLayout>
        <h2 className="m-0 text-2xl font-semibold">
          Set a new password
        </h2>
        <p className="opacity-70 mb-6">
          Your new password must be secure
        </p>

        <form onSubmit={handleSubmit}>
          <Input
            label="New Password"
            type="password"
            placeholder="Enter new password"
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
            icon={Lock}
            showToggle
            showValue={form.showPass}
            onToggle={() =>
              setForm({ ...form, showPass: !form.showPass })
            }
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
            icon={Lock}
            showToggle
            showValue={form.showConfirm}
            onToggle={() =>
              setForm({ ...form, showConfirm: !form.showConfirm })
            }
          />

          <Button icon={ArrowRight} type="submit" loading={loading} fullWidth>
            Update Password
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => onNavigate("login")}
            className="bg-transparent border-none text-[#2563eb] cursor-pointer font-semibold"
          >
            Back to login
          </button>
        </div>
      </AuthLayout>

      <Toast toast={toast} close={() => setToast(null)} />
    </>
  );
};

export default ResetPasswordPage;
