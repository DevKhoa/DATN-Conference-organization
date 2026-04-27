import React, { useEffect } from "react";
import { CheckCircle, Loader2, Globe } from "lucide-react";
import { Route } from "@/routes/register-success";
import useAuth from "@/features/auth/hooks/useAuth";

const RegisterSuccessPage: React.FC = () => {
  const navigate = Route.useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate({ to: "/" });
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-900 font-sans overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-brand-500/5 blur-3xl" />
      </div>

      {/* Logo */}
      <div className="absolute top-6 left-6 flex items-center gap-3 text-white">
        <div className="bg-brand-500/20 backdrop-blur-sm p-2 rounded-xl border border-brand-500/30">
          <Globe className="h-6 w-6 text-brand-400" />
        </div>
        <span className="text-xl font-bold tracking-tight">Conf-Org</span>
      </div>

      <div className="relative text-center text-white max-w-md mx-auto px-6 animate-in fade-in zoom-in-95 duration-500">
        {/* Icon */}
        <div className="w-28 h-28 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-green-500/10">
          <CheckCircle className="w-14 h-14 text-green-400" />
        </div>

        <h1 className="text-4xl font-bold mb-3">Welcome aboard!</h1>

        <p className="text-slate-400 text-lg mb-2">
          {session?.user.email
            ? `You're signed in as ${session.user.email}.`
            : "Your account has been confirmed."}
        </p>
        <p className="text-slate-500 text-sm mb-10">
          Your account is ready. Let's get started.
        </p>

        <div className="flex items-center justify-center gap-2 text-slate-500 text-sm font-medium animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Redirecting to homepage...</span>
        </div>
      </div>
    </div>
  );
};

export default RegisterSuccessPage;
