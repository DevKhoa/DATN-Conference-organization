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
import Button from "../components/ui/Button";
import { supabase } from "../lib/supabase";

// --- CAROUSEL CONFIG ---
const CAROUSEL_SLIDES = [
  {
    image:
      "https://nursingeducation.org/wp-content/uploads/2024/07/Research-Nurse-scaled-e1721688270245.jpg",
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

// --- INTERFACES ---
interface LoginProps {
  onNavigateHome: () => void;
  onNavigateRegister: () => void;
  onLoginSuccess: (data: {
    name: string;
    email: string;
    role: string;
    roleId: number;
    avatar: string;
  }) => void;
}

type LoginStep = "email" | "password" | "success";

const Login: React.FC<LoginProps> = ({
  onNavigateHome,
  onNavigateRegister,
  onLoginSuccess,
}) => {
  // --- STATE ---
  const [currentSlide, setCurrentSlide] = useState(0);
  const [step, setStep] = useState<LoginStep>("email");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Data State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userData, setUserData] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);

  // --- EFFECTS ---

  // 1. Carousel Auto-play
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // 2. Auto-redirect on Success
  useEffect(() => {
    if (step === "success" && userData) {
      console.group("🎉 [Login Flow] Step 3: Success & Redirect Logic");
      console.log("⏳ Starting 3-second timer before redirect...");

      const timer = setTimeout(() => {
        // Extract role name safely
        let roleName = "User";
        let roleId = 0;

        // Debugging Role Extraction
        console.log(
          "🔍 [Redirect] Inspecting user roles for final output:",
          userData.user_roles,
        );

        if (userData.user_roles && userData.user_roles.length > 0) {
          // Get Role ID
          roleId = userData.user_roles[0].role_id;

          if (userData.user_roles[0].roles) {
            roleName = userData.user_roles[0].roles.role_name;
            console.log(
              `✅ [Redirect] Role detected: "${roleName}" (ID: ${roleId})`,
            );
          }
        } else {
          console.warn(
            '⚠️ [Redirect] No explicit role found. Defaulting to "User".',
          );
        }

        const finalPayload = {
          name: userData.full_name,
          email: userData.email,
          role: roleName,
          roleId: roleId,
          avatar: userData.avatar_url || "",
        };

        console.log(
          "🚀 [Redirect] Triggering onLoginSuccess with:",
          finalPayload,
        );
        onLoginSuccess(finalPayload);
        console.groupEnd(); // End Step 3 Group
      }, 300); // Wait 3 seconds

      return () => {
        console.log("🧹 [Redirect] Cleanup (Component Unmounted or Updated)");
        clearTimeout(timer);
      };
    }
  }, [step, userData, onLoginSuccess]);

  // --- HANDLERS ---

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.group("📧 [Login Flow] Step 1: Email Check");
    console.log("1️⃣ Input Email:", email);

    if (!email || !email.includes("@")) {
      console.warn("❌ Invalid Email Format");
      setError("Please enter a valid email address.");
      console.groupEnd();
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      console.log("2️⃣ Querying Supabase for user...");

      // JOIN users -> user_roles -> roles to get the role name and role_id
      const { data, error } = await supabase
        .from("users")
        .select(
          `
          user_id, 
          full_name, 
          email, 
          password_hash,
          avatar_url,
          user_roles (
            role_id,
            roles (
              role_name
            )
          )
        `,
        )
        .eq("email", email)
        .maybeSingle();

      if (error) {
        console.error("❌ [Supabase Error]:", error);
        setError("An error occurred. Please try again.");
      } else if (!data) {
        console.warn("⚠️ User not found in DB");
        setError("User not found. Please check your email or sign up.");
      } else {
        console.log("3️⃣ User Found! Raw Data:", data);
        setUserData(data);
        setStep("password");
        console.log("✅ Moving to Password Step");
      }
    } catch (err) {
      console.error("❌ [Unexpected Error]:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
      console.groupEnd(); // End Step 1 Group
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.group("🔑 [Login Flow] Step 2: Password Check");

    if (!password) {
      console.warn("❌ Empty Password");
      setError("Please enter your password.");
      console.groupEnd();
      return;
    }

    setIsLoading(true);
    setError("");

    // Simulate async check (UX delay)
    console.log("1️⃣ Verifying password...");
    await new Promise((resolve) => setTimeout(resolve, 600));

    // WARNING: In production, use bcrypt.compare(password, hash) on backend
    // Here we act as per the provided snippet (Direct String Comparison)
    const dbPasswordHash = userData?.password_hash;
    const isMatch = dbPasswordHash === password;

    console.log(`2️⃣ Comparison Result: ${isMatch ? "MATCH" : "MISMATCH"}`);

    if (userData && isMatch) {
      console.log("✅ Password correct. Setting Step -> Success");
      setStep("success");
    } else {
      console.warn("❌ Password incorrect");
      setError("Incorrect password. Please try again.");
    }

    setIsLoading(false);
    console.groupEnd(); // End Step 2 Group
  };

  // --- RENDER ---
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center font-sans overflow-hidden bg-slate-900">
      {/* 1. BACKGROUND CAROUSEL */}
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
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-slate-950/70" />
          </div>
        ))}
      </div>

      {/* 2. MAIN CONTAINER */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8 h-full">
        {/* LEFT SIDE: Text Content */}
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

          {/* Footer Text */}
          <div className="pt-8 text-xs text-slate-400 hidden lg:block">
            &copy; {new Date().getFullYear()} Conference Organization Inc.
          </div>
        </div>

        {/* RIGHT SIDE: White Card Form */}
        <div className="w-full lg:w-[450px] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-right-8 duration-700 flex flex-col">
          {/* Header inside Card */}
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="text-sm font-semibold text-slate-500">
              {step === "success" ? "Success" : "Sign In"}
            </div>

            {step !== "success" && (
              <button
                onClick={onNavigateHome}
                className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Home
              </button>
            )}
          </div>

          {/* Form Body */}
          <div className="p-8">
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
                    Welcome Back
                  </h2>
                  <p className="text-slate-500 mt-2">
                    Enter your email to sign in.
                  </p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-6">
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
                    type="submit"
                    className="w-full py-3 text-base shadow-lg shadow-brand-500/20"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin w-5 h-5 mx-auto" />
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </form>

                <div className="text-center">
                  <p className="text-sm text-slate-500">
                    Don't have an account?{" "}
                    <button
                      onClick={onNavigateRegister}
                      className="text-brand-600 hover:text-brand-700 font-semibold hover:underline"
                    >
                      Sign up
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* --- STEP 2: PASSWORD --- */}
            {step === "password" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="text-center">
                  <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-brand-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Hello, {userData?.full_name}
                  </h2>
                  <button
                    onClick={() => {
                      setStep("email");
                      setEmail("");
                      setUserData(null);
                    }}
                    className="text-sm text-brand-600 hover:text-brand-700 mt-1 font-medium"
                  >
                    Not you? Change email
                  </button>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors w-5 h-5" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                        placeholder="Enter password"
                        autoFocus
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

                  <Button
                    type="submit"
                    className="w-full py-3 text-base shadow-lg shadow-brand-500/20"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin w-5 h-5 mx-auto" />
                    ) : (
                      "Log In"
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* --- STEP 3: SUCCESS --- */}
            {step === "success" && (
              <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-green-50/50">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">
                  Welcome back, {userData?.full_name}
                </h2>
                <p className="text-slate-600 mb-8 max-w-sm mx-auto">
                  You are now securely logged in.
                </p>

                <div className="flex items-center justify-center gap-2 text-slate-500 text-sm font-medium animate-pulse">
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

export default Login;
