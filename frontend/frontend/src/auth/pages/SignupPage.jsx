import React, { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import Input from "../components/Input";
import Button from "../components/Button";
import Toast from "../components/Toast";
import { Mail, Lock, ArrowRight } from "lucide-react";

// NEW imports
import { usePasswordStrength } from "../hooks/usePasswordStrength";
import PasswordStrengthBar from "../components/PasswordStrengthBar";

const SignupPage = ({ onNavigate }) => {
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "author",
    password: "",
    confirmPassword: "",
    showPass: false,
    showConfirm: false
  });

  // Use the custom hook
  const { score, label } = usePasswordStrength(form.password);

  const showToast = (msg, type = "error") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const submitSignup = (e) => {
    e.preventDefault();

    if (!form.firstName || !form.lastName || !form.email) {
      showToast("All fields are required");
      return;
    }

    if (form.password !== form.confirmPassword) {
      showToast("Passwords do not match");
      return;
    }

    if (score < 3) {
      showToast("Password is too weak");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast("Account created!", "success");
      onNavigate("verify-email");
    }, 1500);
  };

  return (
    <>
      <AuthLayout>
        <div className="mb-6">
          <h2 className="m-0 text-2xl font-semibold">
            Create your account
          </h2>
          <p className="opacity-70 text-sm">
            Join the conference management platform
          </p>
        </div>

        <form onSubmit={submitSignup}>
          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="First Name"
              placeholder="John"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />

            <Input
              label="Last Name"
              placeholder="Doe"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            icon={Mail}
          />

          <div className="mb-5">
            <label className="block mb-1.5">
              User Role
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full p-3 rounded-lg border border-[#e2e8f0]"
            >
              <option value="author">Author</option>
              <option value="reviewer">Reviewer</option>
              <option value="track-chair">Track Chair</option>
              <option value="secretariat">Secretariat</option>
              <option value="admin" disabled>
                Admin (Restricted)
              </option>
            </select>
          </div>

          <Input
            label="Password"
            placeholder="Create a strong password"
            icon={Lock}
            type="password"
            showToggle
            showValue={form.showPass}
            onToggle={() => setForm({ ...form, showPass: !form.showPass })}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          {/* PASSWORD STRENGTH BAR */}
          {form.password.length > 0 && (
            <PasswordStrengthBar score={score} label={label} />
          )}

          <Input
            label="Confirm Password"
            placeholder="Re-enter your password"
            type="password"
            icon={Lock}
            showToggle
            showValue={form.showConfirm}
            onToggle={() =>
              setForm({ ...form, showConfirm: !form.showConfirm })
            }
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
          />

          <Button type="submit" icon={ArrowRight} loading={loading} fullWidth>
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center">
          Already have an account?{" "}
          <button
            onClick={() => onNavigate("login")}
            className="bg-transparent border-none text-[#2563eb] font-semibold cursor-pointer"
          >
            Sign in
          </button>
        </div>
      </AuthLayout>

      <Toast toast={toast} close={() => setToast(null)} />
    </>
  );
};

export default SignupPage;
