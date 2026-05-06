import React, { useMemo, useState } from "react";
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
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import { useMyPapersQuery } from "@/features/papers/services/queries";

const MyPapersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const {
    data: papers = [],
    isLoading: loading,
    error,
    refetch,
    isFetching,
  } = useMyPapersQuery();

  const getStatusBadge = (status: string | null) => {
    switch (status?.toUpperCase()) {
      case "ACCEPTED":
        return (
          <span className="flex items-center text-primary bg-primary/10 px-2 py-1 rounded-md text-xs font-bold border border-primary/20">
            <CheckCircle className="w-3 h-3 mr-1" /> Accepted
          </span>
        );
      case "REJECTED":
        return (
          <span className="flex items-center text-destructive bg-destructive/10 px-2 py-1 rounded-md text-xs font-bold border border-destructive/20">
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
            {status || "Unknown"}
          </span>
        );
    }
  };

  const filteredPapers = useMemo(
    () =>
      papers.filter((p) => {
        const normalizedSearch = searchTerm.toLowerCase();
        const conferenceName = p.conference?.conf_name || "";

        return (
          (p.title || "").toLowerCase().includes(normalizedSearch) ||
          conferenceName.toLowerCase().includes(normalizedSearch)
        );
      }),
    [papers, searchTerm],
  );

  return (
    <DefaultLayout meta={{ title: "My Papers" }}>
      <div className="min-h-screen bg-background text-foreground font-sans py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Papers</h1>
              <p className="text-muted-foreground mt-1">
                Manage and track your research submissions.
              </p>
            </div>
            <Button variant="ghost" onClick={() => navigate({ to: "/" })}>
              Dashboard
            </Button>
          </div>

          {/* Search */}
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm mb-6 flex items-center gap-3">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search your papers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="grow outline-none bg-transparent text-foreground"
            />
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                Loading your submissions...
              </p>
            </div>
          ) : error ? (
            <div className="bg-destructive/10 p-6 rounded-xl border border-destructive/20 text-destructive">
              <div className="flex items-center gap-4 mb-4">
                <AlertCircle className="w-6 h-6" />
                <p>
                  {error instanceof Error
                    ? error.message
                    : "Failed to load your papers."}
                </p>
              </div>
              <Button
                onClick={() => refetch()}
                disabled={isFetching}
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                {isFetching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Try Again
              </Button>
            </div>
          ) : filteredPapers.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-xl border border-border shadow-sm">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">
                No papers found
              </h3>
              <p className="text-muted-foreground mt-1">
                You haven't submitted any papers yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPapers.map((paper) => (
                <div
                  key={paper.paper_id}
                  onClick={() =>
                    navigate({
                      to: "/papers/me/$paperId",
                      params: { paperId: String(paper.paper_id) },
                    } as any)
                  }
                  className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="grow">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusBadge(paper.status)}
                        <span className="text-xs text-muted-foreground flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {paper.created_at
                            ? new Date(paper.created_at).toLocaleDateString()
                            : "Unknown date"}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-2">
                        {paper.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {paper.abstract}
                      </p>
                      <div className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded inline-block">
                        Submitted to:{" "}
                        {paper.conference?.conf_name || "Unknown Conference"}
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-accent transition-colors shrink-0">
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DefaultLayout>
  );
};

export default MyPapersPage;
