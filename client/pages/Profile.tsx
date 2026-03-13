import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  Building,
  FileText,
  Calendar,
  Edit2,
  Save,
  X,
  Loader2,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Shield,
  Camera,
  Upload,
  Link as LinkIcon,
  PenTool,
  BookOpen,
  RefreshCw,
} from "lucide-react";
import Button from "../components/ui/Button";
import { supabase } from "../lib/supabase";

// --- INTERFACES ---
interface ProfileProps {
  userEmail: string;
  onNavigateHome: () => void;
  onNavigateMyPapers?: () => void; // New Prop
}

interface UserProfile {
  user_id: number;
  full_name: string;
  email: string;
  organization: string | null;
  description: string | null;
  description_reformat: string | null;
  created_at: string;
  role_name?: string;
  role_id?: number; // Added
  avatar_url: string | null;
}

const BASE_API_URL = import.meta.env.VITE_API_BASE_URL as string;

const Profile: React.FC<ProfileProps> = ({
  userEmail,
  onNavigateHome,
  onNavigateMyPapers,
}) => {
  // --- STATE ---
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Basic Info State
  const [basicEditMode, setBasicEditMode] = useState(false);
  const [basicSaving, setBasicSaving] = useState(false);
  const [basicData, setBasicData] = useState({
    full_name: "",
    organization: "",
  });

  // Avatar State
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Bio/Description State
  const [bioMode, setBioMode] = useState<"VIEW" | "MANUAL" | "CV" | "SCHOLAR">(
    "VIEW",
  );
  const [bioSaving, setBioSaving] = useState(false);
  const [manualBio, setManualBio] = useState("");
  const [scholarUrl, setScholarUrl] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);

  // Messages
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Refs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);

  // --- EFFECTS ---

  useEffect(() => {
    if (userEmail) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [userEmail]);

  const formatBioDirectly = (text: string): string => {
    if (!text) return "";

    let formatted = text;

    // 1. Chuẩn hóa whitespace
    formatted = formatted
      .replace(/\r/g, "")
      .replace(/\t+/g, " ")
      .replace(/ {2,}/g, " ")
      .trim();

    // 2. Chuẩn hóa bullet (PDF hay dùng • ◦)
    formatted = formatted.replace(/•/g, "\n• ").replace(/◦/g, "\n  ◦ ");

    // 3. Tách SECTION rõ ràng
    const sections = [
      "Objective",
      "Education",
      "Experience",
      "Projects",
      "Research",
      "Skills",
    ];

    sections.forEach((section) => {
      const regex = new RegExp(`\\b(${section})\\b`, "gi");
      formatted = formatted.replace(regex, `\n\n**$1**\n`);
    });

    // 4. Fix các chỗ bullet bị dính sau dấu :
    formatted = formatted.replace(/:\s*(?=[A-Z])/g, ":\n");

    // 5. Ngắt dòng an toàn cho mô tả dài (chỉ khi có dấu . + space + chữ hoa + >= 80 ký tự phía trước)
    formatted = formatted.replace(/(.{80,}?[.!?])\s+(?=[A-Z])/g, "$1\n");

    // 6. Dọn dẹp dòng trống
    formatted = formatted.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n");

    return formatted.trim();
  };

  const handleRefreshBio = async () => {
    if (!profile || !profile.description) return;

    setBioSaving(true);
    try {
      // XỬ LÝ TRỰC TIẾP TẠI ĐÂY
      const newFormattedBio = formatBioDirectly(profile.description);

      // Lưu thẳng vào cột description_reformat trong Supabase [cite: 575]
      const { error: updateError } = await supabase
        .from("users")
        .update({ description_reformat: newFormattedBio })
        .eq("user_id", profile.user_id);

      if (updateError) throw updateError;

      // Cập nhật State để UI hiển thị nội dung mới ngay lập tức
      setProfile({ ...profile, description_reformat: newFormattedBio });
      setSuccessMsg("Profile reformatted successfully!");
    } catch (err: any) {
      setError("Failed to reformat bio.");
    } finally {
      setBioSaving(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  // --- DATA FETCHING ---

  const fetchProfile = async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          `
          user_id, full_name, email, organization, description, description_reformat,created_at, avatar_url,
          user_roles ( role_id, roles ( role_name ) )
        `,
        )
        .eq("email", userEmail)
        .single();

      if (error) throw error;

      if (data) {
        let roleName = "Participant";
        let roleId = 5;

        // Sử dụng Type Assertion (as any[]) để thoát khỏi lỗi 'never'
        const rawRoles = data.user_roles as any[];

        if (rawRoles && rawRoles.length > 0) {
          const firstRoleEntry = rawRoles[0];
          roleId = firstRoleEntry.role_id;

          if (firstRoleEntry.roles) {
            // Ép kiểu cho rolesData để TypeScript biết nó chứa role_name
            const rolesData = firstRoleEntry.roles;

            if (Array.isArray(rolesData)) {
              roleName = rolesData[0]?.role_name || "Participant";
            } else {
              roleName = (rolesData as any).role_name || "Participant";
            }
          }
        }

        const userProfile: UserProfile = {
          user_id: data.user_id,
          full_name: data.full_name,
          email: data.email,
          organization: data.organization,
          description: data.description,
          description_reformat: data.description_reformat,
          created_at: data.created_at,
          role_name: roleName,
          role_id: roleId,
          avatar_url: data.avatar_url,
        };

        setProfile(userProfile);
        setBasicData({
          full_name: userProfile.full_name || "",
          organization: userProfile.organization || "",
        });
        setManualBio(userProfile.description || "");
      }
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError("Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  };

  // --- BASIC INFO HANDLERS ---

  const handleSaveBasicInfo = async () => {
    if (!profile) return;
    setBasicSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: basicData.full_name,
          organization: basicData.organization,
        })
        .eq("user_id", profile.user_id);

      if (error) throw error;

      setProfile({
        ...profile,
        full_name: basicData.full_name,
        organization: basicData.organization,
      });

      setSuccessMsg("Basic information updated.");
      setBasicEditMode(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setError("Failed to update basic info.");
    } finally {
      setBasicSaving(false);
    }
  };

  const handleCancelBasic = () => {
    if (profile) {
      setBasicData({
        full_name: profile.full_name || "",
        organization: profile.organization || "",
      });
    }
    setBasicEditMode(false);
  };

  // --- AVATAR HANDLERS ---

  const handleAvatarFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    setUploadingAvatar(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${BASE_API_URL}/users/${profile.user_id}/upload-avatar`,
        {
          method: "POST",
          body: formData,
        },
      );

      const result = await response.json();
      if (response.ok && result.avatar_url) {
        setProfile({ ...profile, avatar_url: result.avatar_url });
        setSuccessMsg("Avatar updated.");
      } else {
        throw new Error(result.message || "Upload failed");
      }
    } catch (err: any) {
      setError("Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  // --- BIO UPDATE HANDLERS ---

  // Method 1: Manual Input
  const handleSaveManualBio = async () => {
    if (!profile) return;
    setBioSaving(true);
    setError("");

    try {
      // API: POST /users/{USER_ID}/description
      const url = `${BASE_API_URL}/users/${profile.user_id}/description`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: manualBio }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Update failed");

      setProfile({ ...profile, description: manualBio });
      setSuccessMsg("Bio updated successfully.");
      setBioMode("VIEW");
    } catch (err: any) {
      setError(err.message || "Failed to update bio.");
    } finally {
      setBioSaving(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  // Method 2: Upload CV
  const handleUploadCV = async () => {
    if (!profile || !cvFile) {
      setError("Please select a PDF file.");
      return;
    }
    setBioSaving(true);
    setError("");

    try {
      // API: POST /users/{USER_ID}/upload-cv
      const formData = new FormData();
      formData.append("file", cvFile);

      const url = `${BASE_API_URL}/users/${profile.user_id}/upload-cv`;
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Upload failed");

      setSuccessMsg("CV uploaded & bio extracted successfully.");
      // Refresh profile to get the extracted description
      await fetchProfile();
      setBioMode("VIEW");
      setCvFile(null);
    } catch (err: any) {
      setError(err.message || "Failed to upload CV.");
    } finally {
      setBioSaving(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  // Method 3: Import Scholar
  const handleImportScholar = async () => {
    if (!profile || !scholarUrl) {
      setError("Please enter a Google Scholar URL.");
      return;
    }
    if (!scholarUrl.includes("scholar.google.com")) {
      setError("Invalid Google Scholar URL.");
      return;
    }
    setBioSaving(true);
    setError("");

    try {
      // API: POST /users/{USER_ID}/import-scholar
      const url = `${BASE_API_URL}/users/${profile.user_id}/import-scholar`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scholar_url: scholarUrl }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Import failed");

      setSuccessMsg("Scholar profile imported successfully.");
      // Refresh profile to get the extracted description
      await fetchProfile();
      setBioMode("VIEW");
      setScholarUrl("");
    } catch (err: any) {
      setError(err.message || "Failed to import Scholar profile.");
    } finally {
      setBioSaving(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  // --- HELPERS ---
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  const getInitials = (name: string) => {
    return name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .substring(0, 2)
          .toUpperCase()
      : "U";
  };

  // Check if user is Author (Role 3 or Name 'Author')
  const isAuthor = profile?.role_id === 3 || profile?.role_name === "Author";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Loading Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
            <p className="text-slate-500 mt-1">
              Manage your identity and professional information.
            </p>
          </div>
          <button
            onClick={onNavigateHome}
            className="flex items-center text-sm font-medium text-slate-600 hover:text-brand-700 transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </button>
        </div>

        {/* Global Messages */}
        <div className="mb-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 text-sm border border-red-100 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0" /> {error}
            </div>
          )}
          {successMsg && (
            <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-3 text-sm border border-green-100 animate-in fade-in">
              <CheckCircle className="w-5 h-5 shrink-0" /> {successMsg}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Avatar & Summary (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
              {/* Avatar */}
              <div className="relative group mx-auto mb-4 w-32 h-32">
                <div
                  onClick={() => avatarInputRef.current?.click()}
                  className="w-full h-full rounded-full border-4 border-white shadow-lg overflow-hidden cursor-pointer relative bg-brand-100 flex items-center justify-center"
                  title="Upload Avatar"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-brand-700">
                      {getInitials(profile?.full_name || "")}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                      <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={avatarInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                />
              </div>

              <h2 className="text-xl font-bold text-slate-900">
                {profile?.full_name}
              </h2>
              <p className="text-slate-500 text-sm mb-4">{profile?.email}</p>

              <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold uppercase tracking-wide">
                <Shield className="w-3 h-3 mr-1.5" />
                {profile?.role_name || "User"}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 text-left space-y-3">
                <div className="flex items-center text-sm text-slate-600">
                  <Calendar className="w-4 h-4 mr-3 text-slate-400" />
                  <span>
                    Joined{" "}
                    {profile?.created_at
                      ? formatDate(profile.created_at)
                      : "N/A"}
                  </span>
                </div>
                <div className="flex items-center text-sm text-slate-600">
                  <CheckCircle className="w-4 h-4 mr-3 text-green-500" />
                  <span>Account Verified</span>
                </div>
              </div>
            </div>

            {/* AUTHOR ACTION BUTTON */}
            {isAuthor && onNavigateMyPapers && (
              <Button
                onClick={onNavigateMyPapers}
                className="w-full justify-center shadow-md bg-indigo-600 hover:bg-indigo-700"
                size="lg"
                icon={BookOpen}
              >
                My Papers Dashboard
              </Button>
            )}
          </div>

          {/* RIGHT COLUMN: Details (8 Cols) */}
          <div className="lg:col-span-8 space-y-8">
            {/* SECTION 1: BASIC INFORMATION */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-900">
                  Basic Information
                </h3>
                {!basicEditMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBasicEditMode(true)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </Button>
                )}
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="text"
                        disabled={!basicEditMode}
                        value={basicData.full_name}
                        onChange={(e) =>
                          setBasicData({
                            ...basicData,
                            full_name: e.target.value,
                          })
                        }
                        className={`w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none transition-all ${
                          basicEditMode
                            ? "border-slate-300 focus:ring-2 focus:ring-brand-500 bg-white"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      />
                    </div>
                  </div>
                  {/* Organization */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Organization
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="text"
                        disabled={!basicEditMode}
                        value={basicData.organization}
                        onChange={(e) =>
                          setBasicData({
                            ...basicData,
                            organization: e.target.value,
                          })
                        }
                        placeholder="University / Institute"
                        className={`w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none transition-all ${
                          basicEditMode
                            ? "border-slate-300 focus:ring-2 focus:ring-brand-500 bg-white"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      />
                    </div>
                  </div>
                </div>
                {/* Email (Read Only) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email Address{" "}
                    <span className="text-xs text-slate-400 font-normal">
                      (Cannot be changed)
                    </span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="email"
                      disabled
                      value={profile?.email || ""}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                {basicEditMode && (
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      onClick={handleCancelBasic}
                      disabled={basicSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveBasicInfo}
                      disabled={basicSaving}
                    >
                      {basicSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Info
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: PROFESSIONAL BIO */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-lg font-semibold text-slate-900">
                  Professional Profile
                </h3>
              </div>

              <div className="p-6">
                {bioMode === "VIEW" && (
                  <div className="space-y-4">
                    {/* Ưu tiên hiển thị description_reformat */}
                    <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-line text-sm italic">
                      {profile?.description_reformat ||
                        profile?.description ||
                        "No professional summary available yet."}
                    </div>

                    {/* Các nút hành động */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-50">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBioMode("MANUAL")}
                      >
                        <PenTool className="w-4 h-4 mr-2" /> Edit Text
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBioMode("CV")}
                      >
                        <Upload className="w-4 h-4 mr-2" /> Upload CV (PDF)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBioMode("SCHOLAR")}
                      >
                        <LinkIcon className="w-4 h-4 mr-2" /> Import Scholar
                      </Button>
                      {bioMode === "VIEW" && profile?.description && (
                        <button
                          onClick={handleRefreshBio}
                          disabled={bioSaving}
                          className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-all group"
                          title="Reformat existing bio using AI"
                        >
                          <RefreshCw
                            className={`w-5 h-5 ${bioSaving ? "animate-spin text-brand-600" : "group-hover:rotate-180 duration-500"}`}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* MODE: MANUAL */}
                {bioMode === "MANUAL" && (
                  <div className="space-y-4 animate-in fade-in">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Edit Bio
                      </label>
                      <textarea
                        rows={6}
                        value={manualBio}
                        onChange={(e) => setManualBio(e.target.value)}
                        className="w-full p-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none resize-y text-sm"
                        placeholder="Write a short professional biography..."
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button
                        variant="ghost"
                        onClick={() => setBioMode("VIEW")}
                        disabled={bioSaving}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveManualBio}
                        disabled={bioSaving}
                      >
                        {bioSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          "Update Bio"
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* MODE: CV */}
                {bioMode === "CV" && (
                  <div className="space-y-4 animate-in fade-in max-w-lg mx-auto text-center py-6">
                    <div
                      onClick={() => cvInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 rounded-xl p-8 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-900 font-medium">
                        {cvFile ? cvFile.name : "Click to Upload CV"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        PDF format only. We'll extract your bio automatically.
                      </p>
                      <input
                        type="file"
                        ref={cvInputRef}
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    <div className="flex justify-center gap-3">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setBioMode("VIEW");
                          setCvFile(null);
                        }}
                        disabled={bioSaving}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUploadCV}
                        disabled={bioSaving || !cvFile}
                      >
                        {bioSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          "Process & Save"
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* MODE: SCHOLAR */}
                {bioMode === "SCHOLAR" && (
                  <div className="space-y-4 animate-in fade-in max-w-lg mx-auto py-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Google Scholar Profile URL
                      </label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                          type="text"
                          value={scholarUrl}
                          onChange={(e) => setScholarUrl(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                          placeholder="https://scholar.google.com/citations?user=..."
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        We will analyze your profile to generate a professional
                        summary.
                      </p>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setBioMode("VIEW");
                          setScholarUrl("");
                        }}
                        disabled={bioSaving}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleImportScholar}
                        disabled={bioSaving || !scholarUrl}
                      >
                        {bioSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          "Import"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
