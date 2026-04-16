import React, { useEffect, useState } from "react";
import { Loader2, XCircle, Globe } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Route } from "@/routes/register-confirm";
import { Button } from "@/components/ui/button";

type ConfirmStep = "verifying" | "creating-profile" | "error";

const RegisterConfirmPage: React.FC = () => {
  const navigate = Route.useNavigate();
  const { token_hash, type } = Route.useSearch();

  const [step, setStep] = useState<ConfirmStep>("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token_hash) {
      setErrorMessage("Invalid confirmation link. Please register again.");
      setStep("error");
      return;
    }

    const confirmAndCreateProfile = async () => {
      // 1. Verify the OTP token from the email link
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: (type as any) ?? "email",
      });

      if (verifyError || !data.user) {
        setErrorMessage(
          verifyError?.message ||
            "Confirmation failed. The link may have expired.",
        );
        setStep("error");
        return;
      }

      // Clear the token params from URL
      window.history.replaceState({}, document.title, "/register-confirm");

      // Navigate to success page
      navigate({ to: "/register-success" });
    };

    confirmAndCreateProfile();
  }, []);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-900 font-sans">
      {/* Logo */}
      <div className="absolute top-6 left-6 flex items-center gap-3 text-white">
        <div className="bg-brand-500/20 backdrop-blur-sm p-2 rounded-xl border border-brand-500/30">
          <Globe className="h-6 w-6 text-brand-400" />
        </div>
        <span className="text-xl font-bold tracking-tight">Conf-Org</span>
      </div>

      <div className="text-center text-white max-w-md mx-auto px-6">
        {/* Verifying / Creating profile */}
        {(step === "verifying" || step === "creating-profile") && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 bg-brand-500/20 rounded-full animate-ping" />
              <div className="relative w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">
              {step === "verifying"
                ? "Verifying your email..."
                : "Setting up your account..."}
            </h2>
            <p className="text-slate-400">Please wait a moment.</p>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto ring-8 ring-red-500/10">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Confirmation Failed</h2>
              <p className="text-slate-400">{errorMessage}</p>
            </div>
            <Button
              onClick={() => navigate({ to: "/register" })}
              className="mx-auto"
            >
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterConfirmPage;
