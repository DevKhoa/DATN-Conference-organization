import React, { useState, useEffect } from "react";
import {
  Mail,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Lock,
  User,
  Building,
  Globe,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import Button from "../components/ui/Button";
import { supabase } from "../lib/supabase";

// Carousel Images Configuration
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

interface RegisterProps {
  onNavigateHome: () => void;
  onNavigateLogin: () => void;
  onRegisterSuccess: (data: {
    name: string;
    email: string;
    role: string;
    roleId: number;
    avatar: string;
  }) => void;
}

type RegStep = "email" | "sending" | "verify" | "profile" | "success";

const Register: React.FC<RegisterProps> = ({
  onNavigateHome,
  onNavigateLogin,
  onRegisterSuccess,
}) => {
  // --- Layout State ---
  const [currentSlide, setCurrentSlide] = useState(0);

  // --- Form State ---
  const [step, setStep] = useState<RegStep>("email");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data State
  const [email, setEmail] = useState("");
  const [serverCode, setServerCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [expiryTime, setExpiryTime] = useState<number>(0);

  // Profile State
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [assignedRole, setAssignedRole] = useState("");
  const [assignedRoleId, setAssignedRoleId] = useState(0);

  // Carousel Auto-play
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // --- Handlers ---

  const handleEmailSubmit = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setStep("sending");
    setError("");

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setServerCode(code);
    setExpiryTime(Date.now() + 5 * 60 * 1000);

    const BASE_URL = "http://localhost:8080";
    const url = `${BASE_URL}/send-email`;

    const payload = {
      recipient_email: email,
      subject: "Conf-Org Verification Code",
      body: `Your verification code is: ${code}. It expires in 5 minutes.`,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStep("verify");
      } else {
        setError("Failed to send verification email. Please try again.");
        setStep("email");
      }
    } catch (err) {
      console.error(err);
      setError("Network error occurred. Please try again.");
      setStep("email");
    }
  };

  const handleVerifyCode = () => {
    if (Date.now() > expiryTime) {
      setError("Code expired. Please restart.");
      setStep("email");
      return;
    }
    if (inputCode === serverCode) {
      setError("");
      setStep("profile");
    } else {
      setError("Invalid code. Please check your email.");
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !password || !confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // 1. Insert into users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .insert([
          {
            full_name: fullName,
            email: email,
            password_hash: password, // Note: Should be hashed in production
            organization: organization,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (userError) throw userError;

      if (userData && userData.length > 0) {
        const newUser = userData[0];
        const DEFAULT_ROLE_ID = 5; // Basic User

        // 2. Insert into user_roles table
        const { error: roleError } = await supabase.from("user_roles").insert([
          {
            user_id: newUser.user_id,
            role_id: DEFAULT_ROLE_ID,
          },
        ]);

        if (roleError) throw roleError;

        // 3. Fetch role details so we can pass it up
        const { data: roleData, error: fetchError } = await supabase
          .from("users")
          .select(
            `
            user_roles (
              role_id,
              roles (
                role_name
              )
            )
          `,
          )
          .eq("user_id", newUser.user_id)
          .single();

        let roleName = "Participant"; // fallback
        let rId = DEFAULT_ROLE_ID;

        if (
          !fetchError &&
          roleData &&
          roleData.user_roles &&
          roleData.user_roles.length > 0
        ) {
          // @ts-ignore - Supabase types inference helper
          rId = roleData.user_roles[0].role_id;
          // @ts-ignore
          roleName = roleData.user_roles[0].roles?.role_name || "Participant";
        }

        setAssignedRole(roleName);
        setAssignedRoleId(rId);

        // Success
        setStep("success");
      } else {
        throw new Error("Failed to create user record.");
      }
    } catch (err: any) {
      console.error("Registration Error:", err);
      setError(err.message || "An error occurred during registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center font-sans overflow-hidden bg-slate-900">
      {/* 1. BACKGROUND CAROUSEL (Full Screen) */}
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
            {/* Dark Overlay for Readability */}
            <div className="absolute inset-0 bg-slate-950/70" />
          </div>
        ))}
      </div>

      {/* 2. MAIN CONTAINER */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8 h-full">
        {/* LEFT SIDE: Text Content (White Text) */}
        <div className="w-full lg:w-1/2 text-white space-y-8 animate-in slide-in-from-left-8 duration-700">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-brand-500/20 backdrop-blur-sm p-2 rounded-xl border border-brand-500/30">
              <Globe className="h-8 w-8 text-brand-400" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Conf-Org</span>
          </div>

          {/* Dynamic Slide Text */}
          <div className="space-y-4 max-w-lg">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              {CAROUSEL_SLIDES[currentSlide].title}
            </h1>
            <p className="text-lg text-slate-300">
              {CAROUSEL_SLIDES[currentSlide].subtitle}
            </p>
          </div>

          {/* Indicators */}
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

          {/* Footer Text (Left side) */}
          <div className="pt-8 text-xs text-slate-400 hidden lg:block">
            &copy; {new Date().getFullYear()} Conference Organization Inc.
          </div>
        </div>

        {/* RIGHT SIDE: White Card Form */}
        <div className="w-full lg:w-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-right-8 duration-700 flex flex-col max-h-[90vh]">
          {/* Header inside Card */}
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="text-sm font-semibold text-slate-500">
              {step === "email" && "Step 1 of 3"}
              {step === "verify" && "Step 2 of 3"}
              {step === "profile" && "Step 3 of 3"}
              {step === "success" && "Complete"}
            </div>
            <button
              onClick={onNavigateHome}
              className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Home
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
            {/* Steps Progress Bar */}
            {step !== "success" && step !== "sending" && (
              <div className="flex items-center gap-2 mb-8">
                <div
                  className={`h-1.5 flex-1 rounded-full transition-colors ${["email", "sending", "verify", "profile"].includes(step) ? "bg-brand-600" : "bg-slate-100"}`}
                />
                <div
                  className={`h-1.5 flex-1 rounded-full transition-colors ${["verify", "profile"].includes(step) ? "bg-brand-600" : "bg-slate-100"}`}
                />
                <div
                  className={`h-1.5 flex-1 rounded-full transition-colors ${step === "profile" ? "bg-brand-600" : "bg-slate-100"}`}
                />
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-sm animate-pulse border border-red-100">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* --- STEP 1: EMAIL --- */}
            {step === "email" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Create Account
                  </h2>
                  <p className="text-slate-500 mt-2">
                    Start your 14-day free trial.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors w-5 h-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                      placeholder="Email"
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  onClick={handleEmailSubmit}
                  className="w-full py-3 text-base shadow-lg shadow-brand-500/20"
                  disabled={!email}
                >
                  Continue with Email
                </Button>

                <div className="text-center">
                  <p className="text-sm text-slate-500">
                    Already have an account?{" "}
                    <button
                      onClick={onNavigateLogin}
                      className="text-brand-600 hover:text-brand-700 font-semibold hover:underline"
                    >
                      Log in
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* --- STEP 2: SENDING --- */}
            {step === "sending" && (
              <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="relative">
                  <div className="absolute inset-0 bg-brand-100 rounded-full animate-ping opacity-75"></div>
                  <Loader2 className="relative w-16 h-16 text-brand-600 animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mt-6">
                  Sending Code...
                </h3>
                <p className="text-slate-500 mt-2">Securing your connection.</p>
              </div>
            )}

            {/* --- STEP 3: VERIFY --- */}
            {step === "verify" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Check your inbox
                  </h2>
                  <p className="text-slate-500 mt-2 text-sm">
                    We sent a code to{" "}
                    <span className="font-semibold text-slate-900">
                      {email}
                    </span>
                  </p>
                </div>

                <div className="flex justify-center">
                  <input
                    type="text"
                    maxLength={6}
                    value={inputCode}
                    onChange={(e) =>
                      setInputCode(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="000000"
                    className="w-48 text-center text-4xl font-mono tracking-[0.5em] border-b-2 border-slate-300 focus:border-brand-600 outline-none py-2 bg-transparent transition-colors"
                    autoFocus
                  />
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleVerifyCode}
                    className="w-full py-3 shadow-lg shadow-brand-500/20"
                    disabled={inputCode.length !== 6}
                  >
                    Verify Email
                  </Button>
                  <button
                    onClick={() => setStep("email")}
                    className="w-full text-center text-sm text-slate-500 hover:text-slate-700 font-medium"
                  >
                    Change email address
                  </button>
                </div>
              </div>
            )}

            {/* --- STEP 4: PROFILE SETUP --- */}
            {step === "profile" && (
              <div className="animate-in fade-in duration-300">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Your Profile
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Final step to setup your account.
                  </p>
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-4">
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
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        placeholder="Enter Your Name Here"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Organization */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                      Organization (Optional)
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        placeholder="University / Institute"
                        disabled={isSubmitting}
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
                          disabled={isSubmitting}
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
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full py-3 mt-2 shadow-lg shadow-brand-500/20"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin w-5 h-5 mx-auto" />
                    ) : (
                      "Complete Registration"
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* --- STEP 5: SUCCESS --- */}
            {step === "success" && (
              <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-green-50/50">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                  Welcome!
                </h2>
                <p className="text-slate-600 mb-8 max-w-sm mx-auto">
                  Hello <strong>{fullName}</strong>, your account is ready.
                </p>
                <Button
                  onClick={() =>
                    onRegisterSuccess({
                      name: fullName,
                      email: email,
                      role: assignedRole,
                      roleId: assignedRoleId,
                      avatar: "",
                    })
                  }
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800"
                >
                  Go to Dashboard
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
