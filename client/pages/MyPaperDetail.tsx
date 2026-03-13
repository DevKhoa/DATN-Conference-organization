import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  PenTool,
  BarChart2,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
} from "lucide-react";
import Button from "../components/ui/Button";
import { supabase } from "../lib/supabase";

interface MyPaperDetailProps {
  paperId: number;
  onNavigateBack: () => void;
}

const BASE_API_URL = "http://localhost:8080";

const MyPaperDetail: React.FC<MyPaperDetailProps> = ({
  paperId,
  onNavigateBack,
}) => {
  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [paper, setPaper] = useState<any>(null);
  const [latestVersion, setLatestVersion] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [error, setError] = useState("");

  // AI Tool States
  const [generatingEmbed, setGeneratingEmbed] = useState(false);

  const [checkingPlagiarism, setCheckingPlagiarism] = useState(false);
  const [plagiarismResult, setPlagiarismResult] = useState<any>(null);
  const [showPlagiarismDetails, setShowPlagiarismDetails] = useState(false);

  const [checkingGrammar, setCheckingGrammar] = useState(false);
  const [grammarResult, setGrammarResult] = useState<any>(null);
  const [showGrammarDetails, setShowGrammarDetails] = useState(false);

  // Review NLP States (Map review_id -> result)
  const [analyzingReview, setAnalyzingReview] = useState<
    Record<number, boolean>
  >({});
  const [reviewAnalysis, setReviewAnalysis] = useState<Record<number, any>>({});

  useEffect(() => {
    fetchData();
  }, [paperId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Paper
      const { data: paperData, error: paperError } = await supabase
        .from("papers")
        .select(`*, conference:conferences!submitted_conf(conf_name)`)
        .eq("paper_id", paperId)
        .single();
      if (paperError) throw paperError;
      setPaper(paperData);

      // 2. Fetch Latest Version
      const { data: versionData, error: versionError } = await supabase
        .from("paper_versions")
        .select("*")
        .eq("paper_id", paperId)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!versionError) setLatestVersion(versionData);

      // 3. Fetch Reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select(`*, reviewer:users!reviewer_id(full_name)`)
        .eq("paper_id", paperId)
        .order("review_date", { ascending: false });
      if (!reviewsError) setReviews(reviewsData || []);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load paper details.");
    } finally {
      setLoading(false);
    }
  };

  // --- AI HANDLERS ---

  const handleGenerateEmbedding = async () => {
    if (!latestVersion) return;
    setGeneratingEmbed(true);
    try {
      // POST /papers/{PAPER_ID}/{VERSION_ID}/embed
      await fetch(
        `${BASE_API_URL}/papers/${paperId}/${latestVersion.version_id}/embed`,
        { method: "POST" },
      );
      alert("Embedding generated successfully!");
    } catch (e) {
      alert("Failed to generate embedding.");
    } finally {
      setGeneratingEmbed(false);
    }
  };

  const handleCheckPlagiarism = async () => {
    if (!latestVersion) return;
    setCheckingPlagiarism(true);
    setPlagiarismResult(null);
    try {
      // POST /papers/{PAPER_ID}/{VERSION_ID}/check-plagiarism
      const res = await fetch(
        `${BASE_API_URL}/papers/${paperId}/${latestVersion.version_id}/check-plagiarism`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threshold: 0.75 }),
        },
      );
      const data = await res.json();
      setPlagiarismResult(data.analysis_result);
      setShowPlagiarismDetails(true);
    } catch (e) {
      alert("Plagiarism check failed.");
    } finally {
      setCheckingPlagiarism(false);
    }
  };

  const handleReviewFormat = async () => {
    if (!latestVersion) return;
    setCheckingGrammar(true);
    setGrammarResult(null);
    try {
      // POST /papers/{PAPER_ID}/{VERSION_ID}/review-format
      const res = await fetch(
        `${BASE_API_URL}/papers/${paperId}/${latestVersion.version_id}/review-format`,
        { method: "POST" },
      );
      const data = await res.json();
      // data.review_result is a stringified JSON
      const parsed = JSON.parse(data.review_result);
      setGrammarResult(parsed);
      setShowGrammarDetails(true);
    } catch (e) {
      console.error(e);
      alert("Format review failed.");
    } finally {
      setCheckingGrammar(false);
    }
  };

  const handleAnalyzeReview = async (reviewId: number) => {
    setAnalyzingReview((prev) => ({ ...prev, [reviewId]: true }));
    try {
      // POST /reviews/{REVIEW_ID}/analyze-nlp
      const res = await fetch(
        `${BASE_API_URL}/reviews/${reviewId}/analyze-nlp`,
        { method: "POST" },
      );
      const data = await res.json();
      setReviewAnalysis((prev) => ({ ...prev, [reviewId]: data }));
    } catch (e) {
      alert("Analysis failed.");
    } finally {
      setAnalyzingReview((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  // --- RENDER ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-xl shadow border border-red-100">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700">{error || "Paper not found"}</p>
          <Button onClick={onNavigateBack} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onNavigateBack}
            className="flex items-center text-sm text-slate-500 hover:text-brand-600 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to List
          </button>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {paper.title}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Submitted to:{" "}
                <span className="font-medium text-slate-700">
                  {paper.conference?.conf_name}
                </span>
              </p>
            </div>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              {paper.status}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: PREVIEW (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[700px] flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center">
                  <Eye className="w-4 h-4 mr-2 text-brand-500" /> Preview
                </h3>
                {latestVersion && (
                  <span className="text-xs text-slate-500">
                    Version {latestVersion.version_number} •{" "}
                    {new Date(latestVersion.upload_date).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex-grow bg-slate-100 relative">
                {latestVersion?.file_path ? (
                  <iframe
                    src={`${latestVersion.file_path}#toolbar=0`}
                    className="w-full h-full"
                    title="PDF Preview"
                  >
                    <p>PDF not supported.</p>
                  </iframe>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    No PDF available for preview.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: TOOLS & REVIEWS (1/3) */}
          <div className="lg:col-span-1 space-y-6">
            {/* AI ACTIONS CARD */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-purple-600" /> AI
                Assistant Tools
              </h3>

              <div className="space-y-3">
                {/* 1. Embedding */}
                <button
                  onClick={handleGenerateEmbedding}
                  disabled={generatingEmbed || !latestVersion}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-sm font-medium text-slate-700"
                >
                  <span className="flex items-center">
                    <BarChart2 className="w-4 h-4 mr-2 text-purple-500" />{" "}
                    Generate Embedding
                  </span>
                  {generatingEmbed && (
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  )}
                </button>

                {/* 2. Plagiarism */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={handleCheckPlagiarism}
                    disabled={checkingPlagiarism || !latestVersion}
                    className="w-full flex items-center justify-between p-3 bg-white hover:bg-red-50 transition-colors text-sm font-medium text-slate-700"
                  >
                    <span className="flex items-center">
                      <ShieldCheck className="w-4 h-4 mr-2 text-red-500" />{" "}
                      Check Plagiarism
                    </span>
                    {checkingPlagiarism && (
                      <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                    )}
                  </button>
                  {plagiarismResult && (
                    <div className="bg-red-50/50 p-3 border-t border-red-100 text-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-600">Similarity:</span>
                        <span
                          className={`font-bold ${plagiarismResult.plagiarism_percentage > 10 ? "text-red-600" : "text-green-600"}`}
                        >
                          {plagiarismResult.plagiarism_percentage.toFixed(2)}%
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setShowPlagiarismDetails(!showPlagiarismDetails)
                        }
                        className="text-xs text-red-600 underline flex items-center"
                      >
                        {showPlagiarismDetails
                          ? "Hide Details"
                          : "View Flagged Chunks"}
                        {showPlagiarismDetails ? (
                          <ChevronUp className="w-3 h-3 ml-1" />
                        ) : (
                          <ChevronDown className="w-3 h-3 ml-1" />
                        )}
                      </button>
                      {showPlagiarismDetails && plagiarismResult.details && (
                        <div className="mt-2 space-y-2 max-h-40 overflow-y-auto text-xs bg-white p-2 rounded border border-red-100">
                          {plagiarismResult.details.map(
                            (d: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-1 border-b border-slate-100 last:border-0"
                              >
                                <p className="text-red-700 font-medium truncate">
                                  Chunk {d.input_chunk_index}
                                </p>
                                <p
                                  className="text-slate-500 italic truncate"
                                  title={d.source_text}
                                >
                                  Source: {d.source_text}
                                </p>
                                <p className="text-slate-400">
                                  Similarity:{" "}
                                  {(d.source_similarity * 100).toFixed(1)}%
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Grammar */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={handleReviewFormat}
                    disabled={checkingGrammar || !latestVersion}
                    className="w-full flex items-center justify-between p-3 bg-white hover:bg-blue-50 transition-colors text-sm font-medium text-slate-700"
                  >
                    <span className="flex items-center">
                      <PenTool className="w-4 h-4 mr-2 text-blue-500" /> Review
                      Grammar & Format
                    </span>
                    {checkingGrammar && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    )}
                  </button>
                  {grammarResult && (
                    <div className="bg-blue-50/50 p-3 border-t border-blue-100 text-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-600">Issues Found:</span>
                        <span className="font-bold text-blue-700">
                          {grammarResult.grammar_review?.length || 0}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setShowGrammarDetails(!showGrammarDetails)
                        }
                        className="text-xs text-blue-600 underline flex items-center"
                      >
                        {showGrammarDetails ? "Hide Report" : "View Report"}
                        {showGrammarDetails ? (
                          <ChevronUp className="w-3 h-3 ml-1" />
                        ) : (
                          <ChevronDown className="w-3 h-3 ml-1" />
                        )}
                      </button>
                      {showGrammarDetails && (
                        <div className="mt-2 max-h-48 overflow-y-auto text-xs bg-white p-2 rounded border border-blue-100 space-y-2">
                          {/* Structure */}
                          <div className="mb-2 pb-2 border-b border-slate-100">
                            <p className="font-bold text-slate-700 mb-1">
                              Structure:
                            </p>
                            {Object.entries(
                              grammarResult.structure_review || {},
                            ).map(([k, v]) => (
                              <div key={k} className="flex items-center gap-2">
                                {v ? (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-red-500" />
                                )}
                                <span className="capitalize">
                                  {k.replace("_", " ")}
                                </span>
                              </div>
                            ))}
                          </div>
                          {/* Grammar */}
                          <div>
                            <p className="font-bold text-slate-700 mb-1">
                              Grammar:
                            </p>
                            {grammarResult.grammar_review?.map(
                              (err: any, i: number) => (
                                <div
                                  key={i}
                                  className="mb-2 p-1.5 bg-red-50 rounded border border-red-100"
                                >
                                  <p className="text-red-700 font-medium">
                                    {err.error_type}
                                  </p>
                                  <p className="text-slate-500 line-through decoration-red-400">
                                    {err.raw_text}
                                  </p>
                                  <p className="text-green-600 font-medium">
                                    → {err.correction}
                                  </p>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* REVIEWS LIST */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900">
                Reviews ({reviews.length})
              </h3>
              {reviews.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                  <p className="text-slate-400 text-sm">No reviews yet.</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div
                    key={review.review_id}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-sm text-slate-800">
                        {review.reviewer?.full_name || "Reviewer"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(review.review_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded font-medium border border-slate-200">
                        {review.recommendation}
                      </span>
                      <span className="bg-yellow-50 text-yellow-700 text-xs px-2 py-0.5 rounded font-medium border border-yellow-100">
                        Score: {review.score}/10
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-4 bg-slate-50 p-2 rounded">
                      {review.comments}
                    </p>

                    {/* Review NLP Action */}
                    <div className="border-t border-slate-100 pt-3">
                      {!reviewAnalysis[review.review_id] ? (
                        <button
                          onClick={() => handleAnalyzeReview(review.review_id)}
                          disabled={analyzingReview[review.review_id]}
                          className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center"
                        >
                          {analyzingReview[review.review_id] ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <Search className="w-3 h-3 mr-1" />
                          )}
                          Analyze Sentiment
                        </button>
                      ) : (
                        <div className="text-xs grid grid-cols-2 gap-2 bg-brand-50 p-2 rounded border border-brand-100 animate-in fade-in">
                          <div>
                            <span className="text-slate-500 block">
                              Sentiment
                            </span>
                            <span
                              className={`font-bold ${reviewAnalysis[review.review_id].sentiment_score > 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {reviewAnalysis[review.review_id]
                                .sentiment_score > 0
                                ? "Positive"
                                : "Negative"}{" "}
                              (
                              {reviewAnalysis[
                                review.review_id
                              ].sentiment_score.toFixed(2)}
                              )
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Depth</span>
                            <span className="font-bold text-brand-700">
                              {reviewAnalysis[
                                review.review_id
                              ].depth_score?.toFixed(1) || "N/A"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPaperDetail;

function XCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}
