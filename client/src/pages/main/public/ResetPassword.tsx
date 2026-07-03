import React, { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "@tanstack/react-router";
import { useResetPasswordMutation } from "@/features/auth/services/mutations";
import { Route } from "@/routes/reset-password";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"form" | "success">("form");

  const navigate = useNavigate();
  const resetPasswordMutation = useResetPasswordMutation();
  const { token_hash } = Route.useSearch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setError("Please enter a new password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!token_hash) {
      setError("Invalid or missing reset token.");
      return;
    }

    setError("");

    resetPasswordMutation.mutate(
      { password, token_hash },
      {
        onSuccess: () => {
          setStep("success");
          setTimeout(() => {
            navigate({ to: "/" });
          }, 3000);
        },
        onError: (err: any) => {
          setError(err.message || "Failed to reset password. The link might have expired.");
        },
      }
    );
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center font-sans overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 z-0" />

      <div className="z-10 w-full max-w-md p-8 bg-card rounded-2xl shadow-xl border border-border/50 backdrop-blur-sm mx-4">
        {step === "form" ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                Reset Password
              </h1>
              <p className="text-muted-foreground">
                Enter your new password below to regain access to your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm pl-10 pr-10"
                      disabled={resetPasswordMutation.isPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm pl-10 pr-10"
                      disabled={resetPasswordMutation.isPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium shadow-sm transition-all hover:shadow-md"
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Password Reset Successful</h2>
            <p className="text-muted-foreground mb-8">
              Your password has been successfully reset. You are now logged in and will be redirected to the homepage shortly.
            </p>
            <Link to="/">
              <Button className="w-full">
                Go to Homepage
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
