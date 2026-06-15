import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  Building,
  FileText,
  Calendar,
  Edit2,
  Save,
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
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "@tanstack/react-router";
import useAuth from "@/features/auth/hooks/useAuth";
import { Role } from "@/features/auth/types";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import { useMyProfileQuery, useUserProfileByEmailQuery } from "@/features/users/services/queries";
import { useSearch } from "@tanstack/react-router";
import {
  useImportScholarMutation,
  useUpdateBasicInfoMutation,
  useUpdateDescriptionMutation,
  useUploadAvatarMutation,
  useUploadCVMutation,
} from "@/features/users/services/mutations";

// --- INTERFACES ---
interface UserProfile {
  user_id: number;
  full_name: string;
  email: string;
  organization: string | null;
  description: string | null;
  created_at: string;
  role_name?: string;
  role_id?: number; // Added
  avatar_url: string | null;
  google_refresh_token: string | null;
}

const BASE_API_URL = ((import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8080").replace(/\/$/, "");

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { session, roles } = useAuth();
  const searchParams = useSearch({ strict: false });
  const viewEmail = (searchParams as any)?.email;
  const isPublicView = Boolean(viewEmail && session?.user?.email !== viewEmail);
  // --- STATE ---
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Basic Info State
  const [basicEditMode, setBasicEditMode] = useState(false);
  const [basicData, setBasicData] = useState({
    full_name: "",
    organization: "",
  });

  // Google Connect State
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  // Bio/Description State
  const [bioMode, setBioMode] = useState<"VIEW" | "MANUAL" | "CV" | "SCHOLAR">(
    "VIEW",
  );
  const [manualBio, setManualBio] = useState("");
  const [scholarUrl, setScholarUrl] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);

  // Messages
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Refs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);

  const myProfileQuery = useMyProfileQuery();
  const publicProfileQuery = useUserProfileByEmailQuery(isPublicView ? viewEmail : undefined);

  const activeQuery = isPublicView ? publicProfileQuery : myProfileQuery;
  const profileData = activeQuery.data;
  const loading = activeQuery.isLoading;
  const isFetching = activeQuery.isFetching;
  const profileError = activeQuery.error;
  const refetch = activeQuery.refetch;

  const updateBasicInfoMutation = useUpdateBasicInfoMutation();
  const uploadAvatarMutation = useUploadAvatarMutation();
  const updateDescriptionMutation = useUpdateDescriptionMutation();
  const uploadCVMutation = useUploadCVMutation();
  const importScholarMutation = useImportScholarMutation();

  const basicSaving = updateBasicInfoMutation.isPending;
  const uploadingAvatar = uploadAvatarMutation.isPending;
  const bioSaving =
    updateDescriptionMutation.isPending ||
    uploadCVMutation.isPending ||
    importScholarMutation.isPending;

  // --- EFFECTS ---

  useEffect(() => {
    if (!profileData) return;

    setProfile(profileData as UserProfile);
    setBasicData({
      full_name: profileData.full_name || "",
      organization: profileData.organization || "",
    });
    setManualBio(profileData.description || "");
  }, [profileData]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "google-auth-success") {
        refetch();
        setSuccessMsg("Google account connected successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [refetch]);

  // --- BASIC INFO HANDLERS ---

  const handleSaveBasicInfo = async () => {
    if (!profile) return;
    setError("");
    setSuccessMsg("");

    try {
      await updateBasicInfoMutation.mutateAsync({
        userId: profile.user_id,
        fullName: basicData.full_name,
        organization: basicData.organization,
      });

      setProfile({
        ...profile,
        full_name: basicData.full_name,
        organization: basicData.organization,
      });

      setSuccessMsg("Basic information updated.");
      setBasicEditMode(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      setError("Failed to update basic info.");
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

    setError("");

    try {
      const result = await uploadAvatarMutation.mutateAsync({
        userId: profile.user_id,
        file,
      });

      if (result.avatar_url) {
        setProfile({ ...profile, avatar_url: result.avatar_url });
        setSuccessMsg("Avatar updated.");
      } else {
        throw new Error("Upload failed");
      }
    } catch {
      setError("Failed to upload avatar.");
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  // --- BIO UPDATE HANDLERS ---

  // Method 1: Manual Input
  const handleSaveManualBio = async () => {
    if (!profile) return;
    setError("");

    try {
      await updateDescriptionMutation.mutateAsync({
        userId: profile.user_id,
        description: manualBio,
      });

      setProfile({ ...profile, description: manualBio });
      setSuccessMsg("Bio updated successfully.");
      setBioMode("VIEW");
    } catch (e) {
      console.error(e);
      setError("Failed to update bio.");
    } finally {
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  // Method 2: Upload CV
  const handleUploadCV = async () => {
    if (!profile || !cvFile) {
      setError("Please select a PDF file.");
      return;
    }
    setError("");

    try {
      await uploadCVMutation.mutateAsync({
        userId: profile.user_id,
        file: cvFile,
      });

      setSuccessMsg("CV uploaded & bio extracted successfully.");
      // Refresh profile to get the extracted description
      await refetch();
      setBioMode("VIEW");
      setCvFile(null);
    } catch {
      setError("Failed to upload CV.");
    } finally {
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
    setError("");

    try {
      await importScholarMutation.mutateAsync({
        userId: profile.user_id,
        scholarUrl,
      });

      setSuccessMsg("Scholar profile imported successfully.");
      // Refresh profile to get the extracted description
      await refetch();
      setBioMode("VIEW");
      setScholarUrl("");
    } catch {
      setError("Failed to import Scholar profile.");
    } finally {
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  // --- INTEGRATION HANDLERS ---
  const handleConnectGoogle = async () => {
    if (!profile?.email) return;
    setConnectingGoogle(true);
    setError("");
    try {
      const response = await fetch(
        `${BASE_API_URL}/sessions/google-auth-url?email=${encodeURIComponent(profile.email)}`,
      );      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to get auth URL. Please log in again.",
        );
      }
      if (data.auth_url) {
        // Open in popup to allow postMessage communication
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        window.open(
          data.auth_url,
          "GoogleAuthPopup",
          `width=${width},height=${height},left=${left},top=${top}`,
        );
      }
    } catch (e: any) {
      setError(
        e.message ||
          "Failed to get auth URL. Please log in again or try later.",
      );
    } finally {
      setConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = () => {
    setShowDisconnectConfirm(true);
  };

  const confirmDisconnectGoogle = async () => {
    if (!profile?.email) return;
    setError("");
    setDisconnectingGoogle(true);
    try {
      const response = await fetch(
        `${BASE_API_URL}/sessions/google-disconnect?email=${encodeURIComponent(profile.email)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error("Failed to disconnect Google account.");
      }
      refetch();
      setSuccessMsg("Google account disconnected.");
      setTimeout(() => setSuccessMsg(""), 3000);
      setShowDisconnectConfirm(false);
    } catch (e: any) {
      setError(e.message || "Failed to disconnect Google account.");
    } finally {
      setDisconnectingGoogle(false);
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

  // Check if user is Author
  const isAuthor = roles.includes(Role.AUTHOR);

  const queryErrorMessage =
    profileError instanceof Error
      ? profileError.message
      : "Failed to load profile data.";

  if (loading) {
    return (
      <DefaultLayout meta={{ title: "My Profile" }}>
        <div className="min-h-screen bg-muted/20 flex items-center justify-center px-4">
          <div className="text-center p-8 bg-card rounded-2xl border border-border shadow-sm w-full max-w-lg text-foreground">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-foreground mb-1">
              Loading profile
            </h2>
            <p className="text-muted-foreground text-sm">
              We are fetching your latest account information.
            </p>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  if (profileError && !profile) {
    return (
      <DefaultLayout meta={{ title: "My Profile" }}>
        <div className="min-h-screen bg-muted/20 flex items-center justify-center px-4">
          <div className="text-center p-8 bg-card rounded-2xl border border-destructive/20 shadow-sm w-full max-w-lg text-foreground">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Could not load profile
            </h2>
            <p className="text-destructive text-sm mb-6">{queryErrorMessage}</p>
            <div className="flex items-center justify-center gap-3">
              <Button
                id="btn-retry"
                onClick={() => refetch()}
                disabled={isFetching}
                variant="outline"
                className="border-destructive/30"
              >
                {isFetching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Try Again
              </Button>
              <Button
                id="btn-dashboard-error"
                onClick={() => navigate({ to: "/" })}
              >
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout meta={{ title: "My Profile" }}>
      <div className="min-h-screen bg-muted/20 pt-20 pb-12 px-4 sm:px-6 lg:px-8 font-sans text-foreground">
        <div className="max-w-5xl mx-auto">
          {/* Header Navigation */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {isPublicView ? "User Profile" : "My Profile"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isPublicView
                  ? "Viewing professional identity and information."
                  : "Manage your identity and professional information."}
              </p>
            </div>
            <button
              id="btn-back-dashboard"
              onClick={() => {
                if (isPublicView) {
                  window.history.back();
                } else {
                  navigate({ to: "/" });
                }
              }}
              className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors bg-card px-4 py-2 rounded-lg border border-border shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isPublicView ? "Back" : "Dashboard"}
            </button>
          </div>

          {/* Global Messages */}
          <div className="mb-6">
            {error && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-3 text-sm border border-destructive/20 animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" /> {error}
              </div>
            )}
            {successMsg && (
              <div className="p-4 bg-primary/10 text-primary rounded-lg flex items-center gap-3 text-sm border border-primary/20 animate-in fade-in">
                <CheckCircle className="w-5 h-5 shrink-0" /> {successMsg}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT COLUMN: Avatar & Summary (4 Cols) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-card rounded-2xl shadow-sm border border-border p-6 text-center">
                {/* Avatar */}
                <div className="relative group mx-auto mb-4 w-32 h-32">
                  <div
                    id={!isPublicView ? "btn-upload-avatar" : undefined}
                    onClick={() => !isPublicView && avatarInputRef.current?.click()}
                    className={`w-full h-full rounded-full border-4 border-card shadow-lg overflow-hidden relative bg-primary/10 flex items-center justify-center ${!isPublicView ? "cursor-pointer" : ""}`}
                    title={!isPublicView ? "Upload Avatar" : undefined}
                  >
                    {profile?.avatar_url ? (
                      <img
                        id="img-avatar"
                        src={profile.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl font-bold text-primary">
                        {getInitials(profile?.full_name || "")}
                      </span>
                    )}
                    {!isPublicView && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                    )}
                    {uploadingAvatar && !isPublicView && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      </div>
                    )}
                  </div>
                  <input
                    id="form-avatar-file"
                    type="file"
                    ref={avatarInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                  />
                </div>

                <h2 className="text-xl font-bold text-foreground">
                  {profile?.full_name}
                </h2>
                <p className="text-muted-foreground text-sm mb-4">
                  {profile?.email}
                </p>

                <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide">
                  <Shield className="w-3 h-3 mr-1.5" />
                  {profile?.role_name || "User"}
                </div>

                <div className="mt-8 pt-6 border-t border-border text-left space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-3 text-muted-foreground" />
                    <span>
                      Joined{" "}
                      {profile?.created_at
                        ? formatDate(profile.created_at)
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 mr-3 text-primary" />
                    <span>Account Verified</span>
                  </div>
                </div>
              </div>

              {/* AUTHOR ACTION BUTTON */}
              {isAuthor && !isPublicView && (
                <Button
                  id="btn-my-papers"
                  onClick={() => navigate({ to: "/papers/me" } as any)}
                  className="w-full justify-center shadow-md"
                  size="lg"
                >
                  <BookOpen className="w-5 h-5 mr-2" />
                  My Papers Dashboard
                </Button>
              )}
            </div>

            {/* RIGHT COLUMN: Details (8 Cols) */}
            <div className="lg:col-span-8 space-y-8">
              {/* SECTION 1: BASIC INFORMATION */}
              <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-foreground">
                    Basic Information
                  </h3>
                  {!basicEditMode && !isPublicView && (
                    <Button
                      id="btn-edit-basic"
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
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <input
                          id="form-full-name"
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
                              ? "border-input focus:ring-2 focus:ring-ring bg-background"
                              : "border-input bg-muted text-muted-foreground"
                          }`}
                        />
                      </div>
                    </div>
                    {/* Organization */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Organization
                      </label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <input
                          id="form-org"
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
                              ? "border-input focus:ring-2 focus:ring-ring bg-background"
                              : "border-input bg-muted text-muted-foreground"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Email (Read Only) */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Email Address{" "}
                      <span className="text-xs text-muted-foreground font-normal">
                        (Cannot be changed)
                      </span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <input
                        id="form-email"
                        type="email"
                        disabled
                        value={profile?.email || ""}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-muted text-muted-foreground cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {basicEditMode && (
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                      <Button
                        id="btn-cancel-basic"
                        variant="ghost"
                        onClick={handleCancelBasic}
                        disabled={basicSaving}
                      >
                        Cancel
                      </Button>
                      <Button
                        id="btn-save-basic"
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
              <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                  <h3 className="text-lg font-semibold text-foreground">
                    Professional Bio
                  </h3>
                  {!isPublicView && (
                    <p className="text-xs text-muted-foreground">
                      Update your bio to improve networking & AI matching.
                    </p>
                  )}
                </div>

                <div className="p-6">
                  {/* Mode Selector */}
                  {bioMode === "VIEW" && (
                    <div className="space-y-4">
                      <div className="bg-muted p-4 rounded-xl border border-border text-foreground text-sm leading-relaxed min-h-25">
                        {profile?.description ? (
                          <ReactMarkdown
                            components={{
                              h1: ({ ...props }) => (
                                <h1
                                  className="text-2xl font-bold text-foreground mt-6 mb-4"
                                  {...props}
                                />
                              ),
                              h2: ({ ...props }) => (
                                <h2
                                  className="text-xl font-bold text-foreground mt-6 mb-3"
                                  {...props}
                                />
                              ),
                              h3: ({ ...props }) => (
                                <h3
                                  className="text-lg font-bold text-foreground mt-6 mb-2"
                                  {...props}
                                />
                              ),
                              p: ({ ...props }) => (
                                <p className="mb-4" {...props} />
                              ),
                              ul: ({ ...props }) => (
                                <ul
                                  className="list-disc pl-5 mb-4 space-y-1"
                                  {...props}
                                />
                              ),
                            }}
                          >
                            {profile.description}
                          </ReactMarkdown>
                        ) : (
                          <span className="text-muted-foreground italic">
                            No professional summary available yet.
                          </span>
                        )}
                      </div>
                      {!isPublicView && (
                        <div className="flex flex-wrap gap-3">
                          <Button
                            id="btn-edit-bio"
                            variant="outline"
                            size="sm"
                            onClick={() => setBioMode("MANUAL")}
                          >
                            <PenTool className="w-4 h-4 mr-2" /> Edit Text
                          </Button>
                          <Button
                            id="btn-upload-cv"
                            variant="outline"
                            size="sm"
                            onClick={() => setBioMode("CV")}
                          >
                            <Upload className="w-4 h-4 mr-2" /> Upload CV (PDF)
                          </Button>
                          <Button
                            id="btn-import-scholar"
                            variant="outline"
                            size="sm"
                            onClick={() => setBioMode("SCHOLAR")}
                          >
                            <LinkIcon className="w-4 h-4 mr-2" /> Import Scholar
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MODE: MANUAL */}
                  {bioMode === "MANUAL" && (
                    <div className="space-y-4 animate-in fade-in">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          Edit Bio (Markdown Supported)
                        </label>
                        <textarea
                          id="form-bio"
                          rows={10}
                          value={manualBio}
                          onChange={(e) => setManualBio(e.target.value)}
                          className="w-full p-4 rounded-lg border border-input focus:ring-2 focus:ring-ring outline-none resize-y text-sm font-mono bg-background text-foreground"
                          placeholder="Write a short professional biography using markdown (*, #, etc)..."
                        />
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button
                          id="btn-cancel-bio"
                          variant="ghost"
                          onClick={() => setBioMode("VIEW")}
                          disabled={bioSaving}
                        >
                          Cancel
                        </Button>
                        <Button
                          id="btn-save-bio"
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
                        id="btn-dropzone-cv"
                        onClick={() => cvInputRef.current?.click()}
                        className="border-2 border-dashed border-input rounded-xl p-8 hover:bg-muted cursor-pointer transition-colors"
                      >
                        <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-foreground font-medium">
                          {cvFile ? cvFile.name : "Click to Upload CV"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF format only. We'll extract your bio automatically.
                        </p>
                        <input
                          id="form-cv-file"
                          type="file"
                          ref={cvInputRef}
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) =>
                            setCvFile(e.target.files?.[0] || null)
                          }
                        />
                      </div>
                      <div className="flex justify-center gap-3">
                        <Button
                          id="btn-cancel-cv-upload"
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
                          id="btn-save-cv-upload"
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
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          Google Scholar Profile URL
                        </label>
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                          <input
                            id="form-scholar-url"
                            type="text"
                            value={scholarUrl}
                            onChange={(e) => setScholarUrl(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-ring outline-none bg-background text-foreground"
                            placeholder="https://scholar.google.com/citations?user=..."
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          We will analyze your profile to generate a
                          professional summary.
                        </p>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button
                          id="btn-cancel-scholar-import"
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
                          id="btn-save-scholar-import"
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

              {/* SECTION 3: INTEGRATIONS */}
              {!isPublicView && (
                <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                  <div className="px-6 py-4 border-b border-border bg-muted/30">
                    <h3 className="text-lg font-semibold text-foreground">
                      Integrations
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Connect third-party apps to enhance your experience.
                    </p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/50 rounded-xl border border-border gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center shadow-sm border border-border shrink-0">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">
                            Google Calendar & Meet
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Used for hosting Virtual & Hybrid sessions.
                          </p>
                        </div>
                      </div>
                      {profile?.google_refresh_token ? (
                        <Button
                          onClick={handleDisconnectGoogle}
                          variant="outline"
                          className="border-destructive/50 text-destructive hover:bg-destructive/10 w-full sm:w-auto min-w-[150px]"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Connected
                        </Button>
                      ) : (
                        <Button
                          onClick={handleConnectGoogle}
                          disabled={connectingGoogle}
                          variant="outline"
                          className="border-primary/50 text-primary hover:bg-primary/10 w-full sm:w-auto min-w-[150px]"
                        >
                          {connectingGoogle ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <LinkIcon className="w-4 h-4 mr-2" />
                          )}
                          Connect Google
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={showDisconnectConfirm}
        onOpenChange={setShowDisconnectConfirm}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Disconnect Google Account
            </DialogTitle>
            <DialogDescription className="py-4">
              Are you sure you want to disconnect your Google account? You will
              no longer be able to automatically generate Google Meet links for
              your sessions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDisconnectConfirm(false)}
              disabled={disconnectingGoogle}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDisconnectGoogle}
              disabled={disconnectingGoogle}
            >
              {disconnectingGoogle ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DefaultLayout>
  );
};

export default ProfilePage;
