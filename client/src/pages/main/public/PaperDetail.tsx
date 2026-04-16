import React, { useState, useEffect } from "react";
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
  Building,
  Share2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "../../../lib/supabase";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/papers/$paperId";
import { DefaultLayout } from "@/layouts/DefaultLayout";

// --- Data Interfaces ---
interface Author {
  full_name: string;
  email: string;
  organization: string;
  description: string;
}

interface Conference {
  conf_name: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
}

interface PaperData {
  paper_id: number;
  title: string;
  abstract: string;
  status: string;
  created_at: string;
  author: Author;
  conference: Conference;
}

interface ReviewData {
  review_id: number;
  score: number;
  recommendation: string;
  comments: string;
  review_date: string;
  reviewer: {
    full_name: string;
  };
}

const PaperDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { paperId: paperIdParam } = Route.useParams();
  const paperId = Number(paperIdParam);
  const [paper, setPaper] = useState<PaperData | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPaperDetails();
  }, [paperId]);

  const fetchPaperDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch Paper + Author + Conference
      const { data: paperData, error: paperError } = await supabase
        .from("papers")
        .select(
          `
          paper_id, title, abstract, status, created_at,
          author:profiles!primary_author_id (full_name, email, organization, description),
          conference:conferences!submitted_conf (conf_name, description, location, start_date, end_date)
        `,
        )
        .eq("paper_id", paperId)
        .single();

      if (paperError) throw paperError;
      setPaper(paperData as unknown as PaperData);

      // 2. Fetch Display Version (Logic: display=true, max version_id)
      const { data: versionData, error: versionError } = await supabase
        .from("paper_versions")
        .select("file_path")
        .eq("paper_id", paperId)
        .eq("display", true)
        .order("version_id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!versionError && versionData) {
        setPdfUrl(versionData.file_path);
      }

      // 3. Fetch Reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select(
          `
          review_id, score, recommendation, comments, review_date,
          reviewer:profiles!reviewer_id (full_name)
        `,
        )
        .eq("paper_id", paperId)
        .order("review_date", { ascending: false });

      if (reviewsError) throw reviewsError;
      setReviews((reviewsData || []) as unknown as ReviewData[]);
    } catch (err: any) {
      console.error("Error loading paper details:", err);
      setError("Failed to load paper details.");
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-slate-500 mb-6">{error || "Paper not found."}</p>
          <Button onClick={() => navigate({ to: "/papers" })}>
            Return to Archive
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DefaultLayout meta={{ title: paper.title }}>
      <div className="min-h-screen bg-slate-50 font-sans pb-20">
        {/* 1. HEADER SECTION */}
        <div className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <button
              onClick={() => navigate({ to: "/papers" })}
              className="flex items-center text-sm font-medium text-slate-500 hover:text-brand-600 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Archive
            </button>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-grow">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusColor(paper.status)}`}
                  >
                    {paper.status.replace("_", " ")}
                  </span>
                  <span className="text-sm text-slate-400 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1" />{" "}
                    {formatDate(paper.created_at)}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
                  {paper.title}
                </h1>
              </div>

              <div className="flex-shrink-0 flex gap-2">
                <Button variant="outline" size="sm">
                  <Share2 className="w-5 h-5 mr-2" />
                  Share
                </Button>
                {pdfUrl && (
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

              {/* 4. PAPER PREVIEW SECTION */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 flex items-center">
                    <Eye className="w-5 h-5 mr-2 text-brand-500" /> Preview
                  </h3>
                  {pdfUrl && (
                    <span className="text-xs text-slate-500">
                      Viewing latest version
                    </span>
                  )}
                </div>

                <div className="bg-slate-100 h-[500px] md:h-[600px] flex items-center justify-center relative">
                  {pdfUrl ? (
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
                  ) : (
                    <div className="text-center p-8">
                      <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-slate-400" />
                      </div>
                      <h4 className="text-slate-900 font-medium mb-1">
                        Preview Unavailable
                      </h4>
                      <p className="text-slate-500 text-sm">
                        This paper does not have a displayable version yet.
                      </p>
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
                                {formatDate(review.review_date)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {getRecommendationBadge(review.recommendation)}
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
            <div className="lg:col-span-1 space-y-6">
              {/* 2. AUTHOR INFO */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-24">
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
                      {formatDate(paper.conference?.start_date)} -{" "}
                      {formatDate(paper.conference?.end_date)}
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
    </DefaultLayout>
  );
};

export default PaperDetailPage;
