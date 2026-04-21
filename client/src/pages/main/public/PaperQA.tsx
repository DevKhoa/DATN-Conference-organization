import React from "react";
import { useParams, Link } from "@tanstack/react-router";
import { usePublicPaperDetailQuery } from "@/features/papers/services/queries";
import { usePaperQuestionsQuery } from "@/features/qa/services/queries";
import { QuestionItem } from "@/features/qa/components/QuestionItem";
import { QuestionForm } from "@/features/qa/components/QuestionForm";
import { QuestionFilters, FilterStatus, SortOption } from "@/features/qa/components/QuestionFilters";
import useAuth from "@/features/auth/hooks/useAuth";
import { Role } from "@/features/auth/types";
import { ArrowLeft, MessageSquare, AlertCircle, Loader2 } from "lucide-react";
import { DefaultLayout } from "@/layouts/DefaultLayout";

const PaperQAPage = () => {
  const { conferenceId, paperId } = useParams({ strict: false });
  const paperIdNum = Number(paperId);

  const { session, roles, checkRoles } = useAuth();
  const userId = session?.user?.user_metadata["user_id"] as number | undefined;

  const { data: paperData, isLoading: isPaperLoading } = usePublicPaperDetailQuery(paperIdNum);
  const { data: questions = [], isLoading: isQuestionsLoading } = usePaperQuestionsQuery(paperIdNum, userId);

  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>("all");
  const [sortBy, setSortBy] = React.useState<SortOption>("most-upvoted");

  // Filtering and Sorting logic
  const processedQuestions = React.useMemo(() => {
    let result = [...questions];

    // Filter
    if (filterStatus !== "all") {
      result = result.filter(q => q.status === filterStatus);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "most-upvoted") {
        return b.upvotes_count - a.upvotes_count;
      } else if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return 0;
    });

    return result;
  }, [questions, filterStatus, sortBy]);

  if (isPaperLoading) {
    return (
      <DefaultLayout meta={{ title: "Loading Paper..." }}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </DefaultLayout>
    );
  }

  if (!paperData) {
    return (
      <DefaultLayout meta={{ title: "Paper Not Found" }}>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="flex flex-col items-center justify-center text-center py-20 bg-card rounded-2xl border border-destructive/20 text-destructive">
            <AlertCircle className="w-12 h-12 mb-4" />
            <h2 className="text-2xl font-bold">Paper Not Found</h2>
            <p className="text-muted-foreground mt-2">The paper you are looking for might have been removed or is unavailable.</p>
            <Link to="/conferences/$conferenceId" params={{ conferenceId: conferenceId as string }} className="mt-6 text-primary hover:underline flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Conference
            </Link>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  const defaultAttendeeType = (paperData.session_links?.[0]?.session?.format_type as "in-person" | "virtual") || "in-person";
  const isAuthor = userId === paperData.primary_author_id;
  const isModerator = checkRoles([Role.ADMIN, Role.SECRETARIAT]);

  return (
    <DefaultLayout meta={{ title: paperData.title || "Paper Q&A" }}>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        
        {/* Header Navigation */}
        <div className="mb-6">
          <Link 
            to="/conferences/$conferenceId" 
            params={{ conferenceId: conferenceId as string }}
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {paperData.conference?.conf_name || "Conference"}
          </Link>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 leading-tight tracking-tight">
            {paperData.title}
          </h1>
          <p className="text-sm font-medium text-primary">
            By {paperData.author?.full_name || "Unknown Author"}
          </p>
        </div>

        {/* Paper Abstract Context */}
        <div className="bg-muted/30 border border-border rounded-xl p-6 mb-8 group">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Abstract</h3>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {paperData.abstract || "No abstract available for this paper."}
          </p>
        </div>

        <div className="w-full h-px bg-border my-8"></div>

        {/* Q&A Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center text-foreground">
              <MessageSquare className="w-5 h-5 mr-2 text-primary" />
              Community Q&A
              {questions.length > 0 && (
                <span className="ml-3 bg-primary/10 text-primary text-sm px-2.5 py-0.5 rounded-full font-bold">
                  {questions.length}
                </span>
              )}
            </h2>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm">
            <QuestionFilters 
              currentFilter={filterStatus}
              onFilterChange={setFilterStatus}
              currentSort={sortBy}
              onSortChange={setSortBy}
              totalCount={questions.length}
              isModerator={isModerator}
              isAuthor={isAuthor}
            />

            {!isAuthor && userId && (
              <div className="mb-8 p-4 bg-muted/20 rounded-xl border border-dashed border-border">
                <h3 className="text-sm font-bold mb-2">Ask a Question</h3>
                <QuestionForm 
                  paperId={paperIdNum} 
                  defaultAttendeeType={defaultAttendeeType}
                />
              </div>
            )}
            
            {!userId && (
              <div className="mb-8 p-4 bg-amber-50 rounded-xl border border-amber-200 text-center">
                <p className="text-sm text-amber-800 font-medium">Please log in to ask questions or upvote.</p>
              </div>
            )}

            <div className="space-y-4">
              {isQuestionsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : processedQuestions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No questions found.</p>
                  <p className="text-xs mt-1">Try adjusting your filters or ask a new question!</p>
                </div>
              ) : (
                processedQuestions.map(q => (
                  <QuestionItem 
                    key={q.question_id} 
                    question={q} 
                    userId={userId}
                    isAuthor={isAuthor}
                    isModerator={isModerator}
                    isSessionActive={false} 
                  />
                ))
              )}
            </div>
          </div>
        </div>
        
      </div>
    </DefaultLayout>
  );
};

export default PaperQAPage;
