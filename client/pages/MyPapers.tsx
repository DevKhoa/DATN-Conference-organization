import React, { useState, useEffect } from "react";
import {
  FileText,
  Calendar,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Search,
} from "lucide-react";
import Button from "../components/ui/Button";
import { supabase } from "../lib/supabase";

interface MyPapersProps {
  userEmail: string;
  onNavigateDetail: (paperId: number) => void;
  onNavigateHome: () => void;
}

interface Paper {
  paper_id: number;
  title: string;
  abstract: string;
  status: string;
  created_at: string;
  submitted_conf: number;
  conference?: {
    conf_name: string;
  };
}

const MyPapers: React.FC<MyPapersProps> = ({
  userEmail,
  onNavigateDetail,
  onNavigateHome,
}) => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (userEmail) fetchMyPapers();
  }, [userEmail]);

  const fetchMyPapers = async () => {
    setLoading(true);
    try {
      // 1. Get User ID
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("user_id")
        .eq("email", userEmail)
        .single();

      if (userError || !userData) throw new Error("User not found.");

      // 2. Fetch Papers
      const { data, error } = await supabase
        .from("papers")
        .select(
          `
          paper_id, title, abstract, status, created_at, submitted_conf,
          conference:conferences!submitted_conf (conf_name)
        `,
        )
        .eq("primary_author_id", userData.user_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPapers(data || []);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load your papers.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACCEPTED":
        return (
          <span className="flex items-center text-green-700 bg-green-50 px-2 py-1 rounded-md text-xs font-bold border border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" /> Accepted
          </span>
        );
      case "REJECTED":
        return (
          <span className="flex items-center text-red-700 bg-red-50 px-2 py-1 rounded-md text-xs font-bold border border-red-200">
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="flex items-center text-yellow-700 bg-yellow-50 px-2 py-1 rounded-md text-xs font-bold border border-yellow-200">
            <Clock className="w-3 h-3 mr-1" /> Under Review
          </span>
        );
      default:
        return (
          <span className="flex items-center text-blue-700 bg-blue-50 px-2 py-1 rounded-md text-xs font-bold border border-blue-200">
            {status}
          </span>
        );
    }
  };

  const filteredPapers = papers.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.conference?.conf_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Papers</h1>
            <p className="text-slate-500 mt-1">
              Manage and track your research submissions.
            </p>
          </div>
          <Button variant="ghost" onClick={onNavigateHome}>
            Dashboard
          </Button>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search your papers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow outline-none text-slate-700"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Loading your submissions...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-6 rounded-xl border border-red-100 flex items-center gap-4 text-red-700">
            <AlertCircle className="w-6 h-6" />
            <p>{error}</p>
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">
              No papers found
            </h3>
            <p className="text-slate-500 mt-1">
              You haven't submitted any papers yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPapers.map((paper) => (
              <div
                key={paper.paper_id}
                onClick={() => onNavigateDetail(paper.paper_id)}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(paper.status)}
                      <span className="text-xs text-slate-400 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(paper.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-700 transition-colors mb-2">
                      {paper.title}
                    </h3>
                    <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                      {paper.abstract}
                    </p>
                    <div className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block">
                      Submitted to:{" "}
                      {paper.conference?.conf_name || "Unknown Conference"}
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-brand-50 transition-colors shrink-0">
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand-600" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPapers;
