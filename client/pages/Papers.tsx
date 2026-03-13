import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  Calendar,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  BookOpen,
  GraduationCap,
  X,
  UploadCloud,
} from "lucide-react";
import Button from "../components/ui/Button";
import { supabase } from "../lib/supabase";

// --- Hero Images Configuration ---
const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=2070&auto=format&fit=crop",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRehIBxIsGL2OxKblpvhJccmyXbSCScyplLTQ&s",
  "https://i0.wp.com/www.society19.com/wp-content/uploads/2020/02/Research-Paper-Copy.jpg?fit=1024%2C768&ssl=1",
];

interface PapersProps {
  onNavigateHome: () => void;
  onNavigateDetail?: (paperId: number) => void;
  onNavigateSubmit?: () => void;
  userRoleId?: number;
}

// --- Data Interfaces ---
interface Paper {
  paper_id: number;
  title: string;
  abstract: string;
  status: string;
  created_at: string;
  final_decision_date: string | null;
  submitted_conf: number;
  primary_author_id: number;
  author?: {
    full_name: string;
  };
  conference?: {
    conf_name: string;
  };
}

const Papers: React.FC<PapersProps> = ({
  onNavigateHome,
  onNavigateDetail,
  onNavigateSubmit,
  userRoleId = 0,
}) => {
  // --- State ---
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Hero Carousel State
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [conferenceFilter, setConferenceFilter] = useState<string>("ALL");
  const [authorFilter, setAuthorFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<
    "DATE_DESC" | "DATE_ASC" | "TITLE_AZ" | "DECISION"
  >("DATE_DESC");

  // Filter Options Data (Derived from fetched papers to ensure relevance)
  const [conferencesList, setConferencesList] = useState<string[]>([]);
  const [authorsList, setAuthorsList] = useState<string[]>([]);

  // Mobile Filters Toggle
  const [showFilters, setShowFilters] = useState(false);

  // Access Control: Role 1 (Admin), 2 (Secretary), 3 (Chair/Reviewer)
  const canSubmit = [1, 2, 3].includes(userRoleId);

  // --- Effects ---

  useEffect(() => {
    fetchPapers();
  }, []);

  // Hero Carousel Auto-play
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // --- Data Fetching ---

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("papers")
        .select(
          `
          *,
          author:users!primary_author_id (full_name),
          conference:conferences!submitted_conf (conf_name)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setPapers(data);

        // Extract unique options for filters
        const uniqueConfs = Array.from(
          new Set(
            data.map((p: any) => p.conference?.conf_name).filter(Boolean),
          ),
        ) as string[];
        const uniqueAuthors = Array.from(
          new Set(data.map((p: any) => p.author?.full_name).filter(Boolean)),
        ) as string[];

        setConferencesList(uniqueConfs.sort());
        setAuthorsList(uniqueAuthors.sort());
      }
    } catch (err: any) {
      console.error("Error fetching papers:", err);
      setError("Failed to load papers archive.");
    } finally {
      setLoading(false);
    }
  };

  // --- Helpers ---

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const s = status ? status.toUpperCase() : "UNKNOWN";
    switch (s) {
      case "ACCEPTED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            Accepted
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            Rejected
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
            Under Review
          </span>
        );
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            Submitted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  // --- Filtering Logic ---

  const filteredPapers = useMemo(() => {
    let result = [...papers];

    // 1. Text Search (Title & Abstract)
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          (p.title && p.title.toLowerCase().includes(lowerTerm)) ||
          (p.abstract && p.abstract.toLowerCase().includes(lowerTerm)),
      );
    }

    // 2. Status Filter
    if (statusFilter !== "ALL") {
      result = result.filter((p) => p.status?.toUpperCase() === statusFilter);
    }

    // 3. Conference Filter
    if (conferenceFilter !== "ALL") {
      result = result.filter(
        (p) => p.conference?.conf_name === conferenceFilter,
      );
    }

    // 4. Author Filter
    if (authorFilter !== "ALL") {
      result = result.filter((p) => p.author?.full_name === authorFilter);
    }

    // 5. Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "DATE_ASC":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "TITLE_AZ":
          return a.title.localeCompare(b.title);
        case "DECISION":
          const d1 = a.final_decision_date
            ? new Date(a.final_decision_date).getTime()
            : 0;
          const d2 = b.final_decision_date
            ? new Date(b.final_decision_date).getTime()
            : 0;
          return d2 - d1;
        case "DATE_DESC":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

    return result;
  }, [
    papers,
    searchTerm,
    statusFilter,
    conferenceFilter,
    authorFilter,
    sortBy,
  ]);

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* 1. HERO SECTION (Visual Only) */}
      <div className="relative h-[250px] md:h-[300px] w-full overflow-hidden bg-slate-900 group">
        {HERO_IMAGES.map((img, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentHeroSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={img}
              alt="Archive Background"
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
          </div>
        ))}

        <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-4 z-10">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full mb-4">
            <span className="text-brand-300 font-bold tracking-wider text-xs uppercase">
              Knowledge Base
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-3 tracking-tight drop-shadow-lg">
            Papers Archive
          </h1>
          <p className="text-slate-300 max-w-2xl text-lg font-light">
            Discover academic papers and research contributions shared by
            researchers from conferences around the world.
          </p>

          {canSubmit && onNavigateSubmit && (
            <div className="mt-6 animate-in fade-in zoom-in duration-500">
              <Button
                onClick={onNavigateSubmit}
                className="bg-brand-500 hover:bg-brand-600 border-2 border-brand-400 text-white shadow-xl"
                size="lg"
                icon={UploadCloud}
              >
                Submit Paper
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 2. SIDEBAR FILTERS (Left) */}
          <div
            className={`lg:w-64 flex-shrink-0 space-y-6 ${showFilters ? "block" : "hidden lg:block"}`}
          >
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 flex items-center">
                  <Filter className="w-4 h-4 mr-2" /> Filters
                </h3>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("ALL");
                    setConferenceFilter("ALL");
                    setAuthorFilter("ALL");
                  }}
                  className="text-xs text-brand-600 hover:underline"
                >
                  Reset All
                </button>
              </div>

              {/* Status Filter */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Status
                </label>
                <div className="space-y-2">
                  {[
                    "ALL",
                    "SUBMITTED",
                    "UNDER_REVIEW",
                    "REJECTED",
                    "ACCEPTED",
                  ].map((status) => (
                    <label
                      key={status}
                      className="flex items-center cursor-pointer group"
                    >
                      <input
                        type="radio"
                        name="status"
                        className="sr-only"
                        checked={statusFilter === status}
                        onChange={() => setStatusFilter(status)}
                      />
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center mr-2 transition-colors ${statusFilter === status ? "border-brand-600 bg-brand-600" : "border-slate-300 bg-white group-hover:border-brand-400"}`}
                      >
                        {statusFilter === status && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </div>
                      <span
                        className={`text-sm ${statusFilter === status ? "text-brand-700 font-medium" : "text-slate-600"}`}
                      >
                        {status === "ALL"
                          ? "All Papers"
                          : status.replace("_", " ")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Conference Filter */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Conference
                </label>
                <div className="relative">
                  <select
                    value={conferenceFilter}
                    onChange={(e) => setConferenceFilter(e.target.value)}
                    className="w-full pl-2 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none appearance-none truncate"
                  >
                    <option value="ALL">All Conferences</option>
                    {conferencesList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Author Filter */}
              <div className="mb-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Primary Author
                </label>
                <div className="relative">
                  <select
                    value={authorFilter}
                    onChange={(e) => setAuthorFilter(e.target.value)}
                    className="w-full pl-2 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none appearance-none truncate"
                  >
                    <option value="ALL">All Authors</option>
                    {authorsList.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* 3. MAIN CONTENT (Right) */}
          <div className="flex-grow min-w-0">
            {/* Top Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center sticky top-4 z-20">
              {/* Search Bar */}
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search title, abstract..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sort & Mobile Filter Toggle */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 flex-1 sm:flex-none flex items-center justify-center gap-2"
                >
                  <Filter className="w-4 h-4" /> Filters
                </button>

                <div className="relative flex-1 sm:flex-none min-w-[160px]">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-brand-500 outline-none appearance-none cursor-pointer hover:border-slate-300"
                  >
                    <option value="DATE_DESC">Newest First</option>
                    <option value="DATE_ASC">Oldest First</option>
                    <option value="TITLE_AZ">Title (A-Z)</option>
                    <option value="DECISION">Decision Date</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Results List */}
            <div className="space-y-4">
              {loading ? (
                <div className="py-20 text-center">
                  <Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto mb-4" />
                  <p className="text-slate-500">Loading papers archive...</p>
                </div>
              ) : error ? (
                <div className="py-20 text-center bg-white rounded-xl border border-red-100">
                  <p className="text-red-600">{error}</p>
                  <Button
                    variant="ghost"
                    onClick={fetchPapers}
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                </div>
              ) : filteredPapers.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-xl border border-slate-200">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    No papers found
                  </h3>
                  <p className="text-slate-500">
                    Try adjusting your search terms or filters.
                  </p>
                </div>
              ) : (
                filteredPapers.map((paper) => (
                  <div
                    key={paper.paper_id}
                    className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-200 transition-all duration-200 group relative cursor-pointer"
                    onClick={() =>
                      onNavigateDetail && onNavigateDetail(paper.paper_id)
                    }
                  >
                    {/* Header Row */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
                      <div className="flex-grow">
                        <h3 className="text-xl font-bold text-brand-700 leading-tight mb-2 group-hover:underline">
                          {paper.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 mb-3">
                          <span className="flex items-center font-medium text-slate-900">
                            <User className="w-4 h-4 mr-1.5 text-slate-400" />
                            {paper.author?.full_name || "Unknown Author"}
                          </span>
                          <span className="flex items-center">
                            <GraduationCap className="w-4 h-4 mr-1.5 text-slate-400" />
                            <span className="italic">
                              {paper.conference?.conf_name ||
                                "Unknown Conference"}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-3">
                        {getStatusBadge(paper.status)}
                        <div className="text-xs font-medium text-slate-400 flex items-center bg-slate-50 px-2 py-1 rounded border border-slate-100">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(paper.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Abstract */}
                    <p className="text-slate-600 leading-relaxed text-sm line-clamp-3 mb-2">
                      {paper.abstract}
                    </p>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end mt-4 pt-4 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-xs font-bold text-brand-600 hover:text-brand-800 uppercase tracking-wide">
                        View Details &rarr;
                      </button>
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

export default Papers;
