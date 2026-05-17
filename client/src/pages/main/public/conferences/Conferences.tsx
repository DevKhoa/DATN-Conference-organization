import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Calendar,
  MapPin,
  Loader2,
  Filter,
  ArrowRight,
  Tag,
  X,
  PlusCircle,
  FileText,
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
  usePaginatedConferencesQuery,
  useConferencesCountQuery,
  ConferencesFilterParams,
} from "@/features/conferences/services/queries";
import { usePagination } from "@/hooks/usePagination";
import { useNavigate } from "@tanstack/react-router";
import useAuth from "@/features/auth/hooks/useAuth";
import { Role } from "@/features/auth/types";
import { DefaultLayout } from "@/layouts/DefaultLayout";

const ITEMS_PER_PAGE = 9;

const ConferencesPage: React.FC = () => {
  const navigate = useNavigate();
  const { checkRoles } = useAuth();

  // Pagination state and utilities
  const {
    currentPage,
    setCurrentPage,
    handlePageChange,
    getPageNumbers,
    canGoPrevious,
    canGoNext,
  } = usePagination();

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [formatTypeFilter, setFormatTypeFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<
    | "RELEVANCE"
    | "START_DATE_ASC"
    | "START_DATE_DESC"
    | "AZ"
  >("RELEVANCE");
  const [selectedKeyword, setSelectedKeyword] = useState<string>("");

  // Topic search state
  const [topicSearch, setTopicSearch] = useState("");

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const canCreate = checkRoles([Role.ADMIN, Role.SECRETARIAT]);

  const filters: ConferencesFilterParams = useMemo(
    () => ({
      searchTerm: debouncedSearch || undefined,
      statusFilter,
      selectedKeyword: selectedKeyword || undefined,
      formatType: formatTypeFilter,
      canViewDrafts: canCreate,
    }),
    [debouncedSearch, statusFilter, selectedKeyword, formatTypeFilter, canCreate],
  );

  // After state declarations, wire up server-side queries with filters
  const { data: totalCount = 0 } = useConferencesCountQuery(filters);

  const {
    data: paginatedData,
    isLoading: loading,
    error: queryError,
  } = usePaginatedConferencesQuery({
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
    totalCount,
    filters,
    sortOrder,
  });

  const conferences = paginatedData?.data || [];
  const allKeywords = paginatedData?.allKeywords || [];
  const error = queryError
    ? "Failed to load conferences. Please try again later."
    : "";

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, selectedKeyword, formatTypeFilter, sortOrder, setCurrentPage]);

  const getConferenceKeywords = (
    conf: (typeof conferences)[number],
  ): string[] =>
    Array.isArray(conf.keywords)
      ? conf.keywords.filter((k): k is string => typeof k === "string")
      : [];

  const getConferenceBannerUrls = (
    conf: (typeof conferences)[number],
  ): string[] =>
    Array.isArray(conf.banner_urls)
      ? conf.banner_urls.filter((u): u is string => typeof u === "string")
      : [];

  const getConferenceStatus = (conf: (typeof conferences)[number]) =>
    typeof conf.status === "string" ? conf.status : "";

  const displayedKeywords = useMemo(() => {
    if (!topicSearch) return allKeywords;
    return allKeywords.filter((k) =>
      k.toLowerCase().includes(topicSearch.toLowerCase()),
    );
  }, [allKeywords, topicSearch]);

  const getRandomImage = (urls: string[] | null) => {
    if (!urls || urls.length === 0) {
      return "https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=2070&auto=format&fit=crop";
    }
    const randomIndex = Math.floor(Math.random() * urls.length);
    return urls[randomIndex];
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "OPEN":
        return "bg-green-100 text-green-700 border-green-200";
      case "PUBLISHED":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "CLOSED":
        return "bg-red-100 text-red-700 border-red-200";
      case "DRAFT":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-brand-100 text-brand-700 border-brand-200";
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getEventTimingScore = (conf: (typeof conferences)[number]) => {
    const now = Date.now();
    const start = conf.start_date ? new Date(conf.start_date).getTime() : 0;
    const endStr = conf.end_date || conf.start_date;
    const endObj = endStr ? new Date(endStr) : new Date(0);
    endObj.setHours(23, 59, 59, 999);
    const end = endObj.getTime();

    if (now >= start && now <= end) return 1;
    if (now < start) return 2;
    return 3;
  };

  const isPastEvent = (conf: (typeof conferences)[number]) => {
    return getEventTimingScore(conf) === 3;
  };

  // Client-side sort is removed as it's now handled by the server
  const filteredConferences = conferences;

  const displayTotalCount = totalCount;
  const displayTotalPages = Math.max(
    1,
    Math.ceil(displayTotalCount / ITEMS_PER_PAGE),
  );

  useEffect(() => {
    if (currentPage > displayTotalPages) {
      setCurrentPage(1);
    }
  }, [displayTotalPages, currentPage, setCurrentPage]);

  const showingFrom =
    totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const showingTo = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

  return (
    <DefaultLayout meta={{ title: "Active Conferences" }}>
      <div className="min-h-screen bg-background font-sans text-foreground">
        {/* HEADER SECTION */}
        <div className="relative h-75 md:h-100 w-full overflow-hidden bg-slate-900 group">
          <img
            src="https://iated.org/inted/img/inted2025-071.jpg"
            alt="Conference Hall"
            className="w-full h-full object-cover transition-transform duration-[10s] ease-linear group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-slate-950/50" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle, rgba(2, 6, 23, 0.45) 0%, transparent 70%)",
            }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
              Active Conferences
            </h1>
            <p className="text-lg md:text-2xl text-white font-semibold max-w-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] mb-8">
              Discover our upcoming academic conferences, connect with peers,
              and share your research.
            </p>

            {canCreate && (
              <Button
                onClick={() => navigate({ to: "/conferences/create" })}
                className="shadow-xl"
                size="lg"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Create Conference
              </Button>
            )}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-10 relative z-10">
          {/* FILTER BAR CONTAINER */}
          <div className="bg-card rounded-2xl shadow-lg border border-border border-b-primary/20 p-6 mb-10">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="grow">
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5 ml-1">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by name or topic..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 lg:w-auto w-full">
                <div className="w-full sm:w-40">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5 ml-1">
                    Format
                  </label>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <select
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring outline-none appearance-none"
                      value={formatTypeFilter}
                      onChange={(e) => setFormatTypeFilter(e.target.value)}
                    >
                      <option value="ALL">All Formats</option>
                      <option value="in-person">In-person</option>
                      <option value="virtual">Virtual</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div className="w-full sm:w-40">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5 ml-1">
                    Status
                  </label>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <select
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring outline-none appearance-none"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="ALL">All Status</option>
                      <option value="OPEN">Open</option>
                      <option value="CLOSED">Closed</option>
                      {canCreate && <option value="DRAFT">Draft</option>}
                    </select>
                  </div>
                </div>

                <div className="w-full sm:w-48">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5 ml-1">
                    Sort By
                  </label>
                  <select
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                  >
                    <option value="RELEVANCE">Most Relevant</option>
                    <option value="START_DATE_ASC">
                      Start Date (Earliest first)
                    </option>
                    <option value="START_DATE_DESC">
                      Start Date (Latest first)
                    </option>
                    <option value="AZ">Alphabetical (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {allKeywords.length > 0 && (
              <div className="mt-6 pt-5 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-foreground flex items-center">
                    <Tag className="w-4 h-4 mr-2 text-primary" />
                    Popular Topics
                  </span>
                  <div className="relative w-48 md:w-64">
                    <input
                      type="text"
                      value={topicSearch}
                      onChange={(e) => setTopicSearch(e.target.value)}
                      placeholder="Filter topics..."
                      className="w-full pl-8 pr-8 py-1.5 text-xs bg-background border border-input rounded-md focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-all"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                    {topicSearch && (
                      <button
                        onClick={() => setTopicSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-muted rounded-lg border border-border p-3 max-h-35 overflow-y-auto custom-scrollbar">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedKeyword("")}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                        selectedKeyword === ""
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-muted-foreground border-border hover:border-border hover:bg-accent"
                      }`}
                    >
                      All Topics
                    </button>
                    {displayedKeywords.map((keyword) => (
                      <button
                        key={keyword}
                        onClick={() =>
                          setSelectedKeyword(
                            keyword === selectedKeyword ? "" : keyword,
                          )
                        }
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                          selectedKeyword === keyword
                            ? "bg-primary/10 text-primary border-primary/20 shadow-sm font-semibold"
                            : "bg-background text-muted-foreground border-border hover:border-primary/30 hover:text-primary"
                        }`}
                      >
                        {keyword}
                      </button>
                    ))}
                    {displayedKeywords.length === 0 && (
                      <p className="text-xs text-muted-foreground w-full text-center py-2 italic">
                        No topics found matching "{topicSearch}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* LOADING STATE */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading conferences...</p>
            </div>
          )}

          {/* ERROR STATE */}
          {!loading && error && (
            <div className="text-center py-20 bg-card rounded-2xl shadow-sm border border-destructive/20">
              <p className="text-destructive font-medium">{error}</p>
              <Button
                variant="ghost"
                onClick={() => setCurrentPage(1)}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* EMPTY STATE */}
          {!loading && !error && filteredConferences.length === 0 && (
            <div className="text-center py-20 bg-card rounded-2xl shadow-sm border border-border">
              <p className="text-foreground font-semibold text-lg mb-2">
                No conferences found
              </p>
              <p className="text-muted-foreground">
                Try adjusting your search or filters.
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("ALL");
                  setSelectedKeyword("");
                  setFormatTypeFilter("ALL");
                  setTopicSearch("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}

          {/* GRID */}
          {!loading && filteredConferences.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredConferences.map((conf) => (
                <div
                  key={conf.conf_id}
                  onClick={() =>
                    navigate({
                      to: "/conferences/$conferenceId",
                      params: { conferenceId: String(conf.conf_id) },
                    })
                  }
                  className="group bg-card rounded-2xl shadow-sm border border-border overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full cursor-pointer"
                >
                  <div className="relative h-48 overflow-hidden bg-muted">
                    <img
                      src={getRandomImage(getConferenceBannerUrls(conf))}
                      alt={conf.conf_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-4 right-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border shadow-sm ${getStatusColor(
                          getConferenceStatus(conf),
                        )}`}
                      >
                        {getConferenceStatus(conf)}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 grow flex flex-col">
                    {conf.open_for_papers && !isPastEvent(conf) && (
                      <div className="mb-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-[11px] font-bold uppercase tracking-wider border border-border shadow-sm">
                          <FileText className="w-3 h-3 mr-1.5" />
                          Open for paper submission
                        </span>
                      </div>
                    )}

                    {getConferenceKeywords(conf).length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {getConferenceKeywords(conf)
                          .slice(0, 2)
                          .map((k, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-md"
                            >
                              {k}
                            </span>
                          ))}
                        {getConferenceKeywords(conf).length > 2 && (
                          <span className="text-[10px] text-muted-foreground py-1">
                            + {getConferenceKeywords(conf).length - 2}
                          </span>
                        )}
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {conf.conf_name}
                    </h3>
                    <div className="flex items-center text-muted-foreground text-sm mb-2">
                      <Calendar className="w-4 h-4 mr-2 text-primary" />
                      <span>{formatDate(conf.start_date)}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground text-sm mb-4">
                      <MapPin className="w-4 h-4 mr-2 text-primary" />{" "}
                      <span className="truncate">{conf.location}</span>
                    </div>
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-6 grow">
                      {conf.description}
                    </p>
                    <div className="pt-4 border-t border-border mt-auto">
                      <button className="w-full flex items-center justify-center text-sm font-semibold text-foreground hover:text-primary transition-colors group/btn">
                        View Details{" "}
                        <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PAGINATION */}
          {!loading && !error && displayTotalPages > 1 && (
            <div className="mt-12 flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Showing {showingFrom} - {showingTo} of {displayTotalCount}{" "}
                conferences
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        handlePageChange(currentPage - 1, displayTotalPages)
                      }
                      className={
                        !canGoPrevious
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>

                  {getPageNumbers(displayTotalPages).map((page, idx) =>
                    page === "ellipsis" ? (
                      <PaginationItem key={`ellipsis-${idx}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={page as number}>
                        <PaginationLink
                          onClick={() =>
                            handlePageChange(page as number, displayTotalPages)
                          }
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
                        handlePageChange(currentPage + 1, displayTotalPages)
                      }
                      className={
                        !canGoNext(displayTotalPages)
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
    </DefaultLayout>
  );
};

export default ConferencesPage;
