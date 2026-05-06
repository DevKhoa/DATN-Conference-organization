import React, { useState } from "react";
import {
  ArrowLeft,
  Eye,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  PenTool,
  BarChart2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Search,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/(app)/papers/me/$paperId";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import {
  useMyPaperDetailQuery,
  type MyPaperReview,
} from "@/features/papers/services/queries";
import {
  useAnalyzeReviewMutation,
  useCheckPlagiarismMutation,
  useGenerateEmbeddingMutation,
  useReviewFormatMutation,
} from "@/features/papers/services/mutations";
import type {
  AnalyzeReviewResult,
  GrammarReviewResult,
  PlagiarismResult,
} from "@/features/papers/services/mutations/types";
import { toast } from "sonner";

const MyPaperDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { paperId: paperIdParam } = Route.useParams();
  const paperId = Number(paperIdParam);

  // AI Tool States
  const [plagiarismResult, setPlagiarismResult] =
    useState<PlagiarismResult | null>(null);
  const [showPlagiarismDetails, setShowPlagiarismDetails] = useState(false);

  const [grammarResult, setGrammarResult] =
    useState<GrammarReviewResult | null>(null);
  const [showGrammarDetails, setShowGrammarDetails] = useState(false);

  // Review NLP States (Map review_id -> result)
  const [analyzingReview, setAnalyzingReview] = useState<
    Record<number, boolean>
  >({});
  const [reviewAnalysis, setReviewAnalysis] = useState<
    Record<number, AnalyzeReviewResult>
  >({});

  const {
    data,
    isLoading: loading,
    isFetching,
    error,
    refetch,
  } = useMyPaperDetailQuery(Number.isNaN(paperId) ? null : paperId);

  const paper = data?.paper;
  const latestVersion = data?.latestVersion;
  const reviews = data?.reviews || [];

  const generateEmbeddingMutation = useGenerateEmbeddingMutation();
  const checkPlagiarismMutation = useCheckPlagiarismMutation();
  const reviewFormatMutation = useReviewFormatMutation();
  const analyzeReviewMutation = useAnalyzeReviewMutation();

  // --- AI HANDLERS ---

  const handleGenerateEmbedding = async () => {
    if (!latestVersion) return;

    try {
      await generateEmbeddingMutation.mutateAsync({
        paperId,
        versionId: latestVersion.version_id,
      });
      toast.success("Embedding generated successfully.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleCheckPlagiarism = async () => {
    if (!latestVersion) return;

    setPlagiarismResult(null);

    try {
      const result = await checkPlagiarismMutation.mutateAsync({
        paperId,
        versionId: latestVersion.version_id,
        threshold: 0.75,
      });

      setPlagiarismResult(result);
      setShowPlagiarismDetails(true);

      toast.success("Plagiarism check completed.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewFormat = async () => {
    if (!latestVersion) return;

    setGrammarResult(null);

    try {
      const result = await reviewFormatMutation.mutateAsync({
        paperId,
        versionId: latestVersion.version_id,
      });

      setGrammarResult(result);
      setShowGrammarDetails(true);

      toast.success("Grammar review completed.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleAnalyzeReview = async (reviewId: number) => {
    setAnalyzingReview((prev) => ({ ...prev, [reviewId]: true }));

    try {
      const data = await analyzeReviewMutation.mutateAsync(reviewId);
      setReviewAnalysis((prev) => ({ ...prev, [reviewId]: data }));
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzingReview((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const renderingError =
    error instanceof Error ? error.message : "Failed to load paper details.";

  // --- RENDER ---

  if (loading) {
    return (
      <DefaultLayout meta={{ title: "Paper Detail" }}>
        <div className="min-h-screen bg-muted/20 px-4 py-12">
          <div className="max-w-2xl mx-auto bg-card rounded-2xl border border-border shadow-sm p-10 text-center text-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-1">
              Loading paper details
            </h2>
            <p className="text-sm text-muted-foreground">
              We are preparing your latest paper data and reviews.
            </p>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  if (error || !paper) {
    return (
      <DefaultLayout meta={{ title: "Paper Detail" }}>
        <div className="min-h-screen bg-muted/20 px-4 py-12">
          <div className="max-w-2xl mx-auto text-center p-8 bg-card rounded-2xl shadow-sm border border-destructive/20 text-foreground">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Could not load paper detail
            </h2>
            <p className="text-destructive text-sm mb-6">
              {renderingError || "Paper not found"}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
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
                onClick={() => navigate({ to: "/papers/me" })}
                className="mt-0"
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout meta={{ title: paper?.title ?? "Paper Detail" }}>
      <div className="min-h-screen bg-muted/20 font-sans pb-20 text-foreground">
        {/* HEADER */}
        <div className="bg-card border-b border-border sticky top-0 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => navigate({ to: "/papers/me" } as any)}
              className="flex items-center text-sm text-muted-foreground hover:text-primary mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to List
            </button>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {paper.title}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Submitted to:{" "}
                  <span className="font-medium text-foreground">
                    {paper.conference?.conf_name}
                  </span>
                </p>
              </div>
              <span className="bg-secondary text-secondary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                {paper.status}
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT: PREVIEW (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden h-175 flex flex-col">
                <div className="p-4 border-b border-border bg-muted flex justify-between items-center">
                  <h3 className="font-bold text-foreground flex items-center">
                    <Eye className="w-4 h-4 mr-2 text-primary" /> Preview
                  </h3>
                  {latestVersion && (
                    <span className="text-xs text-muted-foreground">
                      Version {latestVersion.version_number} {" • "}
                      {latestVersion.upload_date
                        ? new Date(
                            latestVersion.upload_date,
                          ).toLocaleDateString()
                        : "Unknown date"}
                    </span>
                  )}
                </div>
                <div className="grow bg-muted relative">
                  {latestVersion?.file_path ? (
                    <iframe
                      src={`${latestVersion.file_path}#toolbar=0`}
                      className="w-full h-full"
                      title="PDF Preview"
                    >
                      <p>PDF not supported.</p>
                    </iframe>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No PDF available for preview.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: TOOLS & REVIEWS (1/3) */}
            <div className="lg:col-span-1 space-y-6">
              {/* AI ACTIONS CARD */}
              <div className="bg-card rounded-xl border border-border shadow-sm p-5">
                <h3 className="font-bold text-foreground mb-4 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-primary" /> AI
                  Assistant Tools
                </h3>

                <div className="space-y-3">
                  {/* 1. Embedding */}
                  <button
                    onClick={handleGenerateEmbedding}
                    disabled={
                      generateEmbeddingMutation.isPending || !latestVersion
                    }
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/10 transition-all text-sm font-medium text-foreground"
                  >
                    <span className="flex items-center">
                      <BarChart2 className="w-4 h-4 mr-2 text-primary" />{" "}
                      Generate Embedding
                    </span>
                    {generateEmbeddingMutation.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                  </button>

                  {/* 2. Plagiarism */}
                  <div className="border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={handleCheckPlagiarism}
                      disabled={
                        checkPlagiarismMutation.isPending || !latestVersion
                      }
                      className="w-full flex items-center justify-between p-3 bg-card hover:bg-destructive/10 transition-colors text-sm font-medium text-foreground"
                    >
                      <span className="flex items-center">
                        <ShieldCheck className="w-4 h-4 mr-2 text-destructive" />{" "}
                        Check Plagiarism
                      </span>
                      {checkPlagiarismMutation.isPending && (
                        <Loader2 className="w-4 h-4 animate-spin text-destructive" />
                      )}
                    </button>
                    {plagiarismResult && (
                      <div className="bg-destructive/10 p-3 border-t border-destructive/20 text-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-muted-foreground">
                            Similarity:
                          </span>
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
                          className="text-xs text-destructive underline flex items-center"
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
                          <div className="mt-2 space-y-2 max-h-40 overflow-y-auto text-xs bg-card p-2 rounded border border-destructive/20">
                            {plagiarismResult.details.map((d, idx: number) => (
                              <div
                                key={idx}
                                className="p-1 border-b border-border last:border-0"
                              >
                                <p className="text-destructive font-medium truncate">
                                  Chunk {d.input_chunk_index}
                                </p>
                                <p
                                  className="text-muted-foreground italic truncate"
                                  title={d.source_text}
                                >
                                  Source: {d.source_text}
                                </p>
                                <p className="text-muted-foreground">
                                  Similarity:{" "}
                                  {(d.source_similarity * 100).toFixed(1)}%
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3. Grammar */}
                  <div className="border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={handleReviewFormat}
                      disabled={
                        reviewFormatMutation.isPending || !latestVersion
                      }
                      className="w-full flex items-center justify-between p-3 bg-card hover:bg-primary/10 transition-colors text-sm font-medium text-foreground"
                    >
                      <span className="flex items-center">
                        <PenTool className="w-4 h-4 mr-2 text-primary" /> Review
                        Grammar & Format
                      </span>
                      {reviewFormatMutation.isPending && (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      )}
                    </button>
                    {grammarResult && (
                      <div className="bg-primary/10 p-3 border-t border-primary/20 text-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-muted-foreground">
                            Issues Found:
                          </span>
                          <span className="font-bold text-primary">
                            {grammarResult.grammar_review?.length || 0}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setShowGrammarDetails(!showGrammarDetails)
                          }
                          className="text-xs text-primary underline flex items-center"
                        >
                          {showGrammarDetails ? "Hide Report" : "View Report"}
                          {showGrammarDetails ? (
                            <ChevronUp className="w-3 h-3 ml-1" />
                          ) : (
                            <ChevronDown className="w-3 h-3 ml-1" />
                          )}
                        </button>
                        {showGrammarDetails && (
                          <div className="mt-2 max-h-48 overflow-y-auto text-xs bg-card p-2 rounded border border-primary/20 space-y-2">
                            {/* Structure */}
                            <div className="mb-2 pb-2 border-b border-border">
                              <p className="font-bold text-foreground mb-1">
                                Structure:
                              </p>
                              {Object.entries(
                                grammarResult.structure_review || {},
                              ).map(([k, v]) => (
                                <div
                                  key={k}
                                  className="flex items-center gap-2"
                                >
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
                              <p className="font-bold text-foreground mb-1">
                                Grammar:
                              </p>
                              {grammarResult.grammar_review?.map((err, i) => (
                                <div
                                  key={i}
                                  className="mb-2 p-1.5 bg-destructive/10 rounded border border-destructive/20"
                                >
                                  <p className="text-destructive font-medium">
                                    {err.error_type}
                                  </p>
                                  <p className="text-muted-foreground line-through decoration-destructive/60">
                                    {err.raw_text}
                                  </p>
                                  <p className="text-green-600 font-medium">
                                    {"-> "}
                                    {err.correction}
                                  </p>
                                </div>
                              ))}
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
                <h3 className="font-bold text-foreground">
                  Reviews ({reviews.length})
                </h3>
                {reviews.length === 0 ? (
                  <div className="text-center py-6 bg-muted rounded-xl border border-border border-dashed">
                    <p className="text-muted-foreground text-sm">
                      No reviews yet.
                    </p>
                  </div>
                ) : (
                  reviews.map((review: MyPaperReview) => (
                    <div
                      key={review.review_id}
                      className="bg-card p-4 rounded-xl border border-border shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm text-foreground">
                          {review.reviewer?.full_name || "Reviewer"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {review.review_date
                            ? new Date(review.review_date).toLocaleDateString()
                            : "Unknown date"}
                        </span>
                      </div>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded font-medium border border-border">
                          {review.recommendation}
                        </span>
                        <span className="bg-yellow-50 text-yellow-700 text-xs px-2 py-0.5 rounded font-medium border border-yellow-100">
                          Score: {review.score}/10
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 bg-muted p-2 rounded">
                        {review.comments}
                      </p>

                      {/* Review NLP Action */}
                      <div className="border-t border-border pt-3">
                        {!reviewAnalysis[review.review_id] ? (
                          <button
                            onClick={() =>
                              handleAnalyzeReview(review.review_id)
                            }
                            disabled={analyzingReview[review.review_id]}
                            className="text-xs font-bold text-primary hover:text-primary/80 flex items-center"
                          >
                            {analyzingReview[review.review_id] ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <Search className="w-3 h-3 mr-1" />
                            )}
                            Analyze Sentiment
                          </button>
                        ) : (
                          <div className="text-xs grid grid-cols-2 gap-2 bg-primary/10 p-2 rounded border border-primary/20 animate-in fade-in">
                            <div>
                              <span className="text-muted-foreground block">
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
                              <span className="text-muted-foreground block">
                                Depth
                              </span>
                              <span className="font-bold text-primary">
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
    </DefaultLayout>
  );
};

export default MyPaperDetailPage;
