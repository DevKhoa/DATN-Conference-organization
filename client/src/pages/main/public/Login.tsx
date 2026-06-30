import React, { useState, useEffect } from "react";
import {
  Mail,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Lock,
  Globe,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Route } from "@/routes/login";
import { Link } from "@tanstack/react-router";
import { useLoginMutation, useForgotPasswordMutation } from "@/features/auth/services/mutations";
import useAuth from "@/features/auth/hooks/useAuth";

const CAROUSEL_SLIDES = [
  {
    image:
      "https://cdn.seeklearning.com.au/media/images/career-guide/module/researcher.jpg",
    title: "Welcome Back",
    subtitle: "Continue managing your scientific conferences with ease.",
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

const LoginPage = () => {
  const { session } = useAuth();
  const navigate = Route.useNavigate();
  const loginMutation = useLoginMutation();
  const forgotPasswordMutation = useForgotPasswordMutation();
  const { redirect } = Route.useSearch();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [step, setStep] = useState<"credentials" | "success" | "forgot-password" | "forgot-password-success">("credentials");
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setError("");

    loginMutation.mutate(
      { email, password },
      {
        onSuccess: ({ error }) => {
          if (error) {
            console.error("Login error:", error);
            setError(error.message || "Invalid email or password.");
            return;
          }

          setStep("success");

          setTimeout(() => {
            navigate({ to: redirect || "/" });
          }, 2000);
        },
        onError: () => {
          setError("An unexpected error occurred. Please try again.");
        },
      },
    );
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");

    forgotPasswordMutation.mutate(
      { email },
      {
        onSuccess: () => {
          setStep("forgot-password-success");
        },
        onError: () => {
          setError("An unexpected error occurred. Please try again.");
        },
      }
    );
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center font-sans overflow-hidden bg-background text-foreground">
      {/* 1. BACKGROUND CAROUSEL */}
      <div className="absolute inset-0 z-0">
        {CAROUSEL_SLIDES.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentSlide ? "opacity-100" : "opacity-0"
              }`}
          >
            <img
              src={slide.image}
              alt="Background"
              className="w-full h-full object-cover"
            />
            {/* Gradient Overlay matching Homepage */}
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/75 to-primary/35" />
          </div>
        ))}
      </div>

      {/* 2. MAIN CONTAINER */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8 h-full">
        {/* LEFT SIDE: Text Content */}
        <div className="w-full lg:w-1/2 text-foreground space-y-8 animate-in slide-in-from-left-8 duration-700">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-background/10 backdrop-blur-sm p-2 rounded-xl border border-border text-foreground">
              <Globe className="h-8 w-8 text-primary" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground drop-shadow-sm">Conf-Org</span>
          </div>

          {/* Dynamic Slide Text */}
          <div className="space-y-4 max-w-lg">
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15] drop-shadow-sm">
              {CAROUSEL_SLIDES[currentSlide].title}
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl drop-shadow-sm">
              {CAROUSEL_SLIDES[currentSlide].subtitle}
            </p>
          </div>

          {/* Indicators */}
          <div className="flex gap-2 pt-4">
            {CAROUSEL_SLIDES.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide
                    ? "w-10 bg-primary"
                    : "w-2 bg-foreground/20"
                  }`}
              />
            ))}
          </div>

          {/* Footer Text */}
          <div className="pt-8 text-xs text-muted-foreground hidden lg:block drop-shadow-sm">
            &copy; {new Date().getFullYear()} Conference Organization Inc.
          </div>
        </div>

        {/* RIGHT SIDE: White Card Form */}
        <div className="w-full lg:w-[450px] bg-card rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-right-8 duration-700 flex flex-col border border-border">
          {/* Header inside Card */}
          <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/40">
            <div className="text-sm font-semibold text-muted-foreground">
              {step === "success" ? "Success" : step.startsWith("forgot-password") ? "Password Recovery" : "Sign In"}
            </div>

            {step !== "success" && step !== "forgot-password-success" && (
              <button
                onClick={() => {
                  if (step === "forgot-password") {
                    setStep("credentials");
                    setError("");
                  } else {
                    navigate({ to: "/" });
                  }
                }}
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> {step === "forgot-password" ? "Back to Login" : "Home"}
              </button>
            )}
          </div>

          {/* Form Body */}
          <div className="p-8">
            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg flex items-start gap-3 text-sm animate-pulse border border-destructive/20">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* --- CREDENTIALS FORM --- */}
            {step === "credentials" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-foreground">
                    Welcome Back
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Sign in to your account.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Email Address
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors w-5 h-5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all bg-background text-foreground"
                        placeholder="you@example.com"
                        autoFocus
                        disabled={loginMutation.isPending}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Password
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors w-5 h-5" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all bg-background text-foreground"
                        placeholder="Your password"
                        disabled={loginMutation.isPending}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("forgot-password");
                        setError("");
                      }}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full py-3 text-base shadow-lg"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="animate-spin w-5 h-5 mx-auto" />
                    ) : (
                      "Log In"
                    )}
                  </Button>
                </form>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button
                      onClick={() =>
                        navigate({
                          to: "/register",
                        })
                      }
                      className="text-primary hover:text-primary/80 font-semibold hover:underline"
                    >
                      Sign up
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* --- FORGOT PASSWORD FORM --- */}
            {step === "forgot-password" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Reset Password
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Enter your email to receive a password reset link.
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-4 mt-8">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Email Address
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors w-5 h-5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all bg-background text-foreground"
                        placeholder="you@example.com"
                        autoFocus
                        disabled={forgotPasswordMutation.isPending}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full py-3 text-base shadow-lg"
                    disabled={forgotPasswordMutation.isPending}
                  >
                    {forgotPasswordMutation.isPending ? (
                      <Loader2 className="animate-spin w-5 h-5 mx-auto" />
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* --- FORGOT PASSWORD SUCCESS --- */}
            {step === "forgot-password-success" && (
              <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-primary/10">
                  <CheckCircle className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Check your email
                </h2>
                <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                  We've sent a password reset link to <br />
                  <span className="font-semibold text-foreground">{email}</span>
                </p>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep("credentials")}
                >
                  Back to login
                </Button>
              </div>
            )}

            {/* --- STEP 3: SUCCESS --- */}
            {step === "success" && (
              <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-primary/10">
                  <CheckCircle className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Welcome back, {session?.user.email}
                </h2>
                <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                  You are now securely logged in.
                </p>

                <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm font-medium animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Redirecting to homepage...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
