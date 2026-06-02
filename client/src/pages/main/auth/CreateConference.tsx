import React, { useState, useRef } from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  FileText,
  Tag,
  Image as ImageIcon,
  Trash2,
  CheckCircle,
  Save,
  Loader2,
  Plus,
  X,
  AlertCircle,
  Globe,
  Video,
} from "lucide-react";
import TimezoneSelect, { type ITimezoneOption } from "react-timezone-select";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import {
  useCreateConferenceMutation,
  useDeleteConferenceBannerMutation,
  useUploadConferenceBannerMutation,
} from "@/features/conferences/services/mutations";
import { ICreateConferencePayload } from "@/features/conferences/services/mutations/types";

const CreateConferencePage: React.FC = () => {
  const navigate = useNavigate();
  const createConferenceMutation = useCreateConferenceMutation();
  const uploadBannerMutation = useUploadConferenceBannerMutation();
  const deleteBannerMutation = useDeleteConferenceBannerMutation();

  // --- State ---
  const [step, setStep] = useState<1 | 2>(1); // 1: Details, 2: Banners
  const [error, setError] = useState("");
  const [confId, setConfId] = useState<number | null>(null);

  // Form Data
  const [formData, setFormData] = useState<ICreateConferencePayload>({
    conf_name: "",
    description: "",
    location: "",
    start_date: "",
    end_date: "",
    status: "DRAFT",
    is_active: false,
    open_for_papers: true,
    format_type: "in-person",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    max_chairs_per_session: 1,
  });

  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [pendingTimezone, setPendingTimezone] = useState<string>("");

  // Keywords
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);

  // Banners
  const [bannerUrls, setBannerUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loading = createConferenceMutation.isPending;
  const uploading =
    uploadBannerMutation.isPending || deleteBannerMutation.isPending;

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

  const handleTimezoneChange = (selectedTimezone: any) => {
    const tzValue =
      typeof selectedTimezone === "string"
        ? selectedTimezone
        : selectedTimezone.value;
    const currentBrowserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (tzValue !== currentBrowserTz) {
      setPendingTimezone(tzValue);
      setShowTimezoneModal(true);
    } else {
      setFormData({ ...formData, timezone: tzValue });
    }
  };

  const confirmTimezoneChange = () => {
    setFormData({ ...formData, timezone: pendingTimezone });
    setShowTimezoneModal(false);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.conf_name || !formData.start_date || !formData.end_date) {
      setError("Please fill in all required fields.");
      return;
    }

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      setError("Start date cannot be in the past.");
      return;
    }

    if (startDate >= endDate) {
      setError("Start date must be strictly before end date.");
      return;
    }

    if (confId) {
      setStep(2);
      return;
    }

    setError("");

    try {
      const payload = {
        ...formData,
        keywords: keywords,
        banner_urls: [],
        create_time: new Date().toISOString(),
      };

      const result = await createConferenceMutation.mutateAsync(payload);

      if (result) {
        setConfId(result.conf_id);
        setStep(2);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError("Failed to create conference. " + message);
    }
  };

  // --- Handlers: Step 2 (Banners) ---
  // (Giữ nguyên logic upload banner như cũ)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !confId) return;

    setError("");

    try {
      const result = await uploadBannerMutation.mutateAsync({
        conferenceId: confId,
        file,
      });
      setBannerUrls(result.all_banners);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError("Failed to upload banner. " + message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteBanner = async (urlToRemove: string) => {
    if (!confId) return;
    const oldBanners = [...bannerUrls];
    setBannerUrls((prev) => prev.filter((url) => url !== urlToRemove));

    try {
      const result = await deleteBannerMutation.mutateAsync({
        conferenceId: confId,
        url_to_remove: urlToRemove,
      });
      setBannerUrls(result.remaining_banners);
    } catch {
      setError("Failed to delete banner.");
      setBannerUrls(oldBanners);
    }
  };

  return (
    <DefaultLayout meta={{ title: "Create Conference" }}>
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
            <Button
              id="btn-cancel-create"
              variant="ghost"
              onClick={() => navigate({ to: "/conferences" })}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
            </Button>
          </div>

          {/* Progress Stepper (Updated UI) */}
          <div className="mb-12">
            <div className="flex items-center justify-between relative max-w-sm mx-auto">
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-border z-0"></div>

              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                    step >= 1
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  1
                </div>
                <span
                  className={`absolute top-10 whitespace-nowrap text-sm font-medium ${step >= 1 ? "text-foreground" : "text-muted-foreground"}`}
                >
                  Details
                </span>
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                    step >= 2
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  2
                </div>
                <span
                  className={`absolute top-10 whitespace-nowrap text-sm font-medium ${step >= 2 ? "text-foreground" : "text-muted-foreground"}`}
                >
                  Banners & Assets
                </span>
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
                    id="form-conf-name"
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
                      id="form-conf-desc"
                      rows={5}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-y"
                      placeholder="Detailed description of the conference..."
                    />
                  </div>
                </div>

                {/* Format & Timezone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Format <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Video className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <select
                        id="form-format"
                        required
                        value={formData.format_type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            format_type: e.target.value,
                          })
                        }
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                      >
                        <option value="in-person">In-person</option>
                        <option value="virtual">Virtual</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Timezone <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <TimezoneSelect
                        value={formData.timezone}
                        onChange={handleTimezoneChange}
                        classNamePrefix="react-select"
                        className="text-sm"
                      />
                    </div>
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
                        id="date-start-date"
                        type="date"
                        required
                        value={formData.start_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            start_date: e.target.value,
                          })
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
                        id="date-end-date"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Max Chairs Per Session{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Plus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        id="form-max-chairs"
                        type="number"
                        min={1}
                        required
                        value={formData.max_chairs_per_session || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({
                            ...formData,
                            max_chairs_per_session:
                              val === "" ? 0 : parseInt(val),
                          });
                        }}
                        onBlur={() => {
                          if (
                            !formData.max_chairs_per_session ||
                            formData.max_chairs_per_session < 1
                          ) {
                            setFormData({
                              ...formData,
                              max_chairs_per_session: 1,
                            });
                          }
                        }}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                        placeholder="e.g. 1"
                        inputMode="numeric"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Maximum number of chairs that can be assigned to a single
                      session.
                    </p>
                  </div>

                  {/* Status Dropdown */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Status
                    </label>
                    <select
                      id="form-status"
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
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      id="form-location"
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
                      id="array-keyword-input"
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
                          id={`btn-remove-keyword-${i}`}
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

                {/* Options Row */}
                <div className="pt-6 border-t border-slate-100">
                  {/* Toggle Switches Container */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-12">
                    {/* Toggle: Publish Conference */}
                    <label className="flex items-center cursor-pointer relative group">
                      <input
                        id="btn-publish-toggle"
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
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ml-3 text-sm font-medium text-slate-700 group-hover:text-brand-700 transition-colors">
                        Publish Conference
                      </span>
                    </label>

                    {/* Toggle: Open For Papers (MỚI) */}
                    <label className="flex items-center cursor-pointer relative group">
                      <input
                        id="btn-accept-papers-toggle"
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
                    id="btn-submit-create"
                    type="submit"
                    size="lg"
                    disabled={loading}
                    className="w-full md:w-auto"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : !confId ? (
                      <Save className="w-5 h-5 mr-2" />
                    ) : null}
                    {confId ? "Next Step" : "Create & Continue"}
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
                    id="btn-upload-banner-area"
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
                      id="form-banner-file"
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
                          id={`btn-delete-banner-${index}`}
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

              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pt-6 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  size="lg"
                  className="w-full sm:w-[120px]"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>

                <div className="flex items-center gap-4 flex-1 sm:flex-none">
                  <div className="text-sm text-slate-500 hidden sm:block">
                    {bannerUrls.length} banner(s) uploaded.
                  </div>
                  <Button
                    id="btn-finish-setup"
                    onClick={() => navigate({ to: "/conferences" })}
                    size="lg"
                    className="flex-1 sm:flex-none"
                  >
                    Finish & View List
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timezone Confirmation Modal */}
      {showTimezoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Confirm Timezone Change
            </h3>
            <p className="text-slate-600 text-sm mb-6">
              Múi giờ bạn chọn (<strong>{pendingTimezone}</strong>) khác với múi
              giờ hiện tại của hệ thống (
              <strong>
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </strong>
              ). Bạn có chắc chắn muốn áp dụng múi giờ này cho toàn bộ hội nghị
              không?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowTimezoneModal(false)}
              >
                Hủy
              </Button>
              <Button onClick={confirmTimezoneChange}>Xác nhận</Button>
            </div>
          </div>
        </div>
      )}
    </DefaultLayout>
  );
};

export default CreateConferencePage;
