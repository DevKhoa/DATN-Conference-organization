import React, { useState, useRef } from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  FileText,
  Tag,
  Image as ImageIcon,
  Upload,
  Trash2,
  CheckCircle,
  Save,
  Loader2,
  Plus,
  X,
  AlertCircle,
  FileInput,
} from "lucide-react";
import Button from "../components/ui/Button";
import { supabase } from "../lib/supabase";

interface CreateConferenceProps {
  onNavigateBack: () => void;
  userRoleId: number;
}

const BASE_API_URL = import.meta.env.VITE_API_BASE_URL as string;

const CreateConference: React.FC<CreateConferenceProps> = ({
  onNavigateBack,
  userRoleId,
}) => {
  // --- Security Check ---
  if (userRoleId !== 1 && userRoleId !== 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
          <p className="text-slate-500 mt-2 mb-6">
            You do not have permission to create conferences.
          </p>
          <Button onClick={onNavigateBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  // --- State ---
  const [step, setStep] = useState<1 | 2>(1); // 1: Details, 2: Banners
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confId, setConfId] = useState<number | null>(null);

  // Form Data
  const [formData, setFormData] = useState({
    conf_name: "",
    description: "",
    location: "",
    start_date: "",
    end_date: "",
    status: "DRAFT",
    is_active: false,
    open_for_papers: true, // <--- MỚI: Mặc định cho phép nộp bài
  });

  // Keywords
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);

  // Banners
  const [bannerUrls, setBannerUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers: Step 1 (Create) ---

  const handleKeywordAdd = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && keywordInput.trim()) {
      e.preventDefault();
      if (!keywords.includes(keywordInput.trim())) {
        setKeywords([...keywords, keywordInput.trim()]);
      }
      setKeywordInput("");
    }
  };

  const removeKeyword = (tag: string) => {
    setKeywords(keywords.filter((k) => k !== tag));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.conf_name || !formData.start_date || !formData.end_date) {
      setError("Please fill in all required fields.");
      return;
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      setError("Start date cannot be after end date.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Tách conf_id ra (nếu có) để tránh gửi lên, Supabase tự sinh ID
      const { conf_id, ...restData } = formData as any;

      const payload = {
        ...restData, // Bao gồm cả open_for_papers
        keywords: keywords,
        banner_urls: [],
      };

      const { data, error } = await supabase
        .from("conferences")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setConfId(data.conf_id);
        setStep(2);
      }
    } catch (err: any) {
      console.error("Creation Error:", err);
      setError("Failed to create conference. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers: Step 2 (Banners) ---
  // (Giữ nguyên logic upload banner như cũ)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !confId) return;

    setUploading(true);
    setError("");

    try {
      const formPayload = new FormData();
      formPayload.append("file", file);

      const response = await fetch(
        `${BASE_API_URL}/conferences/${confId}/banners`,
        {
          method: "POST",
          body: formPayload,
        },
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Upload failed");

      if (result.all_banners) {
        setBannerUrls(result.all_banners);
        await supabase
          .from("conferences")
          .update({ banner_urls: result.all_banners })
          .eq("conf_id", confId);
      }
    } catch (err: any) {
      console.error("Upload Error:", err);
      setError("Failed to upload banner. " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteBanner = async (urlToRemove: string) => {
    if (!confId) return;
    const oldBanners = [...bannerUrls];
    setBannerUrls((prev) => prev.filter((url) => url !== urlToRemove));

    try {
      const response = await fetch(
        `${BASE_API_URL}/conferences/${confId}/banners`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url_to_remove: urlToRemove }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Delete failed");

      if (result.remaining_banners) {
        setBannerUrls(result.remaining_banners);
        await supabase
          .from("conferences")
          .update({ banner_urls: result.remaining_banners })
          .eq("conf_id", confId);
      }
    } catch (err: any) {
      console.error("Delete Error:", err);
      setError("Failed to delete banner.");
      setBannerUrls(oldBanners);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Create Conference
            </h1>
            <p className="text-slate-500 mt-1">Setup a new academic event.</p>
          </div>
          <Button variant="ghost" onClick={onNavigateBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
          </Button>
        </div>

        {/* Progress Stepper */}
        <div className="mb-8">
          <div className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full font-bold transition-colors ${step >= 1 ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500"}`}
            >
              1
            </div>
            <div className="ml-3 font-medium text-slate-900">Details</div>
            <div className="flex-grow h-0.5 mx-4 bg-slate-200">
              <div
                className={`h-full bg-brand-600 transition-all duration-500 ${step === 2 ? "w-full" : "w-0"}`}
              ></div>
            </div>
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full font-bold transition-colors ${step >= 2 ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500"}`}
            >
              2
            </div>
            <div className="ml-3 font-medium text-slate-900">
              Banners & Assets
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-sm border border-red-100 animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />{" "}
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: FORM */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 animate-in slide-in-from-right-4">
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Conference Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.conf_name}
                  onChange={(e) =>
                    setFormData({ ...formData, conf_name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  placeholder="e.g. International Conference on AI 2025"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Description
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                  <textarea
                    rows={5}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-y"
                    placeholder="Detailed description of the conference..."
                  />
                </div>
              </div>

              {/* Dates & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, start_date: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="date"
                      required
                      value={formData.end_date}
                      onChange={(e) =>
                        setFormData({ ...formData, end_date: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="e.g. London, UK or Virtual"
                  />
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Keywords
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeywordAdd}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="Type keyword and press Enter..."
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {keywords.map((k, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-sm font-medium border border-brand-100"
                    >
                      {k}{" "}
                      <button
                        type="button"
                        onClick={() => removeKeyword(k)}
                        className="ml-2 hover:text-brand-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Status & Options Row */}
              <div className="pt-6 border-t border-slate-100">
                {/* Status Dropdown */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                  >
                    <option value="DRAFT">Draft (Planning)</option>
                    <option value="OPEN">Open (Live)</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                {/* Toggle Switches Container */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-12">
                  {/* Toggle: Publish Conference */}
                  <label className="flex items-center cursor-pointer relative group">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_active: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                    <span className="ml-3 text-sm font-medium text-slate-700 group-hover:text-brand-700 transition-colors">
                      Publish Conference
                    </span>
                  </label>

                  {/* Toggle: Open For Papers (MỚI) */}
                  <label className="flex items-center cursor-pointer relative group">
                    <input
                      type="checkbox"
                      checked={formData.open_for_papers}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          open_for_papers: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-3 text-sm font-medium text-slate-700 group-hover:text-blue-700 transition-colors">
                      Accepting Papers
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="w-full md:w-auto"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Save className="w-5 h-5 mr-2" />
                  )}
                  Create & Continue
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: BANNERS - (Giữ nguyên) */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 animate-in slide-in-from-right-4">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                Conference Created!
              </h2>
              <p className="text-slate-500 mt-2">
                Now, add some visual banners to make it stand out.
              </p>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center">
                <ImageIcon className="w-4 h-4 mr-2 text-brand-600" /> Banner
                Gallery
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-brand-400 cursor-pointer flex flex-col items-center justify-center text-slate-500 hover:text-brand-600 transition-all group"
                >
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  ) : (
                    <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="text-sm font-medium">
                    {uploading ? "Uploading..." : "Add Banner"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </div>

                {bannerUrls.map((url, index) => (
                  <div
                    key={index}
                    className="relative group aspect-video rounded-xl overflow-hidden bg-slate-100 shadow-sm border border-slate-200"
                  >
                    <img
                      src={url}
                      alt={`Banner ${index}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => handleDeleteBanner(url)}
                        className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg transform hover:scale-105 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 italic">
                Recommended size: 1920x600px. Formats: JPG, PNG.
              </p>
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-slate-100">
              <div className="text-sm text-slate-500">
                {bannerUrls.length} banner(s) uploaded.
              </div>
              <Button onClick={onNavigateBack} variant="primary" size="lg">
                Finish & View List
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateConference;
