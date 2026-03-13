import React, { useState, useEffect, useMemo } from "react";
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
import Button from "../components/ui/Button";
import { supabase } from "../lib/supabase";

interface ConferencesProps {
  onNavigateHome: () => void;
  onNavigateDetail: (confId: number) => void;
  onNavigateCreate?: () => void; // Optional to prevent breaking if not passed immediately in all contexts
  userRoleId?: number;
}

interface Conference {
  conf_id: number;
  conf_name: string;
  start_date: string;
  end_date: string;
  location: string;
  status: string;
  is_active: boolean;
  description: string;
  banner_urls: string[] | null;
  keywords: string[] | null;
  open_for_papers: boolean;
  create_time: string;
}

const Conferences: React.FC<ConferencesProps> = ({
  onNavigateHome,
  onNavigateDetail,
  onNavigateCreate,
  userRoleId = 0,
}) => {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<"NEWEST" | "UPCOMING" | "AZ">(
    "NEWEST",
  );
  const [selectedKeyword, setSelectedKeyword] = useState<string>("");

  // NEW STATE: Dùng để search trong list topics
  const [topicSearch, setTopicSearch] = useState("");

  const canCreate = userRoleId === 1 || userRoleId === 2; // Admin or Secretary

  const allKeywords = useMemo(() => {
    const keywords = new Set<string>();
    conferences.forEach((conf) => {
      if (conf.keywords && Array.isArray(conf.keywords)) {
        conf.keywords.forEach((k) => keywords.add(k));
      }
    });
    return Array.from(keywords).sort();
  }, [conferences]);

  // Derived State: Filtered Keywords based on topicSearch
  const displayedKeywords = useMemo(() => {
    if (!topicSearch) return allKeywords;
    return allKeywords.filter((k) =>
      k.toLowerCase().includes(topicSearch.toLowerCase()),
    );
  }, [allKeywords, topicSearch]);

  useEffect(() => {
    fetchConferences();
  }, []);

  const fetchConferences = async () => {
    setLoading(true);
    try {
      // If Admin/Secretary, they might want to see drafts too, but for list view usually we show active
      // For now we keep showing is_active=true. The requirement said "Conferences list page", usually implying public view.
      // If we want admins to see inactive, we could toggle this logic.
      // Based on prompt "Active Conferences", we stick to active for now.
      const { data, error } = await supabase
        .from("conferences")
        .select("*")
        .eq("is_active", true)
        .order("create_time", { ascending: false });

      if (error) throw error;
      setConferences(data || []);
    } catch (err: any) {
      console.error("Error fetching conferences:", err);
      setError("Failed to load conferences. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

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
      case "CLOSED":
        return "bg-red-100 text-red-700 border-red-200";
      case "DRAFT":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-brand-100 text-brand-700 border-brand-200";
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filteredConferences = conferences
    .filter((conf) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        conf.conf_name.toLowerCase().includes(searchLower) ||
        (conf.description &&
          conf.description.toLowerCase().includes(searchLower));
      const matchesStatus =
        statusFilter === "ALL" || conf.status?.toUpperCase() === statusFilter;
      const matchesKeyword =
        !selectedKeyword ||
        (conf.keywords && conf.keywords.includes(selectedKeyword));
      return matchesSearch && matchesStatus && matchesKeyword;
    })
    .sort((a, b) => {
      if (sortOrder === "NEWEST") {
        return (
          new Date(b.create_time).getTime() - new Date(a.create_time).getTime()
        );
      } else if (sortOrder === "UPCOMING") {
        return (
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        );
      } else {
        return a.conf_name.localeCompare(b.conf_name);
      }
    });

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* HEADER SECTION */}
      <div className="relative h-[300px] md:h-[400px] w-full overflow-hidden bg-slate-900">
        <img
          src="https://iated.org/inted/img/inted2025-071.jpg"
          alt="Conference Hall"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight drop-shadow-md">
            Active Conferences
          </h1>
          <p className="text-lg md:text-xl text-slate-200 max-w-2xl drop-shadow-sm mb-6">
            Discover our upcoming academic conferences, connect with peers, and
            share your research.
          </p>

          {/* Create Conference Button (Conditional) */}
          {canCreate && onNavigateCreate && (
            <Button
              onClick={onNavigateCreate}
              className="bg-brand-600 hover:bg-brand-500 text-white shadow-xl border-2 border-brand-400/30"
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
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-10">
          {/* Top Row: Main Filters */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-grow">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name or topic..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 lg:w-auto w-full">
              <div className="w-full sm:w-40">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">
                  Status
                </label>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <select
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none appearance-none bg-white"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">All Status</option>
                    <option value="OPEN">Open</option>
                    <option value="CLOSED">Closed</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                </div>
              </div>

              <div className="w-full sm:w-48">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">
                  Sort By
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(e.target.value as "NEWEST" | "UPCOMING" | "AZ")
                  }
                >
                  <option value="NEWEST">Newly Added</option>
                  <option value="UPCOMING">Upcoming Dates</option>
                  <option value="AZ">Alphabetical (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* IMPROVED TOPICS SECTION - BOX STYLE */}
          {allKeywords.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              {/* Header: Label + Search */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-700 flex items-center">
                  <Tag className="w-4 h-4 mr-2 text-brand-500" />
                  Popular Topics
                </span>

                {/* Search Input Compact */}
                <div className="relative w-48 md:w-64">
                  <input
                    type="text"
                    value={topicSearch}
                    onChange={(e) => setTopicSearch(e.target.value)}
                    placeholder="Filter topics..."
                    className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                  {topicSearch && (
                    <button
                      onClick={() => setTopicSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tags Container - Box Style */}
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 max-h-[140px] overflow-y-auto custom-scrollbar">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedKeyword("")}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                      selectedKeyword === ""
                        ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
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
                          ? "bg-brand-100 text-brand-700 border-brand-200 shadow-sm font-semibold"
                          : "bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600"
                      }`}
                    >
                      {keyword}
                    </button>
                  ))}

                  {displayedKeywords.length === 0 && (
                    <p className="text-xs text-slate-400 w-full text-center py-2 italic">
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
            <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
            <p className="text-slate-500">Loading conferences...</p>
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && error && (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-red-100">
            <p className="text-red-600 font-medium">{error}</p>
            <Button variant="ghost" onClick={fetchConferences} className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !error && filteredConferences.length === 0 && (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-200">
            <p className="text-slate-900 font-semibold text-lg mb-2">
              No conferences found
            </p>
            <p className="text-slate-500">
              Try adjusting your search or filters.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setSelectedKeyword("");
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
                onClick={() => onNavigateDetail(conf.conf_id)}
                className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full cursor-pointer"
              >
                <div className="relative h-48 overflow-hidden bg-slate-100">
                  <img
                    src={getRandomImage(conf.banner_urls)}
                    alt={conf.conf_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-4 right-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border shadow-sm ${getStatusColor(conf.status)}`}
                    >
                      {conf.status}
                    </span>
                  </div>
                </div>
                <div className="p-6 flex-grow flex flex-col">
                  {/* Open for Paper Submission CTA */}
                  {conf.open_for_papers && (
                    <div className="mb-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider border border-emerald-100 shadow-sm">
                        <FileText className="w-3 h-3 mr-1.5" />
                        Open for paper submission
                      </span>
                    </div>
                  )}

                  {conf.keywords && conf.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {conf.keywords.slice(0, 2).map((k, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-semibold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-1 rounded-md"
                        >
                          {k}
                        </span>
                      ))}
                      {conf.keywords.length > 2 && (
                        <span className="text-[10px] text-slate-400 py-1">
                          + {conf.keywords.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-brand-700 transition-colors">
                    {conf.conf_name}
                  </h3>
                  <div className="flex items-center text-slate-500 text-sm mb-2">
                    <Calendar className="w-4 h-4 mr-2 text-brand-500" />
                    <span>{formatDate(conf.start_date)}</span>
                  </div>
                  <div className="flex items-center text-slate-500 text-sm mb-4">
                    <MapPin className="w-4 h-4 mr-2 text-brand-500" />{" "}
                    <span className="truncate">{conf.location}</span>
                  </div>
                  <p className="text-slate-600 text-sm line-clamp-3 mb-6 flex-grow">
                    {conf.description}
                  </p>
                  <div className="pt-4 border-t border-slate-100 mt-auto">
                    <button className="w-full flex items-center justify-center text-sm font-semibold text-slate-700 hover:text-brand-700 transition-colors group/btn">
                      View Details{" "}
                      <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
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

export default Conferences;
