import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Search,
  User,
  Loader2,
  ChevronRight,
  BookOpen,
  Layers,
  Calendar,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import useAuth from "@/features/auth/hooks/useAuth";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import {
  useSubmitAuthorsQuery,
  useSubmitExistingPapersQuery,
  useSubmitOpenConferencesQuery,
} from "@/features/papers/services/queries";
import {
  useCreatePaperMutation,
  useUploadPaperVersionMutation,
} from "@/features/papers/services/mutations";
import type { SubmitAuthor } from "@/features/papers/types";

const SubmitPaper: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const currentUserId = session?.user?.user_metadata["user_id"] as
    | number
    | undefined;

  // --- State ---
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Search States
  const [confSearch, setConfSearch] = useState(""); // <--- MỚI: State tìm kiếm hội nghị
  const [authorSearch, setAuthorSearch] = useState("");
  const [paperSearch, setPaperSearch] = useState("");

  // Selections & Inputs
  const [selectedConfId, setSelectedConfId] = useState<number | null>(null);
  const [submissionType, setSubmissionType] = useState<"NEW" | "VERSION">(
    "NEW",
  );

  // Step 2: New Paper Form
  const [paperTitle, setPaperTitle] = useState("");
  const [paperAbstract, setPaperAbstract] = useState("");
  const [selectedAuthorId, setSelectedAuthorId] = useState<number | null>(null);
  const [coAuthorSearch, setCoAuthorSearch] = useState("");
  const [selectedCoAuthors, setSelectedCoAuthors] = useState<SubmitAuthor[]>(
    [],
  );

  // Step 2: Existing Paper Selection
  const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null);

  // Step 3: File Upload
  const [file, setFile] = useState<File | null>(null);
  const [displayVersion, setDisplayVersion] = useState(true);

  const {
    data: conferences = [],
    isLoading: conferencesLoading,
    error: conferencesError,
  } = useSubmitOpenConferencesQuery();

  const {
    data: authors = [],
    isLoading: authorsLoading,
    error: authorsError,
  } = useSubmitAuthorsQuery();

  const { data: existingPapers = [], isLoading: papersLoading } =
    useSubmitExistingPapersQuery(selectedConfId, submissionType === "VERSION");

  const createPaperMutation = useCreatePaperMutation();
  const uploadVersionMutation = useUploadPaperVersionMutation();
  const loading =
    createPaperMutation.isPending || uploadVersionMutation.isPending;

  // --- Logic Handlers ---
  const handleCreatePaper = async () => {
    if (!paperTitle || !paperAbstract || !selectedAuthorId || !selectedConfId) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");

    try {
      const result = await createPaperMutation.mutateAsync({
        title: paperTitle,
        abstract: paperAbstract,
        primaryAuthorId: selectedAuthorId,
        conferenceId: selectedConfId,
        coAuthorIds: selectedCoAuthors.map((author) => author.user_id),
      });

      setSelectedPaperId(result.paper_id);
      setStep(3);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create paper.";
      setError(message);
    }
  };

  const handleSkipUpload = () => {
    setSuccess(true);
    setTimeout(() => navigate({ to: "/papers" }), 2000);
  };

  const handleUploadVersion = async () => {
    if (!file || !selectedPaperId || !currentUserId) {
      setError("Please select a file.");
      return;
    }

    setError("");

    try {
      await uploadVersionMutation.mutateAsync({
        paperId: selectedPaperId,
        uploaderId: currentUserId,
        file,
        display: displayVersion,
      });

      setSuccess(true);
      setTimeout(() => navigate({ to: "/papers" }), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setError(err.message);
      setError(message);
    }
  };

  // --- Helpers ---
  const filteredConferences = useMemo(
    () =>
      conferences.filter(
        (conf) =>
          conf.conf_name.toLowerCase().includes(confSearch.toLowerCase()) ||
          (conf.location &&
            conf.location.toLowerCase().includes(confSearch.toLowerCase())),
      ),
    [conferences, confSearch],
  );

  const filteredAuthors = useMemo(
    () =>
      authors.filter((author) =>
        author.full_name.toLowerCase().includes(authorSearch.toLowerCase()),
      ),
    [authors, authorSearch],
  );

  const filteredCoAuthors = useMemo(
    () =>
      authors.filter(
        (author) =>
          author.full_name
            .toLowerCase()
            .includes(coAuthorSearch.toLowerCase()) &&
          author.user_id !== selectedAuthorId &&
          !selectedCoAuthors.some(
            (coAuthor) => coAuthor.user_id === author.user_id,
          ),
      ),
    [authors, coAuthorSearch, selectedAuthorId, selectedCoAuthors],
  );

  const filteredExistingPapers = useMemo(
    () =>
      existingPapers.filter((paper) =>
        paper.title.toLowerCase().includes(paperSearch.toLowerCase()),
      ),
    [existingPapers, paperSearch],
  );

  const queryErrorMessage =
    (conferencesError instanceof Error && conferencesError.message) ||
    (authorsError instanceof Error && authorsError.message) ||
    "Failed to load submit page data.";

  return (
    <DefaultLayout meta={{ title: "Submit Paper" }}>
      <div className="min-h-screen bg-background text-foreground font-sans py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Submit Paper
              </h1>
              <p className="text-muted-foreground mt-1">
                {step === 1 && "Select a conference to begin."}
                {step === 2 && "Enter paper details."}
                {step === 3 && "Upload paper file."}
              </p>
            </div>
            <Button variant="ghost" onClick={() => navigate({ to: "/papers" })}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
            </Button>
          </div>

          {/* Progress Bar */}
          {!success && (
            <div className="mb-8">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-border z-0"></div>
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                      step >= s
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success / Error Messages */}
          {success && (
            <div className="bg-card rounded-xl shadow-sm border border-secondary/40 p-12 text-center animate-in fade-in zoom-in-95">
              <div className="w-20 h-20 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-secondary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Submission Successful!
              </h2>
              <p className="text-muted-foreground">Redirecting...</p>
            </div>
          )}
          {!success && error && (
            <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg flex items-start gap-3 text-sm border border-destructive/20 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />{" "}
              <span>{error}</span>
            </div>
          )}
          {!success && !error && (conferencesError || authorsError) && (
            <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg flex items-start gap-3 text-sm border border-destructive/20 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />{" "}
              <span>{queryErrorMessage}</span>
            </div>
          )}

          {/* --- STEP 1: SELECT CONFERENCE --- */}
          {!success && step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              {/* THANH TÌM KIẾM HỘI NGHỊ (MỚI) */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                  type="text"
                  value={confSearch}
                  onChange={(e) => setConfSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background shadow-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none text-foreground"
                  placeholder="Search conferences by name or location..."
                />
              </div>

              {/* Danh sách Hội nghị */}
              <div className="space-y-3">
                {conferencesLoading ? (
                  <div className="p-8 bg-card rounded-xl text-center border border-border">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    <p className="text-muted-foreground">
                      Loading conferences...
                    </p>
                  </div>
                ) : conferences.length === 0 ? (
                  <div className="p-8 bg-card rounded-xl text-center border border-dashed border-border">
                    <p className="text-muted-foreground">
                      No conferences are currently accepting submissions.
                    </p>
                  </div>
                ) : filteredConferences.length === 0 ? (
                  /* Hiển thị khi tìm kiếm không thấy kết quả */
                  <div className="p-8 text-center text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                    <p>No conferences found matching "{confSearch}"</p>
                  </div>
                ) : (
                  filteredConferences.map((conf) => (
                    <div
                      key={conf.conf_id}
                      onClick={() => {
                        setSelectedConfId(conf.conf_id);
                        setStep(2);
                      }}
                      className="group bg-card p-5 rounded-xl border border-border shadow-sm hover:border-primary/40 hover:shadow-md cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <h3 className="text-lg font-bold text-foreground group-hover:text-primary">
                          {conf.conf_name}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1" />{" "}
                            {conf.start_date
                              ? new Date(conf.start_date).toLocaleDateString()
                              : "Date TBD"}
                          </span>
                          {conf.location && (
                            <span className="flex items-center">
                              <MapPin className="w-3.5 h-3.5 mr-1" />{" "}
                              {conf.location}
                            </span>
                          )}
                          <span className="flex items-center text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium border border-green-100">
                            Open
                          </span>
                        </div>
                      </div>
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* --- STEP 2: DETAILS --- */}
          {!success && step === 2 && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-6 md:p-8 animate-in slide-in-from-right-4">
              {/* Toggle Type */}
              <div className="flex p-1 bg-muted rounded-lg mb-8">
                <button
                  onClick={() => setSubmissionType("NEW")}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${submissionType === "NEW" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" /> New Paper
                  </span>
                </button>
                <button
                  onClick={() => setSubmissionType("VERSION")}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${submissionType === "VERSION" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Layers className="w-4 h-4" /> New Version
                  </span>
                </button>
              </div>

              {/* Form A: New Paper */}
              {submissionType === "NEW" && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Paper Title
                    </label>
                    <input
                      type="text"
                      value={paperTitle}
                      onChange={(e) => setPaperTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring outline-none"
                      placeholder="Enter the full title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Abstract
                    </label>
                    <textarea
                      rows={5}
                      value={paperAbstract}
                      onChange={(e) => setPaperAbstract(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring outline-none resize-none"
                      placeholder="Enter paper abstract..."
                    />
                  </div>

                  {/* Author Search */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Primary Author
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <input
                        type="text"
                        value={authorSearch}
                        onChange={(e) => {
                          setAuthorSearch(e.target.value);
                          setSelectedAuthorId(null);
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none ${selectedAuthorId ? "border-green-500 bg-green-50" : "border-input bg-background text-foreground focus:ring-2 focus:ring-ring"}`}
                        placeholder="Search author by name..."
                      />
                      {selectedAuthorId && (
                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5" />
                      )}
                    </div>
                    {authorSearch && !selectedAuthorId && (
                      <div className="absolute z-10 w-full bg-card border border-border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                        {filteredAuthors.map((author) => (
                          <div
                            key={author.user_id}
                            onClick={() => {
                              setSelectedAuthorId(author.user_id);
                              setAuthorSearch(author.full_name);
                            }}
                            className="px-4 py-2 hover:bg-accent cursor-pointer text-sm text-foreground border-b border-border last:border-0"
                          >
                            <div className="font-medium">
                              {author.full_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {author.email}
                            </div>
                          </div>
                        ))}
                        {filteredAuthors.length === 0 && (
                          <div className="px-4 py-3 text-sm text-muted-foreground italic">
                            No authors found.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Co-Authors Search */}
                  <div className="relative mt-4">
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Co-Authors (Optional)
                    </label>

                    {selectedCoAuthors.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedCoAuthors.map((coAuthor) => (
                          <span
                            key={coAuthor.user_id}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                          >
                            {coAuthor.full_name}
                            <button
                              onClick={() =>
                                setSelectedCoAuthors((previous) =>
                                  previous.filter(
                                    (item) => item.user_id !== coAuthor.user_id,
                                  ),
                                )
                              }
                              className="ml-1.5 text-primary/70 hover:text-primary"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <input
                        type="text"
                        value={coAuthorSearch}
                        onChange={(e) => setCoAuthorSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring outline-none"
                        placeholder="Search co-author by name..."
                      />
                    </div>

                    {coAuthorSearch && (
                      <div className="absolute z-10 w-full bg-card border border-border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                        {filteredCoAuthors.map((author) => (
                          <div
                            key={author.user_id}
                            onClick={() => {
                              setSelectedCoAuthors((previous) => [
                                ...previous,
                                author,
                              ]);
                              setCoAuthorSearch("");
                            }}
                            className="px-4 py-2 hover:bg-accent cursor-pointer text-sm text-foreground border-b border-border last:border-0"
                          >
                            <div className="font-medium">
                              {author.full_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {author.email}
                            </div>
                          </div>
                        ))}
                        {filteredCoAuthors.length === 0 && (
                          <div className="px-4 py-3 text-sm text-muted-foreground italic">
                            No available authors found.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      disabled={loading}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button onClick={handleCreatePaper} disabled={loading}>
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        "Next Step"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Form B: Version */}
              {submissionType === "VERSION" && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Select Existing Paper
                    </label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <input
                        type="text"
                        value={paperSearch}
                        onChange={(e) => {
                          setPaperSearch(e.target.value);
                          setSelectedPaperId(null);
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none ${selectedPaperId ? "border-green-500 bg-green-50" : "border-input bg-background text-foreground focus:ring-2 focus:ring-ring"}`}
                        placeholder="Search paper title..."
                      />
                      {selectedPaperId && (
                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5" />
                      )}
                    </div>
                    {paperSearch && !selectedPaperId && (
                      <div className="absolute z-10 w-full bg-card border border-border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                        {filteredExistingPapers.map((paper) => (
                          <div
                            key={paper.paper_id}
                            onClick={() => {
                              setSelectedPaperId(paper.paper_id);
                              setPaperSearch(paper.title);
                            }}
                            className="px-4 py-2 hover:bg-accent cursor-pointer text-sm text-foreground border-b border-border last:border-0"
                          >
                            <div className="font-medium line-clamp-1">
                              {paper.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Author: {paper.author_name}
                            </div>
                          </div>
                        ))}
                        {papersLoading ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground">
                            Loading papers...
                          </div>
                        ) : filteredExistingPapers.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground italic">
                            No papers found.
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={() => selectedPaperId && setStep(3)}
                      disabled={!selectedPaperId}
                    >
                      Next Step
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- STEP 3: UPLOAD --- */}
          {!success && step === 3 && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-6 md:p-8 animate-in slide-in-from-right-4">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  Upload PDF
                </h2>
              </div>

              <div className="space-y-6 max-w-md mx-auto">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 bg-muted hover:bg-accent transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept="application/pdf"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  {file ? (
                    <div className="text-center">
                      <FileText className="w-10 h-10 text-primary mx-auto mb-2" />
                      <p className="font-bold text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="font-medium text-foreground">
                        Click to Browse
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF Only (Max 10MB)
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={displayVersion}
                      onChange={(e) => setDisplayVersion(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-ring"
                    />
                    <span className="ml-2 text-sm text-foreground">
                      Display this version in archive?
                    </span>
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => setStep(2)}
                    variant="outline"
                    className="sm:w-[120px]"
                    size="lg"
                    disabled={loading}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleSkipUpload}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                    disabled={loading}
                  >
                    Skip Upload
                  </Button>
                  <Button
                    onClick={handleUploadVersion}
                    className="flex-1"
                    size="lg"
                    disabled={loading || !file}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      "Submit Paper"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DefaultLayout>
  );
};

export default SubmitPaper;
