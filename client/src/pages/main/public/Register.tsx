import React, { useState, useEffect } from "react";
import {
  Mail,
  ArrowLeft,
  Loader2,
  Lock,
  User,
  Building,
  Globe,
  Eye,
  EyeOff,
  AlertCircle,
  MailCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSignupMutation } from "@/features/auth/services/mutations";
import { Route } from "@/routes/register";

const CAROUSEL_SLIDES = [
  {
    image:
      "https://nursingeducation.org/wp-content/uploads/2024/07/Research-Nurse-scaled-e1721688270245.jpg",
    title: "Join the Global Scientific Community",
    subtitle: "Connect with researchers and organizers worldwide.",
  },
  {
    image:
      "https://online.maryville.edu/wp-content/uploads/sites/97/2023/09/social-researcher-1.jpg",
    title: "Streamline Your Event Management",
    subtitle: "From abstract submission to proceedings publication.",
  },
  {
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNEtCgkDqOCdEIYEUvjObtK6PD3rHfIQRxZw&s",
    title: "Secure & Compliant Platform",
    subtitle: "Built with the highest standards of data integrity.",
  },
];

type RegStep = "profile" | "sending" | "check-email";

const RegisterPage: React.FC = () => {
  const navigate = Route.useNavigate();
  const signupMutation = useSignupMutation();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [step, setStep] = useState<RegStep>("profile");
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!password) {
      setError("Please enter a password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setStep("sending");

    signupMutation.mutate(
      { email, password, fullName, organization },
      {
        onSuccess: ({ error: signupError }) => {
          if (signupError) {
            setError(
              signupError.message || "Registration failed. Please try again.",
            );
            setStep("profile");
            return;
          }
          setStep("check-email");
        },
        onError: () => {
          setError("An unexpected error occurred. Please try again.");
          setStep("profile");
        },
      },
    );
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center font-sans overflow-hidden bg-slate-900">
      {/* BACKGROUND CAROUSEL */}
      <div className="absolute inset-0 z-0">
        {CAROUSEL_SLIDES.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={slide.image}
              alt="Background"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-950/70" />
          </div>
        ))}
      </div>

      {/* MAIN CONTAINER */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8 h-full">
        {/* LEFT SIDE */}
        <div className="w-full lg:w-1/2 text-white space-y-8 animate-in slide-in-from-left-8 duration-700">
          <div className="flex items-center gap-3">
            <div className="bg-brand-500/20 backdrop-blur-sm p-2 rounded-xl border border-brand-500/30">
              <Globe className="h-8 w-8 text-brand-400" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Conf-Org</span>
          </div>

          <div className="space-y-4 max-w-lg">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              {CAROUSEL_SLIDES[currentSlide].title}
            </h1>
            <p className="text-lg text-slate-300">
              {CAROUSEL_SLIDES[currentSlide].subtitle}
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            {CAROUSEL_SLIDES.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentSlide ? "w-10 bg-brand-500" : "w-2 bg-white/20"
                }`}
              />
            ))}
          </div>

          <div className="pt-8 text-xs text-slate-400 hidden lg:block">
            &copy; {new Date().getFullYear()} Conference Organization Inc.
          </div>
        </div>

        {/* RIGHT SIDE: Card */}
        <div className="w-full lg:w-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-right-8 duration-700 flex flex-col max-h-[90vh]">
          {/* Card Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="text-sm font-semibold text-slate-500">
              {step === "check-email" ? "Check Your Email" : "Create Account"}
            </div>
            {step === "profile" && (
              <button
                onClick={() => navigate({ to: "/" })}
                className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Home
              </button>
            )}
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-sm border border-red-100">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP: SENDING */}
            {step === "sending" && (
              <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-brand-100 rounded-full animate-ping opacity-75" />
                  <Loader2 className="relative w-16 h-16 text-brand-600 animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">
                  Creating your account...
                </h3>
                <p className="text-slate-500 mt-2">Just a moment.</p>
              </div>
            )}

            {/* STEP: CHECK EMAIL */}
            {step === "check-email" && (
              <div className="text-center py-4 space-y-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-brand-50/50">
                  <MailCheck className="w-10 h-10 text-brand-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Check your inbox
                  </h2>
                  <p className="text-slate-500 mt-2">
                    We sent a confirmation link to{" "}
                    <span className="font-semibold text-slate-900">
                      {email}
                    </span>
                  </p>
                </div>
                <p className="text-sm text-slate-400">
                  Click the link in the email to confirm your account. The link
                  expires in 24 hours.
                </p>
                <button
                  onClick={() => {
                    setStep("profile");
                    setError("");
                  }}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  Wrong email? Go back
                </button>
              </div>
            )}

            {/* STEP: PROFILE FORM */}
            {step === "profile" && (
              <div className="animate-in fade-in duration-300">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Create Account
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Fill in your details to get started.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                        placeholder="you@example.com"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

                  {/* Organization */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                      Organization{" "}
                      <span className="normal-case text-slate-400 font-normal">
                        (optional)
                      </span>
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                        placeholder="University / Institute"
                      />
                    </div>
                  </div>

                  {/* Password Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-9 pr-9 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                          placeholder="Min 8 chars"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        Confirm
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                          placeholder="Repeat"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full py-3 mt-2 shadow-lg shadow-brand-500/20"
                  >
                    Create Account
                  </Button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-4">
                  Already have an account?{" "}
                  <button
                    onClick={() => navigate({ to: "/login" })}
                    className="text-brand-600 hover:text-brand-700 font-semibold hover:underline"
                  >
                    Log in
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
