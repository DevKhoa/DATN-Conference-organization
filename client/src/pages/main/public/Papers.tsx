import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  Calendar,
  User,
  ChevronDown,
  Loader2,
  BookOpen,
  GraduationCap,
  X,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  usePaginatedPapersQuery,
  usePapersCountQuery,
} from "@/features/papers/services/queries";
import { usePagination } from "@/hooks/usePagination";
import { useNavigate } from "@tanstack/react-router";
import useAuth from "@/features/auth/hooks/useAuth";
import { Role } from "@/features/auth/types";
import { DefaultLayout } from "@/layouts/DefaultLayout";

// --- Hero Images Configuration ---
const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=2070&auto=format&fit=crop",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRehIBxIsGL2OxKblpvhJccmyXbSCScyplLTQ&s",
  "https://i0.wp.com/www.society19.com/wp-content/uploads/2020/02/Research-Paper-Copy.jpg?fit=1024%2C768&ssl=1",
];

const ITEMS_PER_PAGE = 10;

const PapersPage = () => {
  const navigate = useNavigate();
  const { checkRoles } = useAuth();

  // Pagination state and utilities
  const {
    currentPage,
    handlePageChange,
    getPageNumbers,
    canGoPrevious,
    canGoNext,
  } = usePagination();

  const { data: totalCount = 0 } = usePapersCountQuery();

  // Query with pagination
  const {
    data: paginatedData,
    isLoading: loading,
    error: queryError,
  } = usePaginatedPapersQuery({
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
    totalCount: totalCount,
  });

  const papers = paginatedData?.data || [];
  const totalPages = paginatedData?.totalPages || 1;
  const paginatedTotalCount = paginatedData?.totalCount || totalCount;
  const conferencesList = paginatedData?.conferencesList || [];
  const authorsList = paginatedData?.authorsList || [];
  const error = queryError
    ? "Failed to load papers archive. Please try again later."
    : "";

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

  // Mobile Filters Toggle
  const [showFilters, setShowFilters] = useState(false);

  // Access Control
  const canSubmit = checkRoles([Role.ADMIN, Role.SECRETARIAT, Role.AUTHOR]);

  // --- Effects ---

  // Hero Carousel Auto-play
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // --- Helpers ---

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getConferenceName = (paper: (typeof papers)[number]) =>
    paper.conference?.[0]?.conf_name ?? "";

  const getAuthorName = (paper: (typeof papers)[number]) =>
    paper.author?.[0]?.full_name ?? "";

  const getStatusBadge = (status: string) => {
    const s = status ? status.toUpperCase() : "UNKNOWN";
    switch (s) {
      case "ACCEPTED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground border border-border">
            Accepted
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
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
      result = result.filter((p) => getConferenceName(p) === conferenceFilter);
    }

    // 4. Author Filter
    if (authorFilter !== "ALL") {
      result = result.filter((p) => getAuthorName(p) === authorFilter);
    }

    // 5. Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "DATE_ASC":
          return (
            new Date(a.created_at || 0).getTime() -
            new Date(b.created_at || 0).getTime()
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
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
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
    <DefaultLayout meta={{ title: "Papers Archive" }}>
      <div className="min-h-screen bg-background font-sans text-foreground">
        {/* 1. HERO SECTION (Visual Only) */}
        <div className="relative h-62.5 md:h-75 w-full overflow-hidden bg-background group">
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
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent" />
            </div>
          ))}

          <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-4 z-10">
            <h1 className="text-3xl md:text-5xl font-extrabold text-foreground mb-3 tracking-tight drop-shadow-lg">
              Papers Archive
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg font-light">
              Discover academic papers and research contributions shared by
              researchers from conferences around the world.
            </p>

            {canSubmit && (
              <div className="mt-6 animate-in fade-in zoom-in duration-500">
                <Button
                  onClick={() => navigate({ to: "/papers/submit" })}
                  className="shadow-xl"
                  size="lg"
                >
                  <UploadCloud className="w-5 h-5 mr-2" />
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
              className={`lg:w-64 shrink-0 space-y-6 ${showFilters ? "block" : "hidden lg:block"}`}
            >
              <div className="bg-card p-5 rounded-xl border border-border shadow-sm sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-foreground flex items-center">
                    <Filter className="w-4 h-4 mr-2" /> Filters
                  </h3>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("ALL");
                      setConferenceFilter("ALL");
                      setAuthorFilter("ALL");
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Reset All
                  </button>
                </div>

                {/* Status Filter */}
                <div className="mb-5">
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
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
                          className={`w-4 h-4 rounded-full border flex items-center justify-center mr-2 transition-colors ${statusFilter === status ? "border-primary bg-primary" : "border-input bg-background group-hover:border-primary"}`}
                        >
                          {statusFilter === status && (
                            <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />
                          )}
                        </div>
                        <span
                          className={`text-sm ${statusFilter === status ? "text-foreground font-medium" : "text-muted-foreground"}`}
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
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                    Conference
                  </label>
                  <div className="relative">
                    <select
                      value={conferenceFilter}
                      onChange={(e) => setConferenceFilter(e.target.value)}
                      className="w-full pl-2 pr-8 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none appearance-none truncate"
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
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                    Primary Author
                  </label>
                  <div className="relative">
                    <select
                      value={authorFilter}
                      onChange={(e) => setAuthorFilter(e.target.value)}
                      className="w-full pl-2 pr-8 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring outline-none appearance-none truncate"
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
            <div className="grow min-w-0">
              {/* Top Toolbar */}
              <div className="bg-card p-4 rounded-xl border border-border shadow-sm mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center sticky top-4 z-20">
                {/* Search Bar */}
                <div className="relative w-full sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search title, abstract..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring outline-none transition-all bg-background text-foreground"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Sort & Mobile Filter Toggle */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 flex-1 sm:flex-none flex items-center justify-center gap-2"
                  >
                    <Filter className="w-4 h-4" /> Filters
                  </button>

                  <div className="relative flex-1 sm:flex-none min-w-40">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full pl-3 pr-8 py-2 bg-background border border-input rounded-lg text-sm font-medium text-foreground focus:ring-2 focus:ring-ring outline-none appearance-none cursor-pointer hover:border-border"
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
                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Loading papers archive...
                    </p>
                  </div>
                ) : error ? (
                  <div className="py-20 text-center bg-card rounded-xl border border-destructive/20">
                    <p className="text-destructive">{error}</p>
                  </div>
                ) : filteredPapers.length === 0 ? (
                  <div className="py-20 text-center bg-card rounded-xl border border-border">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      No papers found
                    </h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search terms or filters.
                    </p>
                  </div>
                ) : (
                  filteredPapers.map((paper) => (
                    <div
                      key={paper.paper_id}
                      className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 group relative cursor-pointer"
                      onClick={() =>
                        navigate({
                          to: "/papers/$paperId",
                          params: { paperId: String(paper.paper_id) },
                        })
                      }
                    >
                      {/* Header Row */}
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
                        <div className="grow">
                          <h3 className="text-xl font-bold text-primary leading-tight mb-2 group-hover:underline">
                            {paper.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-3">
                            <span className="flex items-center font-medium text-foreground">
                              <User className="w-4 h-4 mr-1.5 text-muted-foreground" />
                              {getAuthorName(paper) || "Unknown Author"}
                            </span>
                            <span className="flex items-center">
                              <GraduationCap className="w-4 h-4 mr-1.5 text-muted-foreground" />
                              <span className="italic">
                                {getConferenceName(paper) ||
                                  "Unknown Conference"}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-3">
                          {getStatusBadge(paper.status || "")}
                          <div className="text-xs font-medium text-muted-foreground flex items-center bg-muted px-2 py-1 rounded border border-border">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(paper.created_at || "")}
                          </div>
                        </div>
                      </div>

                      {/* Abstract */}
                      <p className="text-muted-foreground leading-relaxed text-sm line-clamp-3 mb-2">
                        {paper.abstract}
                      </p>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-end mt-4 pt-4 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-xs font-bold text-primary hover:text-primary/80 uppercase tracking-wide">
                          View Details &rarr;
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* PAGINATION */}
              {!loading && !error && totalPages > 1 && (
                <div className="mt-12 flex flex-col items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
                    {Math.min(
                      currentPage * ITEMS_PER_PAGE,
                      paginatedTotalCount,
                    )}{" "}
                    of {paginatedTotalCount} papers
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            handlePageChange(currentPage - 1, totalPages)
                          }
                          className={
                            !canGoPrevious
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>

                      {getPageNumbers(totalPages).map((page, idx) =>
                        page === "ellipsis" ? (
                          <PaginationItem key={`ellipsis-${idx}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => handlePageChange(page, totalPages)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ),
                      )}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            handlePageChange(currentPage + 1, totalPages)
                          }
                          className={
                            !canGoNext(totalPages)
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default PapersPage;
