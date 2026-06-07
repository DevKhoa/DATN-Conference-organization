import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  User,
  FileText,
  Download,
  MessageSquare,
  Star,
  CheckCircle,
  AlertCircle,
  MapPin,
  Share2,
  Eye,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/papers/$paperId";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import { useMyCurrentSubscriptionQuery } from "@/features/subscriptions/services/queries";
import useAuth from "@/features/auth/hooks/useAuth";
import { Role } from "@/features/auth/types";
import { toast } from "sonner";
import { usePublicPaperDetailPageQuery } from "@/features/papers/services/queries";
import { useSavePaperAwardMarkingMutation, useDeletePaperMutation } from "@/features/papers/services/mutations";
import type { PaperApplicableAward } from "@/features/papers/types";
import { EditPaperModal } from "./components/EditPaperModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AwardFormState {
  comments: string;
  scoresByCriteriaId: Record<number, string>;
}

const PaperDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { paperId: paperIdParam } = Route.useParams();
  const paperId = Number(paperIdParam);
  const [awardFormById, setAwardFormById] = useState<
    Record<number, AwardFormState>
  >({});
  const { data: currentSubscription } = useMyCurrentSubscriptionQuery();
  const { session, checkRoles } = useAuth();
  const saveAwardMarkingMutation = useSavePaperAwardMarkingMutation();
  const deletePaperMutation = useDeletePaperMutation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const canGrade = checkRoles([Role.CHAIR, Role.ATTENDEE]);
  const canEditPaper = checkRoles([Role.ADMIN, Role.SECRETARIAT]);
  const userId = session?.user?.user_metadata["user_id"] as number | undefined;
  const {
    data: detailData,
    isLoading: loading,
    error,
  } = usePublicPaperDetailPageQuery({
    paperId: Number.isNaN(paperId) ? null : paperId,
    userId,
    canGrade,
  });
  const paper = detailData?.paper ?? null;
  const pdfUrl = detailData?.pdfUrl ?? null;
  const reviews = detailData?.reviews ?? [];
  const applicableAwards = detailData?.applicableAwards ?? [];
  const savingAwardId = saveAwardMarkingMutation.isPending
    ? ((saveAwardMarkingMutation.variables as { awardId?: number } | undefined)
      ?.awardId ?? null)
    : null;
  const versionId = detailData?.versionId ?? null;

  const hasValidSubscription = !!currentSubscription || canGrade;

  useEffect(() => {
    const nextFormById = applicableAwards.reduce<
      Record<number, AwardFormState>
    >((acc, award) => {
      acc[award.award_id] = {
        comments: award.existingMarking?.comments || "",
        scoresByCriteriaId: award.criteria.reduce<Record<number, string>>(
          (scores, criterion) => {
            const existingScore =
              award.existingMarking?.scoresByCriteriaId[criterion.criteria_id];
            scores[criterion.criteria_id] =
              existingScore == null ? "" : String(existingScore);
            return scores;
          },
          {},
        ),
      };
      return acc;
    }, {});
    setAwardFormById(nextFormById);
  }, [applicableAwards]);

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACCEPTED":
        return "bg-green-100 text-green-700 border-green-200";
      case "REJECTED":
        return "bg-red-100 text-red-700 border-red-200";
      case "UNDER_REVIEW":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case "ACCEPT":
        return (
          <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded border border-green-100">
            ACCEPT
          </span>
        );
      case "WEAK_ACCEPT":
        return (
          <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
            WEAK ACCEPT
          </span>
        );
      case "REVISION":
        return (
          <span className="text-yellow-600 font-bold text-xs bg-yellow-50 px-2 py-1 rounded border border-yellow-100">
            REVISION
          </span>
        );
      case "REJECT":
        return (
          <span className="text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded border border-red-100">
            REJECT
          </span>
        );
      default:
        return <span className="text-slate-500 font-bold text-xs">{rec}</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isAwardOpenForMarking = (award: PaperApplicableAward) => {
    const now = Date.now();
    if (award.open_time && now < new Date(award.open_time).getTime())
      return false;
    if (award.close_time && now > new Date(award.close_time).getTime())
      return false;
    return true;
  };

  const handleScoreChange = (
    awardId: number,
    criteriaId: number,
    value: string,
  ) => {
    setAwardFormById((current) => ({
      ...current,
      [awardId]: {
        comments: current[awardId]?.comments || "",
        scoresByCriteriaId: {
          ...(current[awardId]?.scoresByCriteriaId || {}),
          [criteriaId]: value,
        },
      },
    }));
  };

  const handleCommentsChange = (awardId: number, value: string) => {
    setAwardFormById((current) => ({
      ...current,
      [awardId]: {
        comments: value,
        scoresByCriteriaId: current[awardId]?.scoresByCriteriaId || {},
      },
    }));
  };

  const handleSaveAwardMarking = async (award: PaperApplicableAward) => {
    const userId = session?.user?.user_metadata["user_id"] as
      | number
      | undefined;
    if (!userId) {
      toast.error("You need to log in before submitting marks.");
      return;
    }

    if (!isAwardOpenForMarking(award)) {
      toast.error("This award is currently outside the grading window.");
      return;
    }

    if (!award.canMark) {
      toast.error(
        "You can only mark this paper when assigned as session chair or checked in for its session.",
      );
      return;
    }

    const form = awardFormById[award.award_id];
    if (!form) {
      toast.error("No grading form found for this award.");
      return;
    }

    const scoresPayload = award.criteria.map((criterion) => {
      const rawValue = form.scoresByCriteriaId[criterion.criteria_id];
      const score = Number(rawValue);
      return {
        criteria_id: criterion.criteria_id,
        score,
        isValid:
          rawValue !== "" && !Number.isNaN(score) && score >= 0 && score <= 100,
      };
    });

    if (scoresPayload.some((item) => !item.isValid)) {
      toast.error("Each criterion score must be between 0 and 100.");
      return;
    }

    try {
      await saveAwardMarkingMutation.mutateAsync({
        paperId,
        awardId: award.award_id,
        userId,
        comments: form.comments,
        existingMarkId: award.existingMarking?.mark_id,
        scores: scoresPayload.map((item) => ({
          criteriaId: item.criteria_id,
          score: item.score,
        })),
      });
      toast.success(`Saved marking for "${award.name}".`);
    } catch (saveError: any) {
      toast.error(saveError?.message || "Failed to save marking.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500">Loading paper details...</p>
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unavailable</h2>
          <p className="text-slate-500 mb-6">
            {error instanceof Error ? error.message : "Paper not found."}
          </p>
          {canEditPaper && (
            <Button onClick={() => setIsEditModalOpen(true)}>
              Edit & Upload Content
            </Button>
          )}
        </div>

        {canEditPaper && (
          <EditPaperModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            paperId={paperId}
            versionId={null}
            initialTitle=""
            initialAbstract=""
          />
        )}
      </div>
    );
  }

  return (
    <DefaultLayout meta={{ title: paper.title }}>
      <div className="min-h-screen bg-slate-50 font-sans pb-20">
        {/* 1. HEADER SECTION */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <button
              onClick={() => {
                if (window.history.length > 2) {
                  window.history.back();
                } else {
                  navigate({ to: "/papers" });
                }
              }}
              className="flex items-center text-sm font-medium text-slate-500 hover:text-brand-600 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </button>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-grow">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusColor(paper.status || "")}`}
                  >
                    {(paper.status || "UNKNOWN").replace("_", " ")}
                  </span>
                  <span className="text-sm text-slate-400 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1" />{" "}
                    {formatDate(paper.created_at || "")}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
                  {paper.title}
                </h1>
              </div>

              <div className="flex-shrink-0 flex gap-2">
                {canEditPaper && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
                    Edit Paper
                  </Button>
                )}
                {canEditPaper && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  <Share2 className="w-5 h-5 mr-2" />
                  Share
                </Button>
                {pdfUrl && hasValidSubscription && (
                  <a
                    href={pdfUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm">
                      <Download className="w-5 h-5 mr-2" />
                      Download PDF
                    </Button>
                  </a>
                )}
                {pdfUrl && !hasValidSubscription && (
                  <Button
                    size="sm"
                    onClick={() => navigate({ to: "/subscriptions" })}
                  >
                    Subscribe to Download
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN: Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Abstract */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-brand-500" /> Abstract
                </h3>
                <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                  {paper.abstract}
                </p>
              </div>

              {canGrade && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center">
                    <Star className="w-5 h-5 mr-2 text-brand-500" />
                    Award Marking
                  </h3>

                  {applicableAwards.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      This paper is not linked to any active award via its
                      session.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {applicableAwards.map((award) => {
                        const form = awardFormById[award.award_id];
                        const isOpen = isAwardOpenForMarking(award);
                        const canMarkThisAward = award.canMark;
                        return (
                          <div
                            key={award.award_id}
                            className="rounded-lg border border-slate-200 p-4 space-y-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <h4 className="text-base font-semibold text-slate-900">
                                  {award.name}
                                </h4>
                                {award.description && (
                                  <p className="text-sm text-slate-600">
                                    {award.description}
                                  </p>
                                )}
                                <p className="text-xs text-slate-500 mt-1">
                                  Window: {formatDate(award.open_time || "")} -{" "}
                                  {formatDate(award.close_time || "")}
                                </p>
                              </div>
                              <div className="text-right">
                                {award.existingMarking?.total_score != null && (
                                  <p className="text-xs text-slate-500">
                                    Current total:{" "}
                                    <span className="font-semibold text-slate-800">
                                      {award.existingMarking.total_score.toFixed(
                                        2,
                                      )}
                                    </span>
                                  </p>
                                )}
                                {!isOpen && (
                                  <p className="text-xs text-amber-700 bg-amber-100 border border-amber-200 rounded px-2 py-1 mt-1">
                                    Outside grading window
                                  </p>
                                )}
                                {!canMarkThisAward && (
                                  <p className="text-xs text-red-700 bg-red-100 border border-red-200 rounded px-2 py-1 mt-1">
                                    Not eligible to mark this award
                                  </p>
                                )}
                              </div>
                            </div>

                            {award.criteria.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                No criteria configured for this award.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {award.criteria.map((criterion) => (
                                  <div
                                    key={criterion.criteria_id}
                                    className="grid grid-cols-12 items-center gap-2"
                                  >
                                    <div className="col-span-8 text-sm text-slate-700">
                                      {criterion.criteria_name} (
                                      {criterion.weight_pct}%)
                                    </div>
                                    <div className="col-span-4">
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={
                                          form?.scoresByCriteriaId[
                                          criterion.criteria_id
                                          ] || ""
                                        }
                                        onChange={(event) =>
                                          handleScoreChange(
                                            award.award_id,
                                            criterion.criteria_id,
                                            event.target.value,
                                          )
                                        }
                                        disabled={
                                          !isOpen ||
                                          !canMarkThisAward ||
                                          savingAwardId === award.award_id
                                        }
                                        className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
                                        placeholder="0-100"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <textarea
                              value={form?.comments || ""}
                              onChange={(event) =>
                                handleCommentsChange(
                                  award.award_id,
                                  event.target.value,
                                )
                              }
                              disabled={
                                !isOpen ||
                                !canMarkThisAward ||
                                savingAwardId === award.award_id
                              }
                              rows={3}
                              placeholder="Optional comments"
                              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                            />

                            <div className="flex justify-end">
                              <Button
                                onClick={() => handleSaveAwardMarking(award)}
                                disabled={
                                  !isOpen ||
                                  !canMarkThisAward ||
                                  savingAwardId === award.award_id ||
                                  award.criteria.length === 0
                                }
                              >
                                {savingAwardId === award.award_id
                                  ? "Saving..."
                                  : award.existingMarking
                                    ? "Update Marking"
                                    : "Submit Marking"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 4. PAPER PREVIEW SECTION */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 flex items-center">
                    <Eye className="w-5 h-5 mr-2 text-brand-500" /> Preview
                  </h3>
                  {pdfUrl && hasValidSubscription && (
                    <span className="text-xs text-slate-500">
                      Viewing latest version
                    </span>
                  )}
                  {pdfUrl && !hasValidSubscription && (
                    <span className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded border border-amber-200">
                      Limited to first 2 pages
                    </span>
                  )}
                </div>

                <div className="bg-slate-100 h-[500px] md:h-[600px] flex items-center justify-center relative">
                  {pdfUrl && hasValidSubscription ? (
                    <iframe
                      src={`${pdfUrl}#toolbar=0`}
                      className="w-full h-full"
                      title="Paper PDF Preview"
                    >
                      <p className="text-slate-500">
                        Your browser does not support PDFs.
                        <a
                          href={pdfUrl}
                          className="text-brand-600 underline ml-1"
                        >
                          Download the PDF
                        </a>
                        .
                      </p>
                    </iframe>
                  ) : pdfUrl ? (
                    <div className="w-full h-full overflow-y-auto p-4 md:p-6 space-y-6">
                      {[1, 2].map((pageNum) => (
                        <div
                          key={pageNum}
                          className="mx-auto max-w-4xl bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
                        >
                          <div className="px-4 py-2 border-b border-slate-100 text-xs text-slate-500 bg-slate-50">
                            Preview page {pageNum}
                          </div>
                          <iframe
                            src={`${pdfUrl}#page=${pageNum}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                            className="w-full h-[520px] pointer-events-none"
                            title={`Paper PDF Preview page ${pageNum}`}
                          />
                        </div>
                      ))}

                      <div className="mx-auto max-w-4xl rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-center">
                        <p className="text-sm text-amber-800 mb-3">
                          Subscribe to unlock full-paper preview and PDF
                          download.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => navigate({ to: "/subscriptions" })}
                        >
                          View Subscription Plans
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-slate-400" />
                      </div>
                      <h4 className="text-slate-900 font-medium mb-1">
                        Preview Unavailable
                      </h4>
                      <p className="text-slate-500 text-sm mb-4">
                        This paper does not have a displayable version yet.
                      </p>
                      {canEditPaper && (
                        <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
                          Upload Content
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 5. REVIEWS SECTION */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-brand-500" />
                    Peer Reviews
                    <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                      {reviews.length}
                    </span>
                  </h3>
                </div>

                {reviews.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <p className="text-slate-500 italic">
                      No reviews published for this paper yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div
                        key={review.review_id}
                        className="border-b border-slate-100 last:border-0 pb-6 last:pb-0"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                              {review.reviewer?.full_name?.charAt(0) || "R"}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {review.reviewer?.full_name ||
                                  "Anonymous Reviewer"}
                              </p>
                              <p className="text-xs text-slate-400">
                                {formatDate(review.review_date || "")}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {getRecommendationBadge(
                              review.recommendation || "",
                            )}
                            <div className="flex items-center text-xs font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded">
                              <Star className="w-3 h-3 text-yellow-500 mr-1 fill-yellow-500" />
                              Score: {review.score}/10
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                          {review.comments}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Sidebar Info */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* 2. AUTHOR INFO */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">
                  Primary Author
                </h3>

                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-lg shrink-0 border border-brand-100">
                    {paper.author?.full_name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 leading-tight">
                      {paper.author?.full_name || "Unknown"}
                    </h4>
                    <p className="text-xs text-brand-600 font-medium mt-0.5">
                      {paper.author?.organization || "Organization N/A"}
                    </p>
                  </div>
                </div>

                {paper.author?.description && (
                  <div className="text-sm text-slate-600 mb-4 line-clamp-3 italic">
                    "{paper.author.description}"
                  </div>
                )}

                <div className="text-xs text-slate-400 pt-4 border-t border-slate-100 flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1.5 text-green-500" />{" "}
                  Verified Researcher
                </div>
              </div>

              {/* 3. CONFERENCE INFO */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-lg p-6 text-white">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">
                  Submitted To
                </h3>

                <h4 className="text-lg font-bold mb-2">
                  {paper.conference?.conf_name || "Unknown Conference"}
                </h4>

                {paper.conference?.description && (
                  <p className="text-slate-300 text-sm mb-6 line-clamp-3">
                    {paper.conference.description}
                  </p>
                )}

                <div className="space-y-3 text-sm">
                  <div className="flex items-center text-slate-300">
                    <Calendar className="w-4 h-4 mr-3 text-brand-400" />
                    <span>
                      {formatDate(paper.conference?.start_date || "")} -{" "}
                      {formatDate(paper.conference?.end_date || "")}
                    </span>
                  </div>
                  <div className="flex items-center text-slate-300">
                    <MapPin className="w-4 h-4 mr-3 text-brand-400" />
                    <span>{paper.conference?.location || "Virtual"}</span>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
        
        {canEditPaper && paper && (
          <EditPaperModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            paperId={paper.paper_id}
            versionId={versionId}
            initialTitle={paper.title}
            initialAbstract={paper.abstract || ""}
          />
        )}

        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Paper</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the paper "{paper?.title}"? 
                This action will hide this paper from the system and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (paper) {
                    deletePaperMutation.mutate(
                      { paperId: paper.paper_id },
                      {
                        onSuccess: () => {
                          setDeleteConfirmOpen(false);
                          navigate({ to: "/papers" });
                        }
                      }
                    );
                  }
                }}
                disabled={deletePaperMutation.isPending}
              >
                {deletePaperMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DefaultLayout>
  );
};

export default PaperDetailPage;
